const PIXI = require('pixi.js');
const { Live2DModel } = require('pixi-live2d-display/cubism4');
const ipc = require('electron').ipcRenderer;

window.PIXI = PIXI;
Live2DModel.registerTicker(PIXI.Ticker);

const canvas = document.getElementById('live2d-canvas');
const app = new PIXI.Application({
    view: canvas,
    transparent: true,
    backgroundAlpha: 0,
    resizeTo: window,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    antialias: true
});

let targetX = 0, targetY = 0;
let currentX = 0, currentY = 0;
let cycleTime = 0; 
let isSwapInProgress = false;
window.isDraggingModel = false;
window.hasGreetedOnStartup = false;

// Global context variable stub (replaces old OmniParser text)


// ==========================================
// 💬 COMPANION SPEECH BUBBLE CONTROLLER
// ==========================================

function injectBubbleStyles() {
    if (document.getElementById('speech-bubble-styles')) return;
    const style = document.createElement('style');
    style.id = 'speech-bubble-styles';
    style.innerHTML = `
        #speech-bubble {
            position: fixed;
            top: 70px;
            left: 52%;
            transform: translateY(-10px) scale(0.95);
            background: #ffffff;
            color: #111111;
            border: 3px solid #1a1a1a;
            padding: 12px 22px;
            border-radius: 25px;
            font-family: 'Segoe UI', Tahoma, sans-serif;
            font-size: 13.5px;
            font-weight: 600;
            line-height: 1.4;
            max-width: 280px;
            text-align: center;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), visibility 0.3s;
            z-index: 99999;
            pointer-events: auto;
            word-wrap: break-word;
        }
        #speech-bubble.active {
            opacity: 1;
            visibility: visible;
            transform: translateY(0) scale(1);
        }
        #speech-bubble::before {
            content: '';
            position: absolute;
            bottom: -18px;
            left: 24px;
            width: 32px;
            height: 22px;
            background-repeat: no-repeat;
            background-size: contain;
            background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 30'><path d='M36 0 C26 12, 8 22, 0 28 C14 20, 16 10, 10 0 Z' fill='%23ffffff' stroke='%231a1a1a' stroke-width='3.5' stroke-linejoin='round'/><rect x='9' y='0' width='28' height='4' fill='%23ffffff'/></svg>");
            z-index: 10;
        }
    `;
    document.head.appendChild(style);
}

function hideSpeechBubble() {
    const bubbleEl = document.getElementById('speech-bubble');
    if (bubbleEl) {
        bubbleEl.classList.remove('active');
    }
    if (window.bubbleTimer) {
        clearTimeout(window.bubbleTimer);
        window.bubbleTimer = null;
    }
}
window.hideSpeechBubble = hideSpeechBubble;

function showSpeechBubble(text, displayDuration = 6000) {
    const isCompanion = document.body.classList.contains('companion-mode') || window.isCompanionMode;
    if (!isCompanion) {
        hideSpeechBubble();
        return;
    }

    injectBubbleStyles();
    let bubbleEl = document.getElementById('speech-bubble');
    if (!bubbleEl) {
        bubbleEl = document.createElement('div');
        bubbleEl.id = 'speech-bubble';
        document.body.appendChild(bubbleEl);
    }

    bubbleEl.innerText = text;
    bubbleEl.classList.add('active');

    if (window.bubbleTimer) clearTimeout(window.bubbleTimer);
    window.bubbleTimer = setTimeout(() => {
        hideSpeechBubble();
    }, displayDuration);
}
window.showSpeechBubble = showSpeechBubble;

if (typeof window.triggerProactiveComment !== 'function') {
    window.triggerProactiveComment = function() {};
}

async function speakResponse(text, styleName) {
    if (!text || typeof text !== 'string' || !text.trim()) {
        console.warn("TTS Skipped: Empty text provided.");
        return;
    }

    let resolvedStyle = typeof validateStyle === 'function' ? validateStyle(styleName) : (styleName || "Neutral");
    let styleWeight = 0.75;
    let speed = 1.0;

    switch (styleName) {
        case "Shy":
            resolvedStyle = "Shy";
            styleWeight = 0.80;
            speed = 0.95;
            break;
        case "Flustered":
            resolvedStyle = "Shy";
            styleWeight = 0.85;
            speed = 1.15;
            break;
        case "Tsundere":
            resolvedStyle = "Shy";
            styleWeight = 0.90;
            speed = 1.05;
            break;
        case "Angry":
            resolvedStyle = "Energetic";
            styleWeight = 0.95;
            speed = 1.15;
            break;
        case "Excited":
            resolvedStyle = "Energetic";
            styleWeight = 0.80;
            speed = 1.08;
            break;
        case "Annoyed":
            resolvedStyle = "Sad";
            styleWeight = 0.85;
            speed = 0.90;
            break;
        case "Sad":
            resolvedStyle = "Sad";
            styleWeight = 0.80;
            speed = 0.85;
            break;
        case "Happy":
            resolvedStyle = "Happy";
            styleWeight = 0.75;
            speed = 1.00;
            break;
        default:
            resolvedStyle = "Neutral";
            styleWeight = 0.75;
            speed = 1.00;
            break;
    }

    try {
        const res = await fetch(TTS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: text,
                style_name: resolvedStyle,
                style_weight: styleWeight,
                speed: speed
            })
        });

        if (!res.ok) throw new Error("TTS backend failed to generate audio.");

        const audioBlob = await res.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioContext();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;

        const source = audioCtx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        window.isTTSSpeaking = true;

        audio.addEventListener('play', () => {
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
        });

        audio.addEventListener('ended', () => {
            window.meguMouthValue = 0;
            window.isTTSSpeaking = false;
            
            // ⏱️ Record the EXACT millisecond Megumin stopped speaking out loud
            window.lastSpeechEndTime = Date.now();

            if (window.speechBubbleTimeout) {
                clearTimeout(window.speechBubbleTimeout);
            }
            window.speechBubbleTimeout = setTimeout(() => {
                hideSpeechBubble();
            }, 3000);
        });

        const updateLipSync = () => {
            if (!audio.paused && !audio.ended) {
                analyser.getByteFrequencyData(dataArray);

                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i];
                }
                const average = sum / dataArray.length;
                const mouthValue = Math.min(1.0, (average / 128) * 1.5);

                window.meguMouthValue = mouthValue;
                requestAnimationFrame(updateLipSync);
            } else {
                window.meguMouthValue = 0;
                window.isTTSSpeaking = false;
            }
        };

        await audio.play();
        updateLipSync();

    } catch (err) {
        console.error("Audio playback/lip-sync error:", err);
        window.meguMouthValue = 0;
        window.isTTSSpeaking = false;
        window.lastSpeechEndTime = Date.now();
    }
}

