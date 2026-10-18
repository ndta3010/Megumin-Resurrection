# yamnet_listener.py
import os
import sys
import time
import subprocess
import warnings
import numpy as np
import soundcard as sc
import onnxruntime as ort

warnings.filterwarnings("ignore")

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

MODEL_URLS = [
    "https://huggingface.co/zeropointnine/yamnet-onnx/resolve/main/yamnet.onnx",
    "https://huggingface.co/andrelgomes/yamnet-onnx/resolve/main/yamnet.onnx"
]
MODEL_PATH = os.path.join(os.path.dirname(__file__), "yamnet.onnx")

SAMPLE_RATE = 48000
YAMNET_SR = 16000
WINDOW_SIZE = 15600

TARGET_CLASSES = {
    494: "Chime",
    495: "Bell",
    497: "Ding",
    498: "Ping",
    499: "Alarm",
    500: "Jingle",
    501: "Tubular Bell",
    502: "Beep / Signal"
}

# 🎯 NEW: Per-class base thresholds to block low-confidence Ping false triggers
CLASS_THRESHOLDS = {
    494: 0.25,  # Chime
    495: 0.25,  # Bell
    497: 0.25,  # Ding
    498: 0.40,  # Ping (raised to filter 0.20-0.35 transient false positives)
    499: 0.30,  # Alarm
    500: 0.25,  # Jingle
    501: 0.30,  # Tubular Bell
    502: 0.35   # Beep / Signal
}

SUPPRESSED_CLASSES = {
    0: "Speech", 1: "Child speech", 2: "Conversation", 3: "Shout", 4: "Screaming",
    137: "Music", 138: "Musical instrument", 139: "Plucked string instrument",
    140: "Guitar", 142: "Violin, fiddle", 152: "Keyboard instrument", 153: "Piano",
    177: "Singing"
}

MIN_PEAK_THRESHOLD = 0.012  # Catches soft/quiet Windows chimes
COOLDOWN_SECONDS = 1.0

def resample_to_16k(audio_data, orig_sr):
    if orig_sr == 16000:
        return audio_data
    if orig_sr == 48000:
        return audio_data[::3]
    num_samples = int(len(audio_data) * YAMNET_SR / orig_sr)
    return np.interp(
        np.linspace(0, len(audio_data), num_samples, endpoint=False),
        np.arange(len(audio_data)),
        audio_data
    ).astype(np.float32)

def download_raw_waveform_model():
    if os.path.exists(MODEL_PATH):
        try:
            opts = ort.SessionOptions()
            opts.log_severity_level = 3
            sess = ort.InferenceSession(MODEL_PATH, opts)
            shape = sess.get_inputs()[0].shape
            if len(shape) == 4 or shape == [1, 1, 96, 64]:
                del sess
                os.remove(MODEL_PATH)
        except Exception:
            pass

    if not os.path.exists(MODEL_PATH) or os.path.getsize(MODEL_PATH) < 1000000:
        print("⏳ Downloading Raw PCM YAMNet ONNX model...", flush=True)
        for url in MODEL_URLS:
            try:
                subprocess.run(["curl", "-L", "-s", "-o", MODEL_PATH, url], check=True)
                if os.path.exists(MODEL_PATH) and os.path.getsize(MODEL_PATH) > 1000000:
                    print("✅ Raw Waveform YAMNet downloaded successfully!", flush=True)
                    return
            except Exception:
                continue
        print("❌ Download failed.", flush=True)
        sys.exit(1)

def get_active_loopback_mic():
    speaker = sc.default_speaker()
    try:
        mic = sc.get_microphone(id=str(speaker.name), include_loopback=True)
        return mic
    except Exception:
        pass

    all_loopbacks = sc.all_microphones(include_loopback=True)
    for m in all_loopbacks:
        if "headphones" in m.name.lower() or "speaker" in m.name.lower():
            return m

    return all_loopbacks[0] if all_loopbacks else None

def main():
    download_raw_waveform_model()

    opts = ort.SessionOptions()
    opts.log_severity_level = 3
    session = ort.InferenceSession(MODEL_PATH, opts)

    input_meta = session.get_inputs()[0]
    input_name = input_meta.name
    expected_shape = input_meta.shape

    mic = get_active_loopback_mic()
    if not mic:
        print("❌ No valid loopback device found!", flush=True)
        sys.exit(1)

    audio_buffer_16k = np.zeros(WINDOW_SIZE, dtype=np.float32)
    last_trigger_time = 0

    print("🎧 [YAMNet AI Listener Active]: Listening for system pings...", flush=True)

    channels = getattr(mic, 'channels', 2)

    with mic.recorder(samplerate=SAMPLE_RATE, channels=channels) as recorder:
        while True:
            try:
                data = recorder.record(numframes=4800)
                if data.size == 0:
                    continue

                if data.ndim > 1:
                    mono_chunk = np.mean(data, axis=1).astype(np.float32)
                else:
                    mono_chunk = data.astype(np.float32)

                chunk_16k = resample_to_16k(mono_chunk, SAMPLE_RATE)

                chunk_len = len(chunk_16k)
                audio_buffer_16k = np.roll(audio_buffer_16k, -chunk_len)
                audio_buffer_16k[-chunk_len:] = chunk_16k

                chunk_peak = float(np.max(np.abs(chunk_16k)))

                if chunk_peak >= MIN_PEAK_THRESHOLD:
                    if len(expected_shape) == 2:
                        input_data = np.expand_dims(audio_buffer_16k, axis=0).astype(np.float32)
                    else:
                        input_data = audio_buffer_16k.astype(np.float32)

                    outputs = session.run(None, {input_name: input_data})
                    scores = outputs[0]

                    max_scores = np.max(scores, axis=0) if scores.ndim > 1 else scores
                    avg_scores = np.mean(scores, axis=0) if scores.ndim > 1 else scores

                    top_idx = int(np.argmax(avg_scores))
                    top_score = float(avg_scores[top_idx])

                    # Find highest target chime score in this frame
                    max_chime_score = max([float(max_scores[idx]) for idx in TARGET_CLASSES.keys()])

                    # Require strong confidence (>=0.40) before locking into music/speech mode
                    is_music_or_speech = (top_idx in SUPPRESSED_CLASSES) and (top_score >= 0.40)

                    # Live diagnostic output
                    print(f"🎙️ [Audio Spike] Peak: {chunk_peak:.4f} | Max Chime: {max_chime_score:.2f}", flush=True)

                    now = time.time()
                    if (now - last_trigger_time) > COOLDOWN_SECONDS:
                        for class_idx, class_name in TARGET_CLASSES.items():
                            prob = float(max_scores[class_idx])
                            
                            # 🎯 Dynamic per-class threshold check
                            base_threshold = CLASS_THRESHOLDS.get(class_idx, 0.30)
                            effective_threshold = base_threshold + 0.20 if is_music_or_speech else base_threshold

                            if prob >= effective_threshold:
                                print(f"CHIME_DETECTED:{class_name}:{prob:.2f}", flush=True)
                                last_trigger_time = now
                                break
            except Exception:
                time.sleep(0.01)

if __name__ == "__main__":
    main()