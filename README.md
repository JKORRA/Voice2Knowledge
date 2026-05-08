# Voice2Knowledge

A modern, cross-platform desktop application for transcribing audio files to text using local AI. All transcription happens completely offline on your device, ensuring maximum privacy for your work calls, lectures, meetings, and personal recordings.

---

## ⚡ Download & Install (For Regular Users)

You **do not** need any technical knowledge, coding experience, or command-line tools to use Voice2Knowledge.

### 🪟 Windows
1. Go to the [Releases page](https://github.com/JKORRA/Voice2Knowledge/releases/latest).
2. Download the `Voice2Knowledge-Windows.zip` file.
3. Extract (unzip) the file.
4. Open the extracted folder and double-click `Voice2Knowledge.exe`.

### 🍎 macOS
1. Go to the [Releases page](https://github.com/JKORRA/Voice2Knowledge/releases/latest).
2. Download the `Voice2Knowledge-macOS.zip` file.
3. Extract (unzip) the file.
4. **Important Security Step**: The first time you open the app, macOS will show a warning saying it cannot verify the developer. To bypass this:
   - **Right-click** (or Control-click) on the `Voice2Knowledge` app.
   - Click **Open** from the menu.
   - Click **Open** again on the pop-up warning. (You only need to do this once).

### 🐧 Linux
1. Go to the [Releases page](https://github.com/JKORRA/Voice2Knowledge/releases/latest).
2. Download the `Voice2Knowledge-Linux.tar.gz` file.
3. Extract the archive.
4. Right-click the `Voice2Knowledge` file inside the folder, select **Properties**, go to **Permissions**, and check **"Allow executing file as program"**.
5. Double-click the file to run it.

---

## 🎙️ How to Use

1. **Upload Audio**: Click the upload area or drag and drop your audio files (MP3, M4A, WAV, etc.) onto the window.
2. **Start Transcription**: Click the upload button to begin.
3. **Wait**: The AI will transcribe your audio. A progress bar will keep you updated.
4. **Export**: Once finished, download the results as a Text (.txt), Word (.docx), or PDF file!

*(Optional)* Click the gear icon ⚙️ to change settings, such as using a larger AI model for better accuracy or forcing a specific language.

---

## 🌟 Key Features

- **Privacy First**: All transcription happens locally on your device - your audio files never leave your machine.
- **Cross-Platform**: Works smoothly on Windows, macOS, and Linux.
- **Hardware Adaptive**: Automatically uses your GPU if available for blazing-fast transcription, or falls back to your CPU.
- **Automatic Setup**: No need to install third-party dependencies like FFmpeg; everything is bundled out of the box!
- **History & Export**: Search your past transcriptions and export them seamlessly.

---

## 🛠️ For Developers

If you want to build the project from source or contribute, follow these instructions:

### Prerequisites

- Python 3.9+
- Node.js 18+

*(Note: FFmpeg is automatically bundled using `imageio-ffmpeg` via Python)*

### 1. Clone & Setup

```bash
git clone https://github.com/JKORRA/Voice2Knowledge.git
cd Voice2Knowledge

# Create and activate Python virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\Activate

# Install Python dependencies
pip install -r requirements.txt

# Install Frontend dependencies
cd frontend
npm install
```

### 2. Run in Development Mode

**Terminal 1 (Backend API):**
```bash
python -m uvicorn backend.main:app --reload --port 8000
```

**Terminal 2 (Frontend UI):**
```bash
cd frontend
npm run dev
```

Then open `http://localhost:5173` in your browser.

**Alternatively, run the full desktop experience via pywebview:**
```bash
python src/launcher.py
```

### 3. Build Executable

To build the standalone executable locally:

```bash
# 1. Build frontend
cd frontend
npm run build
cd ..

# 2. Package with PyInstaller
pyinstaller app.spec --clean -y
```

The output will be located in `dist/Voice2Knowledge/`.

*(Note: This project also utilizes GitHub Actions for automated cross-platform CI/CD builds on every release).*

---

## 📜 License

MIT License

Copyright (c) 2024 Voice2Knowledge