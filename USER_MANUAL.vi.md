# Dự án Megumin - Hướng dẫn sử dụng

🌐 **Language / 語言 / 言語 / Ngôn ngữ:** [English](USER_MANUAL.md) | [日本語](USER_MANUAL.ja.md) | [简体中文](USER_MANUAL.zh-CN.md) | [繁體中文](USER_MANUAL.zh-TW.md) | [Tiếng Việt](USER_MANUAL.vi.md)

---

Chào mừng bạn đến với hướng dẫn sử dụng **Megumin Desktop AI Companion**. Tài liệu này hướng dẫn chi tiết từ yêu cầu phần cứng/phần mềm, cấu hình dịch vụ, quy trình khởi động đến cách sử dụng các tính năng.

## 1. Yêu cầu hệ thống & Điều kiện tiên quyết

Hãy đảm bảo máy tính của bạn đã cài đặt các phụ thuộc sau để có trải nghiệm tốt nhất.

> **Lưu ý phần cứng:** Việc chạy đồng thời LLM, VLM và Neural TTS đòi hỏi dung lượng VRAM khá lớn. Nếu bạn không có GPU VRAM cao, khuyến nghị nên chia tải công việc trên **2 thiết bị** trong cùng mạng LAN (ví dụ: chạy LM Studio và TTS server trên máy bàn, còn client chạy trên laptop).

### Môi trường thực thi cốt lõi

* **Hệ điều hành:** Windows 10/11 (64-bit)
* **Node.js:** v18.x trở lên
* **Python:** 3.10 trở lên (bắt buộc cho xử lý âm thanh môi trường YAMNet và backend TTS)

### Thư viện Node.js

Tự động cài đặt thông qua `npm install` trong thư mục client:

* **`electron`:** Quản lý giao diện UI, cửa sổ trong suốt và các sự kiện IPC.
* **`child_process`, `fs`, `path`:** Các module tích hợp sẵn của Node.js dùng để gọi script Python (không cần cài thêm).

### Thư viện Python phụ trợ (Âm thanh Client)

Cài đặt các gói này vào môi trường Python client để kích hoạt tính năng phát hiện âm thanh xung quanh:

```cmd
pip install tensorflow tensorflow-hub sounddevice numpy
```

* **`tensorflow` & `tensorflow-hub`:** Mô hình phân loại âm thanh YAMNet.
* **`sounddevice`:** Thu luồng âm thanh từ microphone.
* **`numpy`:** Xử lý mảng dữ liệu âm thanh.

### Các Endpoints AI Local & Backend

* **Vision Model (VLM):** `Qwen2-VL-2B-Instruct`
* **Reasoning Model (LLM):** `NousResearch/Hermes-3-Llama-3.1-8B`
* **Japanese Neural TTS:** `Estellya/Megumin-Style-Bert-VITS2` (Engine Style-Bert-VITS2)

---

## 2. Hướng dẫn Cấu hình & Khởi động

### Bước 1: Tải các Repository

1. **Client:** Clone hoặc tải repository client từ GitHub:  
   `https://github.com/ndta3010/Megumin-Resurrections`
2. **TTS Server:** Clone hoặc tải voice model và gói backend từ Hugging Face:  
   `https://huggingface.co/Estellya/Megumin-Style-Bert-VITS2`

### Bước 2: Cấu hình LLM & VLM (LM Studio)

1. Tải và mở **LM Studio**.
2. Tìm kiếm và tải về **`Qwen2-VL-2B-Instruct`** và **`NousResearch/Hermes-3-Llama-3.1-8B`**.
3. Chuyển sang tab **Local Server** trong LM Studio, load model và ấn start server (mặc định: `http://localhost:1234/v1`). *(Nếu chạy trên PC thứ 2 qua mạng LAN, hãy bật tùy chọn **Serve on Local Network** trong LM Studio)*.
4. Mở file **`renderer.js`** trong thư mục **Megumin Client** và cập nhật URL endpoint LLM/VLM cho khớp với địa chỉ hiển thị trong LM Studio.

### Bước 3: Khởi chạy TTS Server

1. Mở thư mục **`Megumin-Style-Bert-VITS2`** đã tải về.
2. Nhấp đôi vào file **`Start_Server.bat`**.
   * *Lần đầu chạy:* Script sẽ tự động tạo Python `venv` và cài đặt các thư viện từ `requirements.txt` (quá trình này mất vài phút).
   * *Trạng thái sẵn sàng:* Chờ cho đến khi terminal hiển thị:  
     `Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)`
3. Giữ cửa sổ terminal này chạy ngầm. *(Lưu ý: Nếu host TTS server trên PC thứ 2, nhớ cập nhật URL TTS trong `renderer.js` thành IP local của máy đó)*.

### Bước 4: Khởi chạy Megumin Client

1. Mở terminal bên trong thư mục repository **Megumin Client**.
2. Cài đặt các thư viện Node.js (chỉ cần làm lần đầu):
   ```cmd
   npm install
   ```
3. Khởi chạy ứng dụng:
   ```cmd
   npm start
   ```
   Megumin sẽ xuất hiện trên màn hình desktop của bạn ngay sau đó.

---

## 3. Các tính năng nổi bật

> **Lưu ý ngôn ngữ:** Khi nhắn tin với Megumin, ngôn ngữ nhập vào **BẮT BUỘC phải là tiếng Anh** (cô ấy sẽ xử lý câu lệnh tiếng Anh và phản hồi bằng giọng nói tiếng Nhật).

* **Chào hỏi theo thời gian:** Khi khởi động, cô ấy sẽ chào bạn dựa trên thời gian trong ngày (*Sáng*, *Chiều*, hoặc *Tối*).
* **Hiệu ứng "Special Shy":** Nhấp chuột trái 3 lần liên tiếp vào avatar để trêu và kích hoạt phản ứng ngượng ngùng.
* **Báo thức Megumin:** Tính năng báo thức tích hợp chuông báo thức độc quyền từ Megumin.
* **Phản ứng màn hình định kỳ:** Mỗi 15 phút, cô ấy sẽ sử dụng Vision model (VLM) để quan sát và đưa ra nhận xét về những gì bạn đang làm trên màn hình.
* **Chế độ Companion:** Bạn có thể kéo thả cô ấy tự do đến bất kỳ vị trí nào trên màn hình.
* **Chế độ Chibi:** Thu nhỏ cô ấy thành dạng chibi gọn gàng để tiết kiệm không gian màn hình mà không cần đóng ứng dụng.