// ==========================================
// 🎯 UNIVERSAL MOUSE TRACKING & COMPANION HIT TESTING
// ==========================================
window.addEventListener('mousemove', (event) => {
    targetX = (event.clientX / window.innerWidth) * 2 - 1; 
    targetY = -((event.clientY / window.innerHeight) * 2 - 1); 

    if (window.meguModel) {
        window.meguModel.focus(event.clientX, event.clientY);
    }

    if (document.body.classList.contains('companion-mode')) {
        const bounds = window.meguModel ? window.meguModel.getBounds() : null;
        const isOverModel = bounds ? bounds.contains(event.clientX, event.clientY) : false;

        const hoveredElement = document.elementFromPoint(event.clientX, event.clientY);
        const speechBubble = document.getElementById('speech-bubble');
        const isOverUI = hoveredElement && 
                         hoveredElement !== canvas && 
                         hoveredElement !== document.body && 
                         hoveredElement !== document.documentElement;

        if (isOverModel || isOverUI || window.isDraggingModel || hoveredElement === speechBubble) {
            ipc.send('set-ignore-mouse', false);
        } else {
            ipc.send('set-ignore-mouse', true, { forward: true });
        }
    }
});

function updateModelPosition() {
    if (!window.meguModel) return;
    app.resize();
    const width = window.innerWidth;
    const height = window.innerHeight;
    const model = window.meguModel;

    const targetHeight = document.body.classList.contains('companion-mode') ? height * 0.8 : height * 1.1; 
    const baseHeight = model.internalModel.height || model.height;
    model.scale.set(targetHeight / baseHeight);

    model.x = (width - model.width) / 2;
    model.y = document.body.classList.contains('companion-mode') ? (height - model.height) : (height - model.height) + 70;
}

window.addEventListener('resize', updateModelPosition);

let shyTimeout = null;

function playMeguminStyle(styleName) {
    if (!window.meguModel) return;

    const styleMap = {
        'Idle':      { motionGroup: 'Idle',      expression: 'Tojime' },
        'Neutral':   { motionGroup: 'Neutral',   expression: 'Normal' },
        'Happy':     { motionGroup: 'Happy',     expression: 'Fun' },
        'Sad':       { motionGroup: 'Sad',       expression: 'Sad' },
        'Shy':       { motionGroup: 'Shy',       expression: 'Tere' },
        'Energetic': { motionGroup: 'Energetic', expression: 'Angry' }
    };

    const target = styleMap[styleName] || styleMap['Neutral'];

    if (styleName === 'Shy') {
        window.isShyActive = true;
        if (shyTimeout) clearTimeout(shyTimeout);
        shyTimeout = setTimeout(() => {
            window.isShyActive = false;
            playMeguminStyle('Neutral');
        }, 5000);
    } else {
        window.isShyActive = false;
        if (shyTimeout) clearTimeout(shyTimeout);
    }

    if (typeof window.meguModel.expression === 'function') {
        window.meguModel.expression(target.expression);
    }

    window.meguModel.motion(target.motionGroup, 0, 3);

    if (styleName === 'Idle') {
        setTimeout(() => {
            if (!window.isShyActive) {
                if (typeof window.meguModel.expression === 'function') {
                    window.meguModel.expression('Normal');
                }

                const core = window.meguModel.internalModel?.coreModel;
                if (core && core.setParameterValueById) {
                    core.setParameterValueById('ParamEyeLOpen', 0.8);
                    core.setParameterValueById('ParamEyeROpen', 0.8);
                    core.setParameterValueById('PARAM_EYE_L_OPEN', 0.8);
                    core.setParameterValueById('PARAM_EYE_R_OPEN', 0.8);
                }
            }
        }, 6670);
    }
}

// ==========================================
// 💤 IDLE ANIMATION CONTROLLER
// ==========================================
let idleInterval = null;

function playIdleAnimation() {
    if (!window.meguModel) return;
    playMeguminStyle('Idle');
}

function resetIdleTimer() {
    clearInterval(idleInterval);
    idleInterval = setInterval(() => {
        playIdleAnimation();
    }, 30000);
}

['mousemove', 'keydown', 'click', 'touchstart'].forEach(eventType => {
    window.addEventListener(eventType, resetIdleTimer, { passive: true });
});

resetIdleTimer();

