# めぐみんプロジェクト - ユーザーマニュアル

🌐 **Language / 語言 / 言語 / Ngôn ngữ:** [English](USER_MANUAL.md) | [日本語](USER_MANUAL.ja.md) | [简体中文](USER_MANUAL.zh-CN.md) | [繁體中文](USER_MANUAL.zh-TW.md) | [Tiếng Việt](USER_MANUAL.vi.md)

---

**めぐみん デスクトップ AI アシスタント** のユーザーマニュアルへようこそ。このガイドでは、ハードウェア／ソフトウェアの前提条件、サービス設定、起動手順、および機能の使い方について詳しく解説します。

## 1. 前提条件とシステム要件

最高のパフォーマンスを得るために、以下の依存関係がインストールされていることを確認してください。

> **ハードウェアに関する注意:** LLM、VLM、およびニューラル TTS を同時に実行するには、多くの VRAM が必要です。VRAM 容量の少ない GPU をお使いの場合は、ローカルネットワーク上の **2 台のデバイス** に処理を分散することをお勧めします（例：デスクトップ PC で LM Studio と TTS サーバーを実行し、ノート PC でクライアントを実行）。

### 核心実行環境

* **OS:** Windows 10/11 (64-bit)
* **Node.js:** v18.x 以上
* **Python:** 3.10 以上（YAMNet 環境音処理および TTS バックエンドに必須）

### Node.js 依存関係

クライアントディレクトリで `npm install` を実行することで自動的にインストールされます：

* **`electron`:** UI、透明ウィンドウ制御、IPC イベントを処理します。
* **`child_process`, `fs`, `path`:** Python サイドカースクリプトを呼び出す組み込み Node.js モジュール（追加インストール不要）。

### Python サイドカー依存関係（クライアント音声用）

クライアントの Python 環境にインストールし、環境音検出を有効にします：

```cmd
pip install tensorflow tensorflow-hub sounddevice numpy
```

* **`tensorflow` & `tensorflow-hub`:** YAMNet 環境音分類。
* **`sounddevice`:** マイク／音声ストリーム入力。
* **`numpy`:** 音声配列処理。

### ローカル AI エンドポイント＆バックエンドモデル

* **ビジョンモデル (VLM):** `Qwen2-VL-2B-Instruct`
* **推論モデル (LLM):** `NousResearch/Hermes-3-Llama-3.1-8B`
* **日本語ニューラル TTS:** `Estellya/Megumin-Style-Bert-VITS2` (Style-Bert-VITS2 エンジン)

---

## 2. セットアップ＆起動ガイド

### ステップ 1: リポジトリのダウンロード

1. **クライアント:** GitHub からクライアントリポジトリをクローンまたはダウンロードします：  
   `https://github.com/ndta3010/Megumin-Resurrections`
2. **TTS サーバー:** Hugging Face から音声モデルとバックエンドのバンドルをクローンまたはダウンロードします：  
   `https://huggingface.co/Estellya/Megumin-Style-Bert-VITS2`

### ステップ 2: LLM & VLM の設定 (LM Studio)

1. **LM Studio** をダウンロードして開きます。
2. **`Qwen2-VL-2B-Instruct`** と **`NousResearch/Hermes-3-Llama-3.1-8B`** を検索してダウンロードします。
3. LM Studio の **Local Server** タブに移動し、モデルをロードしてサーバーを開始します（デフォルト: `http://localhost:1234/v1`）。*(LAN 経由で 2 台目の PC から実行する場合は、LM Studio で **Serve on Local Network** を有効にしてください)*。
4. **Megumin Client** フォルダ内の **`renderer.js`** を開き、LLM/VLM エンドポイント URL を LM Studio に表示されているサーバーアドレスに合わせて更新します。

### ステップ 3: TTS サーバーの起動

1. ダウンロードした **`Megumin-Style-Bert-VITS2`** フォルダを開きます。
2. **`Start_Server.bat`** をダブルクリックします。
   * *初回起動時:* 自動的に Python の `venv` が作成され、`requirements.txt` から依存関係がインストールされます（数分かかります）。
   * *準備完了状態:* ターミナルに以下が表示されるまで待ちます：  
     `Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)`
3. このターミナルウィンドウはバックグラウンドで開いたままにします。*(注意: 2 台目の PC で TTS サーバーをホストする場合は、`renderer.js` 内の TTS URL もその機器のローカル IP アドレスに変更してください)*。

### ステップ 4: めぐみんクライアントの起動

1. **Megumin Client** リポジトリフォルダ内でターミナルを開きます。
2. Node.js の依存関係をインストールします（初回のみ）：
   ```cmd
   npm install
   ```
3. アプリケーションを起動します：
   ```cmd
   npm start
   ```
   起動後まもなく、デスクトップ上にめぐみんが登場します。

---

## 3. 主要機能

> **言語に関する注意:** テキストでチャットする際、入力言語は **英語** である必要があります（英語のプロンプトを処理し、日本語のボイス音声で応答します）。

* **時間に応じた挨拶:** 起動時に、時間帯（*朝*、*昼*、*夜*）に合わせて動的に挨拶します。
* **「照れ顔（Special Shy）」エフェクト:** アバターを 3 回連続で左クリック（トリプルクリック）して突っつくと、照れたリアクションが発生します。
* **めぐみん目覚まし時計:** めぐみん専用の目覚ましボイス音声を搭載したアラーム機能。
* **定期的な画面リアクション:** 15 分ごとにビジョンモデル (VLM) を使用して画面を観察し、作業内容についてコメントします。
* **コンパニオンモード:** デスクトップ上の好きな場所に自由にドラッグ＆ドロップできます。
* **ちびモード:** アプリを完全に終了することなく、コンパクトなちびキャラ姿に変形させてデスクトップ空間を節約できます。