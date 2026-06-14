# Voice2Knowledge

A premium, privacy-first local audio transcription and AI assistant. All processing happens entirely on your device — your audio and conversations never leave your machine. Transcribe files and chat naturally with a fully local LLM that intelligently remembers your conversations and references your transcriptions.

<p align="center">
  <img src="assets/voice2knowledge.gif" alt="Voice2Knowledge demo" width="600">
</p>

## Key Features
- **Privacy First**: 100% offline, local processing. Your data is yours.
- **Premium UI/UX**: Beautiful, responsive glassmorphism interface with fluid animations and automatic Light/Dark mode syncing.
- **Advanced AI Memory**: Features a ChatGPT-style Token-Aware Dynamic Memory system. It mathematically balances context limits to remember dozens of previous chat messages seamlessly without crashing.
- **Automatic RAG Engine**: Uses a pure-Python TF-IDF engine to instantly chunk and retrieve the most relevant pieces of your transcriptions based on your questions. No manual context selection required!
- **GPU Acceleration**: Auto-detects NVIDIA GPUs (via `ctranslate2` & `nvidia-smi`) for lightning-fast transcription, or gracefully falls back to CPU processing.
- **History & Export**: Saves all your sessions. Export your transcriptions to TXT, PDF, or DOCX.

---

## Quick Start

### For Regular Users
- Download from Releases (Windows/Mac/Linux)
- Single executable, no installation needed

### For Developers
- Clone repo, then run: `./build.sh` (Linux/macOS) or `build.bat` (Windows)
- Output in `dist/Voice2Knowledge/`

---

## Download & Install (Regular Users)

### Windows
1. Go to the [Releases page](https://github.com/JKORRA/Voice2Knowledge/releases/latest)
2. Download `Voice2Knowledge-Windows.zip`
3. Extract and run `Voice2Knowledge.exe`

### macOS
1. Go to the [Releases page](https://github.com/JKORRA/Voice2Knowledge/releases/latest)
2. Download `Voice2Knowledge-macOS.zip`
3. Extract the archive
4. Right-click the app and select **Open** (bypasses the security warning on first run)

### Linux
1. Go to the [Releases page](https://github.com/JKORRA/Voice2Knowledge/releases/latest)
2. Download `Voice2Knowledge-Linux.tar.gz`
3. Extract and run: `chmod +x Voice2Knowledge && ./Voice2Knowledge`

---

## Running the Application

### Option A: Desktop App (Recommended)
- Pre-built: Download from Releases
- From source: `python src/launcher.py` (Starts a native desktop window)

### Option B: Web UI (Development Mode)
Two ways to run:
1. **Two-terminal setup:**
   - Terminal 1: `python -m uvicorn backend.main:app --reload --port 8000`
   - Terminal 2: `cd frontend && npm run dev`
   - Open http://localhost:5173

2. **Single command (pywebview):**
   - After setup: `python src/launcher.py`

### Option C: CLI (Lightweight - No UI)
```bash
python script.py "audio.wav" -m small -l it
```
Perfect for batch processing or servers. Full guide in `guide.md`.

---

## Chat with Your Transcriptions

After transcribing audio, you can ask questions about the content. The LLM runs 100% locally.

### How It Works Under the Hood

1. **Transcribe** one or more audio files.
2. **Ask questions** in natural language about the content.
3. **Retrieval-Augmented Generation (RAG)**: The backend automatically scans all your session transcriptions, chunks them, and uses a TF-IDF algorithm to inject the most relevant paragraphs into the AI's prompt. 
4. **Dynamic Context**: The Token-Aware Memory system perfectly balances your transcription chunks with your previous chat messages, ensuring smooth, continuous conversation without losing context.

### Available Models

All models are downloaded on demand when first selected. Switch anytime in **Settings** → Manage Local Models.

**Whisper** (transcription, via faster-whisper):
| Size | Default |
|------|---------|
| `tiny`, `base` | |
| `small` | ✅ Default |
| `medium`, `large-v3` | |

**LLM** (chat, via llama.cpp — all GGUF Q4_K_M):
| Model | Size | Default |
|-------|------|---------|
| Qwen 2.5 3B Instruct | ~1.8 GB | ✅ Default |
| Llama 3.2 1B Instruct | ~0.7 GB | |
| Phi 3.5 Mini Instruct | ~2.2 GB | |

---

## Tech Stack

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) + Uvicorn (REST API + WebSocket real-time)
- **Transcription**: [`faster-whisper`](https://github.com/SYSTRAN/faster-whisper) (CTranslate2-optimized Whisper, no PyTorch)
- **Local LLM**: [`llama-cpp-python`](https://github.com/abetlen/llama-cpp-python) (GGUF quantized models)
- **Database**: SQLite (transcription & chat history, no external DB server needed)
- **Desktop Wrapper**: [pywebview](https://pywebview.flowrl.com/) + PyQt6
- **Export**: TXT, PDF ([fpdf2](https://github.com/andreax79/fpdf2)), DOCX ([python-docx](https://github.com/python-openxml/python-docx))

### Frontend
- **UI**: React 19 + TypeScript 6 + Vite 8
- **Styling**: Tailwind CSS 3
- **State**: Zustand
- **Animation**: framer-motion
- **Icons**: lucide-react

### Build
- **Packaging**: PyInstaller (`torch` excluded for smaller bundle, ~200-300 MB)
- **CLI**: Standalone `script.py` for batch processing

---

## Project Structure
```
Voice2Knowledge/
├── backend/
│   ├── main.py              # FastAPI entry
│   ├── api/                 # Routes and WebSockets (RAG Engine)
│   └── core/                # Transcriber, LLM manager, GPU utils, DB
├── frontend/                # React + Vite UI
├── src/                     # Desktop launcher wrapper (launcher.py)
├── script.py                # Lightweight CLI tool
├── build.sh/.bat            # Build scripts
├── app.spec                 # PyInstaller configuration
└── guide.md                 # CLI usage guide
```

---

## Building from Source

### Prerequisites
- Python 3.9+
- Node.js 18+

### Quick Build (Recommended)
```bash
# Linux/macOS
./build.sh

# Windows
build.bat
```

---

## Troubleshooting

- **GPU not detected**: Falls back to CPU automatically, works fine but slower.
- **Port 8000 in use**: Change port: `python -m uvicorn backend.main:app --port 9000`
- **Model download slow**: First run downloads models (~1-2GB). Subsequent runs are instant.

---

## License

MIT