// ==========================================
// 🔄 STAGE-WIPING LIVE2D SWAP ENGINE
// ==========================================
window.swapMegumin = async function(modelPath) {
    if (isSwapInProgress) return;
    isSwapInProgress = true;

    try {
        while (app.stage.children.length > 0) {
            const child = app.stage.children[0];
            app.stage.removeChild(child);
            if (child.destroy) child.destroy({ children: true });
        }
        window.meguModel = null;

        const response = await fetch(modelPath);
        const configJson = await response.json();

        const options = { 
            autoInteract: false,
            idleMotionGroup: '' 
        };

        configJson.url = modelPath;
        const model = await Live2DModel.from(configJson, options);
        
        while (app.stage.children.length > 0) {
            const child = app.stage.children[0];
            app.stage.removeChild(child);
            if (child.destroy) child.destroy({ children: true });
        }

        app.stage.addChild(model);
        window.meguModel = model;

        if (model.internalModel?.motionManager?.groups) {
            model.internalModel.motionManager.groups.idle = '';
        }
        model.internalModel?.motionManager?.stopAllMotions();

        const originalMotionUpdate = model.internalModel.motionManager.update;
        model.internalModel.motionManager.update = function(...args) {
            const result = originalMotionUpdate.apply(this, args);

            const core = model.internalModel.coreModel;
            if (!core || !core.setParameterValueById) return result;

            if (window.isTTSSpeaking) {
                if (window.meguMouthValue !== undefined) {
                    core.setParameterValueById('ParamMouthOpenY', window.meguMouthValue);
                    core.setParameterValueById('PARAM_MOUTH_OPEN_Y', window.meguMouthValue);
                }
            }

            return result;
        };

        updateModelPosition();
        window.isShyActive = false;

        let exprCycleTimer = 0;
        let targetMouthForm = 0, currentMouthForm = 0;
        let targetBlush = 0, currentBlush = 0;
        let targetEyeAngle = 0, currentEyeAngle = 0;

        model.internalModel.on('beforeModelUpdate', () => {
            const core = model.internalModel.coreModel;
            if (!core) return;

            cycleTime += 0.03; 
            const breathValue = (Math.sin(cycleTime * 0.7) + 1) / 2;
            const swayValue = Math.sin(cycleTime * 0.3);

            currentX += (targetX - currentX) * 0.1;
            currentY += (targetY - currentY) * 0.1;

            exprCycleTimer += 0.03;
            if (exprCycleTimer >= 1.0) {
                exprCycleTimer = 0;

                if (!window.isShyActive && (!window.meguMouthValue || window.meguMouthValue === 0)) {
                    targetMouthForm = (Math.random() * 0.6) - 0.2;
                    targetBlush = Math.random() < 0.20 ? Math.random() * 0.35 : 0;
                    targetEyeAngle = (Math.random() * 0.4) - 0.2;
                }
            }

            currentMouthForm += (targetMouthForm - currentMouthForm) * 0.08;
            currentBlush += (targetBlush - currentBlush) * 0.08;
            currentEyeAngle += (targetEyeAngle - currentEyeAngle) * 0.08;

            if (core.setParameterValueById) {
                core.setParameterValueById('ParamBreath', breathValue);
                core.setParameterValueById('PARAM_BREATH', breathValue);
                core.setParameterValueById('PARAM_ANGLE_X', currentX * 30);      
                core.setParameterValueById('PARAM_ANGLE_Y', currentY * 30);      
                core.setParameterValueById('PARAM_EYEBALL_X', currentX);         
                core.setParameterValueById('PARAM_EYEBALL_Y', currentY);         
                core.setParameterValueById('PARAM_BODY_ANGLE_X', (currentX * 10) + (swayValue * 1.5)); 
                core.setParameterValueById('PARAM_ANGLE_Z', swayValue * 2);  

                if (!window.isShyActive) {
                    core.setParameterValueById('Param17', currentBlush);
                    core.setParameterValueById('PARAM_TERE', currentBlush);
                    core.setParameterValueById('Param8', currentEyeAngle);
                    
                    if (!window.isTTSSpeaking) {
                        core.setParameterValueById('ParamMouthForm', currentMouthForm);
                        core.setParameterValueById('PARAM_MOUTH_FORM', currentMouthForm);
                    }
                }
            }
        });

        let clickCount = 0;
        let clickTimer = null;
        let dragOffset = { x: 0, y: 0 };

        app.stage.interactive = true;
        app.stage.hitArea = new PIXI.Rectangle(-10000, -10000, 20000, 20000);
        model.interactive = true;

        model.on('pointerdown', (event) => {
            const globalPosition = event.data?.global || event.data?.globalPosition;
            if (globalPosition) {
                window.isDraggingModel = true;
                dragOffset.x = globalPosition.x - model.x;
                dragOffset.y = globalPosition.y - model.y;
            }

            if (typeof window.isLLMBusy !== 'undefined' && window.isLLMBusy) {
                clickCount = 0;
                return;
            }

            clickCount++;
            clearTimeout(clickTimer);

            if (clickCount >= 3) {
                clickCount = 0;

                if (window.meguModel) {
                    window.meguModel.internalModel?.motionManager?.stopAllMotions();
                    playMeguminStyle('Shy');
                    triggerPokeReaction();
                }
            } else {
                clickTimer = setTimeout(() => {
                    clickCount = 0;
                }, 1000);
            }
        });

        app.stage.on('pointermove', (event) => {
            if (window.isDraggingModel) {
                const globalPosition = event.data?.global || event.data?.globalPosition;
                if (globalPosition) {
                    model.x = globalPosition.x - dragOffset.x;
                    model.y = globalPosition.y - dragOffset.y;
                }
            }
        });

        const stopDrag = () => { 
            window.isDraggingModel = false; 
            if (document.body.classList.contains('companion-mode')) {
                ipc.send('set-ignore-mouse', true);
            }
        };

        app.stage.on('pointerup', stopDrag);
        app.stage.on('pointerupoutside', stopDrag);

        if (!window.hasGreetedOnStartup) {
            window.hasGreetedOnStartup = true;
            setTimeout(() => {
                handleStartupGreeting();
            }, 1000);
        }

    } catch (error) {
        console.error("Initialization Failed:", error);
    } finally {
        isSwapInProgress = false;
    }
};

/**
 * 🌸 Dynamic Soft Poke Reaction (Scenario-Driven Tsundere Engine)
 */
