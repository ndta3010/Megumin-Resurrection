# 惠惠 (Megumin) 项目 - 用户手册

🌐 **Language / 語言 / 言語 / Ngôn ngữ:** [English](USER_MANUAL.md) | [日本語](USER_MANUAL.ja.md) | [简体中文](USER_MANUAL.zh-CN.md) | [繁體中文](USER_MANUAL.zh-TW.md) | [Tiếng Việt](USER_MANUAL.vi.md)

---

欢迎使用 **Megumin 桌面 AI 助手** 用户手册。本指南详细介绍了硬件/软件前提条件、服务配置、启动步骤及功能使用说明。

## 1. 前提条件与系统要求

为获得最佳体验，请确保您的计算机上已安装以下依赖环境。

> **硬件提示:** 同时运行 LLM、VLM 和神经 TTS 需要消耗大量显存 (VRAM)。如果您的 GPU 显存不足，建议在局域网内的 **2 台设备** 上分担工作负载（例如：在台式机上运行 LM Studio 和 TTS 服务器，在笔记本电脑上运行客户端）。

### 核心运行环境

* **操作系统:** Windows 10/11 (64位)
* **Node.js:** v18.x 或更高版本
* **Python:** 3.10 或更高版本（YAMNet 环境音处理和 TTS 后端必需）

### Node.js 依赖项

在客户端目录中运行 `npm install` 时会自动安装：

* **`electron`:** 处理用户界面、透明窗口控制及 IPC 通信事件。
* **`child_process`, `fs`, `path`:** 用于生成 Python 辅助脚本的 Node.js 内置模块（无需额外安装）。

### Python 辅助依赖项（客户端音频）

在客户端 Python 环境中安装以下包以开启环境音检测：

```cmd
pip install tensorflow tensorflow-hub sounddevice numpy
```

* **`tensorflow` & `tensorflow-hub`:** YAMNet 环境音分类模型。
* **`sounddevice`:** 麦克风/音频流输入。
* **`numpy`:** 音频数组处理。

### 本地 AI 接口与后端模型

* **视觉模型 (VLM):** `Qwen2-VL-2B-Instruct`
* **逻辑推理模型 (LLM):** `NousResearch/Hermes-3-Llama-3.1-8B`
* **日语神经 TTS 语音引擎:** `Estellya/Megumin-Style-Bert-VITS2` (Style-Bert-VITS2 引擎)

---

## 2. 安装与启动指南

### 步骤 1: 下载仓库

1. **客户端 (Client):** 从 GitHub 克隆或下载客户端仓库：  
   `https://github.com/ndta3010/Megumin-Resurrections`
2. **TTS 服务器:** 从 Hugging Face 克隆或下载语音模型及后端整合包：  
   `https://huggingface.co/Estellya/Megumin-Style-Bert-VITS2`

### 步骤 2: 配置 LLM 与 VLM (LM Studio)

1. 下载并打开 **LM Studio**。
2. 搜索并下载 **`Qwen2-VL-2B-Instruct`** 与 **`NousResearch/Hermes-3-Llama-3.1-8B`**。
3. 转到 LM Studio 中的 **Local Server** 选项卡，加载模型并启动服务器（默认地址：`http://localhost:1234/v1`）。*(如果跨局域网在第二台 PC 上运行，请在 LM Studio 中勾选 **Serve on Local Network**)*。
4. 打开 **Megumin Client** 文件夹中的 **`renderer.js`** 文件，修改 LLM/VLM 接口 URL，使其与 LM Studio 中显示的服务器地址一致。

### 步骤 3: 启动 TTS 语音服务器

1. 打开下载好的 **`Megumin-Style-Bert-VITS2`** 文件夹。
2. 双击运行 **`Start_Server.bat`**。
   * *首次运行:* 系统会自动创建 Python `venv` 虚拟环境并从 `requirements.txt` 安装依赖（需要几分钟时间）。
   * *准备就绪状态:* 等待控制台显示以下提示：  
     `Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)`
3. 保持该终端窗口在后台运行。*(注意：如果在第二台 PC 上托管 TTS 服务器，请同步修改 `renderer.js` 中的 TTS 地址为其局域网 IP)*。

### 步骤 4: 启动 Megumin 客户端

1. 在 **Megumin Client** 仓库文件夹内打开终端。
2. 安装 Node.js 依赖项（仅首次需要）：
   ```cmd
   npm install
   ```
3. 启动应用：
   ```cmd
   npm start
   ```
   启动后不久，惠惠 (Megumin) 就会出现在您的桌面上。

---

## 3. 特色功能亮点

> **语言提示:** 与她打字聊天时，输入语言**必须为英文**（她会解析您的英文提示词并以日语语音进行回应）。

* **问候功能:** 启动时，她会根据一天中的时间（*早晨*、*下午*、*晚上*）动态向您问好。
* **“害羞”互动:** 在她的立绘上连续左键点击 3 次（三击戳她），即可触发专属害羞反应。
* **惠惠闹钟:** 内置带有惠惠专属起床铃声的闹钟功能。
* **定时屏幕反应:** 每隔 15 分钟，她会通过视觉模型 (VLM) 观察并评论您屏幕上的操作内容。
* **桌面伴侣模式:** 可在桌面任意位置自由拖拽移动她的位置。
* **Q 版 (Chibi) 模式:** 可将她切换为紧凑的 Q 版形态，在不关闭软件的前提下节省桌面空间。
* **通知检测：** 自动检测系统或桌面通知提示音（基于 YAMNet 音频分类），并实时做出反应提醒你。
