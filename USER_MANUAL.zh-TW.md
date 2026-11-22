# 惠惠 (Megumin) 项目 - 用户手册

🌐 **Language / 語言 / 言語 / Ngôn ngữ:** [English](USER_MANUAL.md) | [日本語](USER_MANUAL.ja.md) | [简体中文](USER_MANUAL.zh-CN.md) | [繁體中文](USER_MANUAL.zh-TW.md) | [Tiếng Việt](USER_MANUAL.vi.md)

---

歡迎使用 **Megumin 桌面 AI 伴侶** 使用者手冊。本指南詳細介紹了硬體/軟體前提條件、服務設定、啟動步驟及功能使用說明。

## 1. 前提條件與系統需求

為獲得最佳體驗，請確保您的電腦上已安裝以下相依環境。

> **硬體提示:** 同時執行 LLM、VLM 與神經 TTS 需要消耗大量顯存 (VRAM)。如果您的 GPU 顯存不足，建議在區域網路內的 **2 台設備** 上分擔工作負載（例如：在桌上型電腦執行 LM Studio 與 TTS 伺服器，在筆記型電腦執行客戶端）。

### 核心執行環境

* **作業系統:** Windows 10/11 (64位元)
* **Node.js:** v18.x 或更高版本
* **Python:** 3.10 或更高版本（YAMNet 環境音處理與 TTS 後端必需）

### Node.js 相依套件

在客戶端目錄中執行 `npm install` 時會自動安裝：

* **`electron`:** 處理使用者介面、透明視窗控制及 IPC 通訊事件。
* **`child_process`, `fs`, `path`:** 用於生成 Python 輔助腳本的 Node.js 內建模組（無需額外安裝）。

### Python 輔助相依套件（客戶端音訊）

在客戶端 Python 環境中安裝以下套件以開啟環境音檢測：

```cmd
pip install tensorflow tensorflow-hub sounddevice numpy
```

* **`tensorflow` & `tensorflow-hub`:** YAMNet 環境音分類模型。
* **`sounddevice`:** 麥克風/音訊串流輸入。
* **`numpy`:** 音訊陣列處理。

### 本地 AI 介面與後端模型

* **視覺模型 (VLM):** `Qwen2-VL-2B-Instruct`
* **邏輯推理模型 (LLM):** `NousResearch/Hermes-3-Llama-3.1-8B`
* **日語神經 TTS 語音引擎:** `Estellya/Megumin-Style-Bert-VITS2` (Style-Bert-VITS2 引擎)

---

## 2. 安裝與啟動指南

### 步驟 1: 下載儲存庫

1. **客戶端 (Client):** 從 GitHub 複製或下載客戶端儲存庫：  
   `https://github.com/ndta3010/Megumin-Resurrections`
2. **TTS 伺服器:** 從 Hugging Face 複製或下載語音模型及後端整合包：  
   `https://huggingface.co/Estellya/Megumin-Style-Bert-VITS2`

### 步驟 2: 設定 LLM 與 VLM (LM Studio)

1. 下載並開啟 **LM Studio**。
2. 搜尋並下載 **`Qwen2-VL-2B-Instruct`** 與 **`NousResearch/Hermes-3-Llama-3.1-8B`**。
3. 切換至 LM Studio 中的 **Local Server** 標籤頁，載入模型並啟動伺服器（預設位址：`http://localhost:1234/v1`）。*(若跨區域網路在第二台 PC 上執行，請在 LM Studio 中勾選 **Serve on Local Network**)*。
4. 開啟 **Megumin Client** 資料夾中的 **`renderer.js`** 檔案，修改 LLM/VLM 介面 URL，使其與 LM Studio 中顯示的伺服器位址一致。

### 步驟 3: 啟動 TTS 語音伺服器

1. 開啟下載好的 **`Megumin-Style-Bert-VITS2`** 資料夾。
2. 連按兩下執行 **`Start_Server.bat`**。
   * *首次執行:* 系統會自動建立 Python `venv` 虛擬環境並從 `requirements.txt` 安裝相依套件（需要花費幾分鐘時間）。
   * *準備就緒狀態:* 等待主控台顯示以下提示：  
     `Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)`
3. 保持該終端機視窗在背景執行。*(注意：若在第二台 PC 上託管 TTS 伺服器，請同步修改 `renderer.js` 中的 TTS 位址為其區域網路 IP)*。

### 步驟 4: 啟動 Megumin 客戶端

1. 在 **Megumin Client** 儲存庫資料夾內開啟終端機。
2. 安裝 Node.js 相依套件（僅首次需要）：
   ```cmd
   npm install
   ```
3. 啟動應用程式：
   ```cmd
   npm start
   ```
   啟動後不久，惠惠 (Megumin) 就會出現在您的桌面上。

---

## 3. 特色功能亮點

> **語言提示:** 與她打字聊天時，輸入語言**必須為英文**（她會解析您的英文提示詞並以日語語音進行回應）。

* **問候功能:** 啟動時，她會根據一天中的時間（*早晨*、*下午*、*晚上*）動態向您問好。
* **「害羞」互動:** 在她的立繪上連續左鍵點擊 3 次（三擊戳她），即可觸發專屬害羞反應。
* **惠惠鬧鐘:** 內建帶有惠惠專屬起床鈴聲的鬧鐘功能。
* **定時螢幕反應:** 每隔 15 分鐘，她會透過視覺模型 (VLM) 觀察並評論您螢幕上的操作內容。
* **桌面伴侶模式:** 可在桌面任意位置自由拖曳移動她的位置。
* **Q 版 (Chibi) 模式:** 可將她切換為精簡的 Q 版形態，在不關閉軟體的前提下節省桌面空間。