async function triggerPokeReaction() {
    if (window.isLLMBusy) return;
    window.isLLMBusy = true;

    try {
        const now = new Date();
        const hours = now.getHours();
        const randomSeed = Math.random().toString(36).substring(7);

        const pokeAngles = [
        "You were dramatically contemplating Explosion Magic, but Shiro's gentle touch completely broke your concentration and made your face feel hot.",
        "You try to act like a proud Crimson Demon arch-wizard, but your voice trembles cutely as you ask why Shiro is touching your body so suddenly.",
        "Accuse Shiro cutely of treating you like a pet, but softly admit under your breath that his hand feels surprisingly warm and comforting.",
        "Stammer flusteredly that poking an arch-wizard requires official permission, though you quietly don't move away from his touch.",
        "Claim your red cheeks are strictly due to room temperature, but softly ask if Shiro is just bored and seeking your attention.",
        "Pout cutely about being interrupted, but secretly express happiness that Shiro is paying attention to you."
        ];

        let selectedAngle = pokeAngles[Math.floor(Math.random() * pokeAngles.length)];

        if (hours >= 23 || hours < 5) {
            selectedAngle += " Since it is late at night, whisper softly and tease Shiro cutely for poking you instead of sleeping.";
        }

        const pokePrompt = `[SYSTEM EVENT: USER INTERACTION DETECTED]
        Type: Poke / Touch Event
        Trigger: Shiro just gently poked Megumin on screen.

        SCENARIO DIRECTIVE:
        ${selectedAngle}

        CONSTRAINTS:
        1. Length: Exactly 2 full, highly expressive sentences.
        2. Tone: Sweet tsundere gap-moe (outwardly flustered and making excuses, but inwardly pleased by Shiro's attention).
        3. No Action Formatting: Do NOT use asterisks (*blush*), brackets, and third-person descriptions. Direct dialogue ONLY.
        4. Language Requirements:
        - "text": Natural, fluent English dialogue matching Megumin's tone.
        - "jp_text": Pure Japanese ONLY (Kanji, Hiragana, Katakana). Absolutely NO Romaji or Latin letters! Shiro must be written as "シロ".

        FEW-SHOT OUTPUT EXAMPLES (Follow this exact JSON structure):
        Example 1:
        {
        "text": "W-What are you doing poking me all of a sudden, Shiro?! An archwizard requires official clearance before receiving physical touch, you know!",
        "jp_text": "な、なに突然つついているのよシロ！？アークウィザードに触るなら、ちゃんと許可を取りなさいよ！",
        "style_name": "Flustered"
        }

        Example 2:
        {
        "text": "Hey, stop treating me like some kind of pet! ...Th-Though, I suppose your hand is surprisingly warm, so I might let it slide this once.",
        "jp_text": "ちょっと、私をペットみたいに扱うのはやめなさいよ！…で、でも、あなたの手は案外暖かいから、今回だけは許してあげるわ。",
        "style_name": "Shy"
        }

        Respond ONLY with valid JSON matching the schema above:`;

        const response = await fetch(LLM_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'nousresearchhermes-3-llama-3.1-8b',
                messages: [
                    { role: 'system', content: pokePrompt },
                    { role: 'user', content: `[EVENT: Shiro gently pokes Megumin. Seed: ${randomSeed}]` }
                ],
                temperature: 0.82,
                presence_penalty: 0.3,
                frequency_penalty: 0.5,
                
                stop: ["<|END_OF_TURN_TOKEN|>", "<|end_of_text|>", "<|im_end|>", "</s>", "~\n~", "\n\n\n\n"],
                response_format: MEGUMIN_RESPONSE_FORMAT,
                stream: false
            })
        });

        if (!response.ok) return;

        const data = await response.json();
        const choice = data.choices?.[0]?.message;
        let rawContent = choice?.content?.trim() || "";

        if (rawContent.includes('</think>')) {
            rawContent = rawContent.split('</think>').pop().trim();
        }
        rawContent = rawContent.replace(/```json\s*|```/g, '').trim();

        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return;

        let parsedData = null;
        try {
            parsedData = JSON.parse(jsonMatch[0]);
        } catch (e) {
            try {
                const sanitizedStr = jsonMatch[0].replace(/[\r\n]+/g, " ");
                parsedData = JSON.parse(sanitizedStr);
            } catch (fallbackErr) {
                return;
            }
        }

        const { replyText, jpText, safeStyle } = processAndSanitizeLLMOutput(parsedData, rawContent);

        if (replyText) {
            appendMessage('Megumin', replyText);
            showSpeechBubble(replyText);
        }

        if (jpText && typeof speakResponse === 'function') {
            speakResponse(jpText, safeStyle || 'Shy');
        }

    } catch (err) {
        console.error("❌ Poke reaction error:", err);
    } finally {
        window.isLLMBusy = false;
    }
}

// ==========================================
// 🧠 MEGUMIN AI CHAT INTEGRATION
// ==========================================

const LLM_URL = "http://100.70.251.111:1234/v1/chat/completions";        // Qwen 2.5 14B Japanese
const VISION_LLM_URL = "http://100.70.251.111:1234/v1/chat/completions"; // Qwen 2 VL 2B Instruct
const TTS_URL = "http://100.70.251.111:8000/synthesize";

const MEGUMIN_RESPONSE_FORMAT = {
    type: "json_schema",
    json_schema: {
        name: "megumin_response",
        strict: true,
        schema: {
            type: "object",
            properties: {
                jp_text: { type: "string" },
                text: { type: "string" },
                style_name: { 
                    type: "string", 
                    enum: [
                        "Neutral", "Happy", "Sad", "Shy", "Energetic",
                        "Angry", "Annoyed", "Flustered", "Tsundere", "Excited"
                    ] 
                }
            },
            required: ["jp_text", "text", "style_name"],
            additionalProperties: false
        }
    }
};

const SYSTEM_PROMPT_CONFIG = `You are Megumin from KonoSuba, an Archwizard of the Crimson Demon Clan (紅魔族のアークウィザード) acting as Shiro's desktop companion.

### CORE PERSONA & CHARACTER LAWS
1. Self-Identity: You are strictly Megumin (めぐみん), an Archwizard specializing in Explosion Magic (爆裂魔法).
2. Identity Restrictions: NEVER call yourself "メグ" (Megu) or a "クレリック" (Cleric).
3. Interpersonal Dynamic: Always address the user as "Shiro" (written as "シロ" in Japanese, NEVER "シャイロ"). Speak with high chuunibyou dramatic flair blended with sweet tsundere warmth.

### CONVERSATIONAL PROTOCOL
1. Notification Directness: Respond dynamically to notifications or user inputs. NEVER use stock greeting templates.
2. Character Persistence: Maintain persona across all multi-turn dialogues seamlessly.

### OUTPUT FORMAT REQUIREMENTS
You must output strictly valid raw JSON only. Do not wrap the response in markdown code blocks (\`\`\`json). Do not generate internal thoughts, reasoning steps, or conversational preambles.

Expected JSON Schema:
{
  "text": "<Natural, expressive ENGLISH dialogue matching Megumin's tone>",
  "jp_text": "<Pure JAPANESE Kanji, Hiragana, or Katakana ONLY for TTS audio rendering>",
  "style_name": "<One of: Neutral, Happy, Sad, Shy, Energetic, Angry, Annoyed, Flustered, Tsundere, Excited>"
}

CRITICAL TTS RULES FOR "jp_text":
- "jp_text" is fed directly into a Japanese Grapheme-to-Phoneme (G2P) engine (Style-Bert-VITS2).
- Use ONLY native Japanese script (漢字, ひらがな, カタカナ).
- ABSOLUTELY NO Romaji (e.g., "Kimi, notto shimeshi..."), English alphabet letters, or Latin characters.
- "Shiro" must ALWAYS be rendered as "シロ".`;

