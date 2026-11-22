# Megumin Project - User Manual

🌐 **Language / 語言 / 言語 / Ngôn ngữ:** [English](USER_MANUAL.md) | [日本語](USER_MANUAL.ja.md) | [简体中文](USER_MANUAL.zh-CN.md) | [繁體中文](USER_MANUAL.zh-TW.md) | [Tiếng Việt](USER_MANUAL.vi.md)

---

Welcome to the **Megumin Desktop AI Companion** user manual. This guide covers detailed instructions on hardware/software prerequisites, service configuration, startup procedures, and feature usage.

## 1. Prerequisites & System Requirements

Make sure you have the following dependencies installed on your machine for the best experience.

> **Hardware Note:** Running an LLM, VLM, and Neural TTS simultaneously requires significant VRAM. If you do not have a high-VRAM GPU, it is recommended to split the workload across **2 devices** over your local network (e.g., running LM Studio and the TTS server on a desktop while running the client on a laptop).

### Core Runtime & Environment

* **OS:** Windows 10/11 (64-bit)
* **Node.js:** v18.x or above
* **Python:** 3.10 or above (required for YAMNet ambient sound processing and the TTS backend)

### Node.js Dependencies

Installed automatically via `npm install` in the client directory:

* **`electron`:** Handles the UI, transparent window controls, and IPC events.
* **`child_process`, `fs`, `path`:** Built-in Node.js modules used to spawn Python sidecar scripts (no extra installation needed).

### Python Sidecar Dependencies (Client Audio)

Install these in your client Python environment for ambient sound detection:

```cmd
pip install tensorflow tensorflow-hub sounddevice numpy
```

* **`tensorflow` & `tensorflow-hub`:** YAMNet ambient sound classification.
* **`sounddevice`:** Microphone/audio stream input.
* **`numpy`:** Audio array processing.

### Local AI Endpoints & Backend Models

* **Vision Model (VLM):** `Qwen2-VL-2B-Instruct`
* **Reasoning Model (LLM):** `NousResearch/Hermes-3-Llama-3.1-8B`
* **Japanese Neural TTS:** `Estellya/Megumin-Style-Bert-VITS2` (Style-Bert-VITS2 engine)

---

## 2. Setup & Startup Guide

### Step 1: Download Repositories

1. **Client:** Clone or download the client repository from GitHub:  
   `https://github.com/ndta3010/Megumin-Resurrections`
2. **TTS Server:** Clone or download the voice model and backend bundle from Hugging Face:  
   `https://huggingface.co/Estellya/Megumin-Style-Bert-VITS2`

### Step 2: Configure LLM & VLM (LM Studio)

1. Download and open **LM Studio**.
2. Search for and download **`Qwen2-VL-2B-Instruct`** and **`NousResearch/Hermes-3-Llama-3.1-8B`**.
3. Go to the **Local Server** tab in LM Studio, load your models, and start the server (default: `http://localhost:1234/v1`). *(If running on a second PC over LAN, enable **Serve on Local Network** in LM Studio).*
4. Open **`renderer.js`** inside the **Megumin Client** folder and update the LLM/VLM endpoint URLs to match the exact server address shown in LM Studio.

### Step 3: Start the TTS Server

1. Open the downloaded **`Megumin-Style-Bert-VITS2`** folder.
2. Double-click **`Start_Server.bat`**.
   * *First run:* Automatically creates a Python `venv` and installs all dependencies from `requirements.txt` (this may take a few minutes).
   * *Ready state:* Wait until the terminal displays:  
     `Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)`
3. Keep this terminal window open in the background. *(Note: If hosting the TTS server on a second PC, also update the TTS URL in `renderer.js` to match that machine's local IP address).*

### Step 4: Launch the Megumin Client

1. Open a terminal inside the **Megumin Client** repository folder.
2. Install the Node.js dependencies (first time only):
   ```cmd
   npm install
   ```
3. Start the application:
   ```cmd
   npm start
   ```
   Megumin will appear on your desktop shortly after startup.

---

## 3. Highlighted Features

> **Language Note:** When chatting with Megumin via text, your input language **must be English** (she processes your English prompt and responds with voiced Japanese audio).

* **Time-Aware Greetings:** Upon startup, she greets you dynamically based on the time of day (*Morning*, *Afternoon*, or *Evening*).
* **"Special Shy" Interaction:** Triple left-click on her avatar to poke her 3 times and trigger her flustered reaction.
* **Megumin Alarm Clock:** Set alarms featuring an exclusive Megumin wake-up ringtone.
* **Periodic Screen Reactions:** Every 15 minutes, she uses the Vision model (VLM) to observe and comment on what you are doing on your screen.
* **Companion Mode:** Click and drag her freely anywhere across your desktop workspace.
* **Chibi Mode:** Shrink her into a compact chibi form to save screen space without completely closing the app.