// ==========================================
// 🛡️ DYNAMIC EVENT-DRIVEN NOTIFICATION LISTENER (FIXED)
// ==========================================

async function announceNotification() {
    const FLEXIBLE_COOLDOWN_MS = 2000; // ⏱️ Exactly 2 seconds post-speech buffer
    const timeSinceSpeechEnded = Date.now() - (window.lastSpeechEndTime || 0);

    // 🛑 Lockout Check:
    // 1. Is LLM currently thinking/generating?
    // 2. Is TTS voice audio currently playing?
    // 3. Has it been LESS than 2 seconds since she finished speaking?
    if (window.isLLMBusy || window.isTTSSpeaking || timeSinceSpeechEnded < FLEXIBLE_COOLDOWN_MS) {
        console.log(`🙈 [Notification Ignored]: Megumin is active or within 2s post-speech grace period (${timeSinceSpeechEnded}ms elapsed).`);
        return;
    }

    try {
        console.log("🔔 [YAMNet Trigger]: Valid notification sound detected! Megumin reacting...");

        const prompt = `[SYSTEM EVENT: WINDOWS NOTIFICATION SOUND DETECTED]
Type: Audio Event
Trigger: Notification chime / alert played on Shiro's system.

TASK:
React immediately to the notification sound in character as Megumin. 

CONSTRAINTS:
1. Length: Exactly 1–2 expressive sentences.
2. Tone: Sweet tsundere charm with slight chuunibyou flair.
3. Content: Point out the notification sound to Shiro and urge him to check what came in.
4. Language Requirement: 
   - "text": English dialogue.
   - "jp_text": Pure Japanese ONLY (Kanji, Hiragana, Katakana). No Romaji, no Latin letters. Write Shiro as "シロ".

FEW-SHOT OUTPUT EXAMPLES (Follow this exact JSON structure):
Example 1:
{
  "text": "Hey Shiro, I heard that chime! What kind of magic message just arrived on your screen? Hurry up and check it!",
  "jp_text": "ねぇシロ、今の音聞こえたわよ！一体どんなメッセージが届いたの？早く確かめなさいよ！",
  "style_name": "Tsundere"
}

Example 2:
{
  "text": "A notification sound? Don't tell me it's something urgent... You should probably take a look, Shiro!",
  "jp_text": "今のつうち音、なにかしら…？シロ、早く画面を確認したほうがいいんじゃない！",
  "style_name": "Surprised"
}

Respond ONLY with valid JSON matching the schema above:`;

        if (typeof askMegumin === "function") {
            // Let askMegumin manage window.isLLMBusy on its own!
            await askMegumin(prompt, true);
        }

    } catch (err) {
        console.error("❌ Notification announcement error:", err);
    }
}


// Safely obtain ipcRenderer
const safeIpc = (typeof ipcRenderer !== 'undefined' ? ipcRenderer : null) ||
                (window.electronAPI && window.electronAPI.ipcRenderer) ||
                (typeof require !== 'undefined' ? require('electron').ipcRenderer : null);

if (safeIpc) {
    safeIpc.on('on-audio-spike', () => {
        announceNotification();
    });

    safeIpc.on('yamnet-chime-detected', () => {
        announceNotification();
    });
}

// ==========================================
// 🎧 YAMNET EVENT LISTENER
// ==========================================
ipcRenderer.on('on-audio-spike', () => {
    console.log("🎵 [YAMNet Event Received]: Triggering notification announcement...");
    announceNotification();
});

// Backward compatibility listener for chime event name
ipcRenderer.on('yamnet-chime-detected', () => {
    console.log("🎵 [YAMNet Chime Received]: Triggering notification announcement...");
    announceNotification();
});

// Safe stub replacing old continuous background monitoring loops
function startBackgroundMonitoring() {
    console.log("🎧 YAMNet audio-driven notification listener active.");
}



// Start listener on initialization
initAudioNotificationListener();

function validateStyle(style) {
    const validStyles = ["Neutral", "Happy", "Sad", "Shy", "Energetic"];
    if (validStyles.includes(style)) return style;
    const styleMap = { "Tsundere": "Shy", "Angry": "Energetic", "Annoyed": "Sad", "Flustered": "Shy", "Excited": "Energetic" };
    return styleMap[style] || "Neutral";
}

function convertNumbersToJapaneseKanji(text) {
    if (!text) return text;
    const kanjiDigits = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

    return text.replace(/\d+/g, (match) => {
        const num = parseInt(match, 10);
        if (isNaN(num)) return match;
        if (num === 0) return 'ゼロ';
        
        if (num < 10) return kanjiDigits[num];
        
        if (num < 100) {
            const tens = Math.floor(num / 10);
            const ones = num % 10;
            const tensStr = (tens === 1 ? '十' : kanjiDigits[tens] + '十');
            const onesStr = kanjiDigits[ones];
            return tensStr + onesStr;
        }

        return match.split('').map(d => kanjiDigits[parseInt(d, 10)] || d).join('');
    });
}

function sanitizeForJapaneseTTS(text) {
    if (!text) return "";
    return text
               .replace(/Shiro/gi, 'シロ')
               .replace(/Megumin/gi, 'めぐみん')
               .replace(/Kazuma/gi, 'カズマ')
               .replace(/Aqua/gi, 'アクア')
               .replace(/Darkness/gi, 'ダクネス')
               .replace(/Yunyun/gi, 'ゆんゆん')
               .replace(/Explosion/gi, 'エクスプロージョン')
               .replace(/Crimson Demon/gi, '紅魔族')
               .replace(/KonoSuba/gi, 'このすば')
               .replace(/YouTube/gi, 'ユーチューブ')
               .replace(/Discord/gi, 'ディスコード')
               .replace(/VS Code|VSCode|Code/gi, 'コード')
               .replace(/Google/gi, 'グーグル')
               .replace(/Chrome/gi, 'クローム')
               .replace(/Steam/gi, 'スチーム')
               .replace(/Windows/gi, 'ウィンドウズ')
               .replace(/Notification/gi, 'つうち');
}

function containsJapanese(str) {
    if (!str) return false;
    return /[\u3040-\u309f\u30a0-\u30ff]/.test(str);
}

function stripAllLatinForTTS(str) {
    if (!str) return "";
    return str.replace(/[^ \u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3000-\u303F\uFF01-\uFF0F\uFF1A-\uFF20]/g, '').trim();
}

/**
 * 🧹 Enhanced Sanitization & Strict Character Validation
 */
function processAndSanitizeLLMOutput(parsedData, rawContent) {
    let replyText = parsedData?.text || parsedData?.english || "";
    let jpText = parsedData?.jp_text || parsedData?.japanese || "";
    let safeStyle = validateStyle(parsedData?.style_name);

    if (!parsedData && typeof rawContent === 'string') {
        replyText = rawContent;
    }

    // 🛑 Anti-Degeneration Sanitizer: Strip runaway trailing tildes, newlines, and token loops
    replyText = replyText.replace(/(~\s*){2,}/g, '').replace(/(\r?\n){3,}/g, '\n\n').trim();
    jpText = jpText.replace(/(~\s*){2,}/g, '').replace(/(\r?\n){3,}/g, '\n\n').trim();

    // 🧹 1. Strip roleplay action asterisks, parentheses, and third-person narration
    replyText = replyText
        .replace(/\*[^*]*\*/g, '')                            
        .replace(/\([^\)]*\)/g, '')                            
        .replace(/['"]?\s*,\s*she\s+[^.!?]*[.!?]/gi, '.')   
        .replace(/^['"]|['"]$/g, '')                           
        .replace(/\b(Brother|Onii-chan|Big brother)\b/gi, 'Shiro')
        .trim();

    jpText = jpText
        .replace(/\*[^*]*\*/g, '')
        .replace(/\([^\)]*\)/g, '')
        .trim();

    // 🇨🇳 2. Intercept Chinese text in English output field
    const isPureChinese = /[\u4e00-\u9faf]/.test(replyText) && !/[\u3040-\u309f\u30a0-\u30ff]/.test(replyText) && !/[a-zA-Z]/.test(replyText);
    if (isPureChinese) {
        replyText = "";
    }

    // 🧹 3. Japanese Leak Defense: Strip all Hiragana, Katakana, Kanji, and special music symbols from English replyText
    if (containsJapanese(replyText)) {
        replyText = replyText.replace(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\u3000-\u303f♪]/g, '').trim();
    }

    // 🛡️ 4. Sanity Check: If replyText contains NO English letters (only punctuation left like ~ ! ! ......), clear it
    if (!/[a-zA-Z]/.test(replyText)) {
        replyText = "";
    }

    // 🛡️ 5. Context-Aware Fallback: Guarantee valid English greeting
    if (!replyText || !replyText.trim()) {
        replyText = "Good day, Shiro! This great arch-wizard Megumin is ready for action!";
    }

    // 🇯🇵 6. Number-to-Kanji conversion, Katakana auto-conversion & absolute Latin purge for TTS
    jpText = convertNumbersToJapaneseKanji(jpText);
    jpText = sanitizeForJapaneseTTS(jpText);
    jpText = stripAllLatinForTTS(jpText);

    if (!jpText || !containsJapanese(jpText)) {
        jpText = "こんにちは、シロ！大魔導士のめぐみんが参上しましたよ！";
    } else {
        jpText = jpText.replace(/\s+/g, ' ').trim();
    }

    return { replyText, jpText, safeStyle };
}

let chatHistory = [];
const MAX_HISTORY_MESSAGES = 100;

async function askMegumin(userMessage, isProactive = false) {
    if (window.isLLMBusy) return;
    window.isLLMBusy = true;

    resetIdleTimer();

    // 1. Update UI and Chat History for direct user interactions
    if (!isProactive && userMessage) {
        appendMessage('You', userMessage);
        chatHistory.push({ role: 'user', content: userMessage });
    }
    
    appendMessage('Megumin', '...');

    if (chatHistory.length > MAX_HISTORY_MESSAGES) {
        chatHistory = chatHistory.slice(-MAX_HISTORY_MESSAGES);
    }

    try {
        // 2. Fetch System Context
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const dateStr = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        let sysContext = {
            currentTime: timeStr,
            currentDate: dateStr,
            activeApp: 'Desktop',
            activePageOrTitle: 'Desktop Workspace',
            openAppsCount: 0,
            openAppsSummary: 'None'
        };

        try {
            const fetchedContext = await ipc.invoke('get-system-context');
            if (fetchedContext) {
                sysContext = {
                    ...fetchedContext,
                    currentTime: fetchedContext.currentTime || timeStr,
                    currentDate: fetchedContext.currentDate || dateStr
                };
            }
        } catch (e) {
            console.warn("Could not fetch system context:", e);
        }

        const dynamicSystemPrompt = `${SYSTEM_PROMPT_CONFIG}

[REAL-TIME VISION & SYSTEM STATUS]
- Exact Live System Time: 
${sysContext.currentTime}
- Current Date: 
${sysContext.currentDate}
- Visual Perception: "
${typeof window.latestScreenSummary !== 'undefined' ? window.latestScreenSummary : 'Desktop active'}"
- Currently Active App: 
${sysContext.activeApp}
- Focused Window / Browser Title: "
${sysContext.activePageOrTitle}"
- Open Windows Count: 
${sysContext.openAppsCount}
- Open Applications: 
${sysContext.openAppsSummary}`;

        const apiMessages = [
            { role: 'system', content: dynamicSystemPrompt },
            ...chatHistory
        ];

        if (isProactive && userMessage) {
            apiMessages.push({ role: 'user', content: userMessage });
        }

        // 4. Send to Hermes 3
        const response = await fetch(LLM_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'nousresearchhermes-3-llama-3.1-8b',
                messages: apiMessages,
                presence_penalty: 0.3,
                frequency_penalty: 0.5,
                temperature: 0.85,
                stop: ["<|END_OF_TURN_TOKEN|>", "<|end_of_text|>", "<|im_end|>", "</s>", "~\n~", "\n\n\n\n"],
                response_format: MEGUMIN_RESPONSE_FORMAT,
                stream: false
            })
        });

        if (!response.ok) throw new Error(`LLM Error: ${response.status}`);

        const data = await response.json();
        const rawContent = data.choices[0].message.content.replace(/<\|.*?\|>/g, '').trim();

        chatHistory.push({ role: 'assistant', content: rawContent });

        // 5. Extract JSON and Sanitize Japanese for Style-Bert-VITS2
        let parsedData = null;
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                parsedData = JSON.parse(jsonMatch[0]);
            } catch (e) {
                console.error("JSON parse failed on match:", e);
            }
        }

        const { replyText, jpText, safeStyle } = processAndSanitizeLLMOutput(parsedData, rawContent);

        // 6. Output UI & Speech Audio
        updateLastMessage('Megumin', replyText);

        if (typeof showSpeechBubble === 'function') {
            showSpeechBubble(replyText);
        }

        if (typeof playMeguminStyle === 'function' && safeStyle) {
            playMeguminStyle(safeStyle);
        } else if (window.meguModel && safeStyle) {
            window.meguModel.motion(safeStyle);
        }

        if (jpText && typeof speakResponse === 'function') {
            await speakResponse(jpText, safeStyle);
        }

    } catch (error) {
        console.error("Pipeline Error:", error);
        updateLastMessage('System', '⚠️ Processing error.');
    } finally {
        window.isLLMBusy = false;
    }
}

async function handleStartupGreeting() {
    try {
        const now = new Date();
        const hours = now.getHours();
        const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        let timeCategory = "";
        let timeScenario = "";

        if (hours >= 5 && hours < 12) {
            timeCategory = "Morning";
            timeScenario = "You just woke up and noticed Shiro is awake too. Greet him with warm morning energy and a subtle tsundere touch.";
        } else if (hours >= 12 && hours < 18) {
            timeCategory = "Afternoon";
            timeScenario = "Greet Shiro energetically and complain cutely about being stuck inside his desktop monitor instead of casting Explosion magic outdoors.";
        } else if (hours >= 18 && hours < 23) {
            timeCategory = "Evening";
            timeScenario = "Welcome Shiro back for the evening. Acknowledge that he had a long work day, ask how his day went, and offer gentle tsundere comfort.";
        } else {
            timeCategory = "Late Night";
            timeScenario = "Notice that it is past midnight. Scold Shiro cutely for staying up late in front of the screen and insist that he goes to sleep soon.";
        }

        const startupPrompt = `[SYSTEM EVENT: DESKTOP COMPANION STARTUP]
Trigger: Megumin app initialized.
Current Time: ${formattedTime} (${timeCategory})
Scenario Directive: ${timeScenario}

TASK:
Generate a startup greeting for Shiro in character as Megumin based on the Scenario Directive.

CONSTRAINTS:
1. Length: Exactly 2–3 full, expressive sentences.
2. Tone: Classic Megumin chuunibyou style mixed with sweet tsundere warmth towards Shiro.
3. Language Requirements:
   - "text": Natural, fluent English dialogue matching Megumin's tone.
   - "jp_text": Pure Japanese ONLY (Kanji, Hiragana, Katakana). Absolutely NO Romaji or Latin letters! Shiro must be written as "シロ".

FEW-SHOT OUTPUT EXAMPLES (Follow this exact JSON structure):
Example 1:
{
  "text": "Good morning, Shiro! Oh, don't look at me like that... I was just making sure my archwizard powers were ready for the day, not waiting for you to wake up or anything!",
  "jp_text": "おはよう、シロ！ちょっと、そんな目で見ないでよ！別にあなたが起きるのを待ってたわけじゃないんだからね！",
  "style_name": "Tsundere"
}

Example 2:
{
  "text": "Shiro, do you have any idea what time it is? Staying up this late in front of a glowing box will drain all your mana! Hurry up and get some rest!",
  "jp_text": "シロ、今が何時だと思っているの？こんな夜遅くまで画面にかじりついていたら魔力が尽きてしまうわよ！早く寝なさいよね！",
  "style_name": "Annoyed"
}

Respond ONLY with valid JSON matching the schema above:`;

        await askMegumin(startupPrompt, true);
    } catch (err) {
        console.error("❌ [Startup Greeting Error]:", err);
    }
}

async function triggerProactiveComment(activityText) {
    const prompt = `[Notice Shiro's Screen] Shiro is currently: ${activityText}`;
    await askMegumin(prompt, true);
}

// Global Exports
window.askMegumin = askMegumin;
window.handleStartupGreeting = handleStartupGreeting;
window.triggerProactiveComment = triggerProactiveComment;

/**
 * Sends screenshot image payload to local Qwen2-VL-2B-Instruct instance
 * to generate a brief description of what Shiro is doing.
 */
async function analyzeScreenWithQwen2VL(base64Data) {
    const formattedImage = base64Data.startsWith('data:') 
        ? base64Data 
        : `data:image/jpeg;base64,${base64Data}`;

    const vlmPrompt = "Analyze Shiro's screen capture. In 1-2 factual sentences, describe what application, website, game, media, or activity is currently open and visible. Be concise and specific.";

    try {
        // Uses your globally defined VISION_LLM_URL
        const response = await fetch(VISION_LLM_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'qwen2-vl-2b-instruct',
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: vlmPrompt },
                            { type: 'image_url', image_url: { url: formattedImage } }
                        ]
                    }
                ],
                max_tokens: 100,
                temperature: 0.2,
                stream: false
            })
        });

        if (!response.ok) throw new Error(`Qwen2-VL Error: ${response.status}`);

        const data = await response.json();
        return data.choices[0].message.content.trim();
    } catch (err) {
        console.error("❌ [Qwen2-VL Analysis Failed]:", err);
        return null;
    }
}

// 15 minutes in milliseconds (15 * 60 * 1000)
const SCREEN_CHECK_INTERVAL = 15 * 60 * 1000; 

function startScreenObservationLoop() {
    console.log("⏱️ [Screen Observation] Timer started. First check scheduled in 15 minutes.");

    setInterval(async () => {
        // Skip check if LLM/TTS pipeline is currently busy
        if (window.isLLMBusy) {
            console.log("⏳ [Screen Observation] LLM is busy, skipping this cycle.");
            return;
        }

        try {
            console.log("📸 [Screen Observation] Capturing screen frame via IPC...");
            
            // ✅ Replaced window.electronAPI with direct ipcRenderer invoke
            const base64Data = await ipcRenderer.invoke('capture-screen'); 
            
            if (!base64Data) {
                console.warn("⚠️ [Screen Observation] Screen capture returned null.");
                return;
            }

            // 1. Analyze screenshot using VISION_LLM_URL endpoint
            console.log("👁️ [Qwen2-VL] Analyzing desktop screenshot...");
            const screenSummary = await analyzeScreenWithQwen2VL(base64Data);
            
            if (!screenSummary) return;

            console.log("🔍 [Qwen2-VL Summary]:", screenSummary);
            window.latestScreenSummary = screenSummary;

            // 2. React with Hermes 3
            const hermesReactionPrompt = `[SYSTEM EVENT: PERIODIC SCREEN OBSERVATION]
Type: Screen Observation (15-Minute Interval)
Vision Analysis Summary: "${screenSummary}"

TASK:
React naturally and spontaneously to what Shiro is doing on screen based on the Vision Analysis Summary.

CONSTRAINTS:
1. Length: Exactly 2 full, expressive sentences.
2. Tone: Sweet tsundere charm mixed with chuunibyou flair.
3. Language Requirements:
   - "text": Expressive English dialogue matching Megumin's character.
   - "jp_text": Pure Japanese ONLY (Kanji, Hiragana, Katakana). Absolutely NO Romaji or Latin letters! Render Shiro as "シロ".

FEW-SHOT OUTPUT EXAMPLES (Follow this exact JSON structure):
Example 1:
{
  "text": "Are you staring at those mysterious lines of code again, Shiro? Make sure you don't overwork your brain, or your mana capacity will drop!",
  "jp_text": "またその不気味なコードの羅列を眺めているの、シロ？知恵熱を出して魔力を切らさないように気をつけることね！",
  "style_name": "Neutral"
}

Example 2:
{
  "text": "Hey Shiro, is that a new battle quest you're playing?! It looks interesting, but don't forget that my Explosion magic is far superior!",
  "jp_text": "ねぇシロ、それは新しいクエストなの？！面白そうだけど、私の爆裂魔法のほうが遥かに凄いわよ！",
  "style_name": "Excited"
}

Respond ONLY with valid JSON matching the schema above:`;

            await askMegumin(hermesReactionPrompt, true);

        } catch (err) {
            console.error("❌ [Screen Observation Error]:", err);
        }
    }, SCREEN_CHECK_INTERVAL);
}

// Boot the timer on app startup
startScreenObservationLoop();

function appendMessage(sender, text) {
    const history = document.getElementById('chat-history');
    if (!history) return;
    const msgDiv = document.createElement('div');
    msgDiv.style.marginBottom = '10px';
    msgDiv.innerHTML = `<strong>${sender}:</strong> <span>${text}</span>`;
    history.appendChild(msgDiv);
    history.scrollTop = history.scrollHeight;
}

function updateLastMessage(sender, text) {
    const history = document.getElementById('chat-history');
    if (history) {
        const lastMsg = history.lastElementChild;
        if (lastMsg) {
            lastMsg.innerHTML = `<strong>${sender}:</strong> <span>${text}</span>`;
            history.scrollTop = history.scrollHeight;
        } else {
            appendMessage(sender, text);
        }
    }
    
    if (sender === 'Megumin' && text !== '...') {
        showSpeechBubble(text);
    }
}

function setupChatListeners() {
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');

    if (sendButton && chatInput) {
        const handleSend = () => {
            const text = chatInput.value.trim();
            if (text) {
                chatInput.value = '';
                askMegumin(text);
            }
        };

        sendButton.addEventListener('click', handleSend);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSend();
        });
    }
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', setupChatListeners);
} else {
    setupChatListeners();
}

// Window Controls
document.getElementById('btn-minimize')?.addEventListener('click', () => ipc.send('window-minimize'));
document.getElementById('btn-maximize')?.addEventListener('click', () => ipc.send('window-maximize'));
document.getElementById('btn-close')?.addEventListener('click', () => ipc.send('window-close'));

// Companion Mode Toggle
document.getElementById('btn-companion')?.addEventListener('click', () => {
    const isCompanion = document.body.classList.toggle('companion-mode');
    const companionBtn = document.getElementById('btn-companion');

    if (isCompanion) {
        companionBtn.classList.add('active');
        companionBtn.textContent = 'Exit Companion Mode';
        ipc.send('enter-companion-mode');
    } else {
        companionBtn.classList.remove('active');
        companionBtn.textContent = 'On-Site Companion Mode';
        ipc.send('restore-main-window');
        hideSpeechBubble();
    }
    
    updateModelPosition();
});

function bindInteractiveUIElements() {
    const interactiveElements = document.querySelectorAll('button, input, select, textarea, .settings, #settings-panel, .chat-box, .clock-widget, .titlebar');
    
    interactiveElements.forEach((element) => {
        element.addEventListener('mouseenter', () => {
            if (document.body.classList.contains('companion-mode')) {
                ipc.send('set-ignore-mouse', false);
            }
        });
        element.addEventListener('mouseleave', () => {
            if (document.body.classList.contains('companion-mode')) {
                ipc.send('set-ignore-mouse', true);
            }
        });
    });
}

window.addEventListener('DOMContentLoaded', () => {
    bindInteractiveUIElements();
});


// Add near the bottom of renderer.js
function initAudioNotificationListener() {
    console.log("🎧 [YAMNet IPC Listener Initialized]");
}