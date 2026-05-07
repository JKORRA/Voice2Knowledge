# Voice2Knowledge

A modern, cross-platform desktop application for transcribing audio files to text using local AI (faster-whisper). All transcription happens locally on your machine - no internet required after initial model download - ensuring complete privacy for your audio data.

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Installation](#installation)
4. [Usage](#usage)
5. [Project Structure](#project-structure)
6. [Tech Stack](#tech-stack)
7. [Troubleshooting](#troubleshooting)
8. [License](#license)

---

## Overview

Voice2Knowledge is a desktop application that transcribes audio files (work calls, lectures, meetings, podcasts) into text using the faster-whisper AI model powered by CTranslate2.

### Key Benefits

- **Privacy First**: All transcription happens locally on your device - your audio files never leave your machine
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Hardware Adaptive**: Automatically uses GPU (CUDA) if available, gracefully falls back to CPU
- **Modern UI**: Clean, chat-style interface for easy interaction
- **Future-Ready**: Designed to integrate with local LLMs for asking questions about your transcriptions

---

## Features

### Core Features

| Feature | Description |
|---------|-------------|
| **Audio Transcription** | Supports WAV, MP3, M4A, FLAC, OGG, WebM, MP4 formats |
| **Batch Processing** | Transcribe multiple files in one session |
| **Dual Output** | Generates clean text (.txt) and timestamped subtitles (.vtt) |
| **Hardware Auto-Detection** | Automatically detects and uses GPU (CUDA) when available |
| **Language Detection** | Automatically detects audio language with confidence score |

### Desktop App Features

- **Modern Chat Interface**: Upload files and view results in a clean chat-style UI
- **Dark/Light Mode**: Follows your system theme automatically (no manual toggle needed)
- **Transcription History**: Search and review past transcriptions stored in local SQLite database
- **Export Options**: Download transcriptions as TXT, PDF, or DOCX
- **Model Management**: Download and manage different Whisper model sizes (tiny to large-v3)
- **Real-time Progress**: See transcription progress with live updates and partial text

### CLI Features (script.py)

- **Standalone Script**: Use without the desktop app for quick transcriptions
- **Batch Processing**: Process multiple files or entire folders
- **Customizable Options**: Adjust model size, language, beam size, device, compute type

---

## Installation

### Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Python | 3.9+ | Required for development |
| Node.js | 18+ | Required for frontend build |
| ffmpeg | Latest | For audio file processing |

#### Installing ffmpeg

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install ffmpeg

# macOS
brew install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
# Add to PATH or use full path to executable
```

### Quick Start

#### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/Voice2Knowledge.git
cd Voice2Knowledge
```

#### 2. Install Python Dependencies

```bash
# Create virtual environment (recommended)
python -m venv venv

# Activate on Linux/macOS
source venv/bin/activate

# Activate on Windows (PowerShell)
.\venv\Scripts\Activate

# Activate on Windows (CMD)
venv\Scripts\activate.bat

# Install dependencies
pip install -r requirements.txt
```

#### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

---

## Usage

### Running the Desktop App

#### Development Mode (Frontend + Backend)

**Option A: Frontend only (for UI development)**

```bash
# Terminal 1: Start backend API
python -m uvicorn backend.main:app --reload --port 8000

# Terminal 2: Start frontend dev server
cd frontend
npm run dev
```

Then open http://localhost:5173 in your browser.

**Option B: Full stack with pywebview (complete desktop experience)**

```bash
python src/launcher.py
```

This opens the application in a native desktop window.

#### Running the Built Executable

```bash
# Linux/macOS
./dist/Voice2Knowledge/Voice2Knowledge

# Windows
.\dist\Voice2Knowledge.exe
```

### Using the Desktop App

1. **Launch the app**: Run `python src/launcher.py` or open the built executable
2. **Upload audio**: Click the upload area or drag and drop audio files onto the window
3. **Configure settings** (optional): Click the gear icon to adjust:
   - Model size: tiny, base, small (default), medium, large-v3
   - Language: auto-detect (default) or specify (e.g., "en", "it")
   - Device: auto (default), CPU only, or CUDA (if you have NVIDIA GPU)
4. **Start transcription**: Click the upload button to begin
5. **Monitor progress**: Watch the real-time progress bar and partial text
6. **Download results**: Click "Text" for plain text or "Subtitles" for WebVTT
7. **Export formats**: Use export options for PDF or DOCX formats
8. **Access history**: View past transcriptions from the history panel

### Command Line Interface (CLI)

The standalone `script.py` can be used without the desktop app:

```bash
# Single file
python script.py audio.wav

# Multiple files
python script.py call1.wav call2.mp3 -o results/

# Entire directory
python script.py --input-dir ./recordings/ -o output/

# With custom options
python script.py audio.wav -m medium -l en -o results/ --beam-size 4
```

#### CLI Options

| Option | Short | Default | Description |
|--------|-------|---------|-------------|
| `--model` | `-m` | small | Model size: tiny, base, small, medium, large-v3 |
| `--language` | `-l` | it | Language code (e.g., "en", "it") or "auto" |
| `--device` | `-d` | auto | Device: auto, cpu, cuda |
| `--compute-type` | - | auto | Compute type: auto, int8, float16 |
| `--output-dir` | `-o` | transcriptions | Output directory |
| `--beam-size` | - | 2 | Beam size (lower = faster) |
| `--input-dir` | - | - | Process all audio files in directory |
| `--per-file-dir` | - | false | Create subfolder per input file |

Run `python script.py --help` for all available options.

---

## Project Structure

```
Voice2Knowledge/
├── backend/                 # Python FastAPI backend
│   ├── api/                # API routes (REST + WebSocket)
│   │   ├── routes.py       # REST endpoints (upload, download, history, export, models)
│   │   └── websocket.py    # WebSocket for real-time transcription
│   ├── core/               # Core business logic
│   │   ├── config.py       # Configuration (paths, settings)
│   │   ├── database.py     # SQLite database for history
│   │   ├── exporter.py     # PDF/DOCX export functionality
│   │   ├── model_manager.py# Model download/management
│   │   └── transcriber.py  # Audio transcription with faster-whisper
│   └── main.py             # FastAPI app entry point
│
├── frontend/               # React TypeScript frontend
│   ├── src/
│   │   ├── components/     # React UI components
│   │   │   ├── ChatMessage.tsx      # Chat bubble for messages
│   │   │   ├── EmptyState.tsx       # Welcome screen with upload prompt
│   │   │   ├── Header.tsx            # App header with settings access
│   │   │   ├── HistoryPanel.tsx     # Sidebar with past transcriptions
│   │   │   ├── ModelManager.tsx     # Modal for downloading Whisper models
│   │   │   ├── ProgressMessage.tsx  # Real-time transcription progress
│   │   │   ├── ResultMessage.tsx    # Display completed transcription
│   │   │   └── SettingsPanel.tsx    # Configuration sidebar
│   │   ├── hooks/          # Custom React hooks
│   │   │   ├── useTheme.ts           # System theme detection
│   │   │   └── useWebSocket.ts      # WebSocket connection management
│   │   ├── stores/         # Zustand state management
│   │   │   └── chatStore.ts # App state (messages, settings, etc.)
│   │   ├── types/          # TypeScript type definitions
│   │   │   └── index.ts
│   │   ├── lib/            # Utility functions
│   │   │   └── utils.ts    # Class name merging (cn function)
│   │   ├── App.tsx         # Main app component
│   │   ├── App.css         # App-specific styles
│   │   ├── index.css       # Global styles + CSS variables for theming
│   │   └── main.tsx        # React entry point
│   ├── public/             # Static assets
│   │   ├── icons.svg
│   │   └── favicon.svg
│   ├── package.json        # npm dependencies
│   ├── tailwind.config.js  # Tailwind CSS configuration with custom colors
│   ├── vite.config.ts      # Vite build configuration
│   ├── tsconfig.json       # TypeScript configuration
│   └── index.html          # HTML entry point
│
├── src/                    # Desktop app launcher
│   └── launcher.py         # pywebview launcher with splash screen
│
├── hooks/                  # PyInstaller hooks
│   └── hook-faster_whisper.py
│
├── app.spec               # PyInstaller configuration for building
├── build.sh              # Build script for creating executable
├── requirements.txt       # Python dependencies
├── script.py              # Standalone CLI transcription script
├── README.md              # This file
├── guide.md               # CLI usage quick reference
└── .gitignore             # Git ignore rules
```

---

## Tech Stack

### Backend

| Technology | Purpose |
|------------|---------|
| Python 3.9+ | Main runtime |
| FastAPI | REST API + WebSocket server |
| faster-whisper | Audio transcription (CTranslate2-based Whisper) |
| SQLite | Local database for transcription history |
| PyInstaller | Application packaging to executable |

### Frontend

| Technology | Purpose |
|------------|---------|
| React 19 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool and dev server |
| Tailwind CSS | Styling |
| Framer Motion | Smooth animations |
| Zustand | State management |
| Lucide React | Icons |

### Desktop

| Technology | Purpose |
|------------|---------|
| pywebview | Cross-platform webview wrapper |
| PyQt6 | Backend for webview on Linux |

---

## Troubleshooting

### Common Issues

#### "GTK cannot be loaded" (Linux)
```
ModuleNotFoundError: No module named 'gi'
```
**Solution**: Install PyQt6
```bash
pip install PyQt6
```

#### CUDA/GPU not detected
**Check NVIDIA drivers**:
```bash
nvidia-smi
```

**Verify PyTorch CUDA**:
```bash
python -c "import torch; print('CUDA available:', torch.cuda.is_available())"
```

If CUDA is available but not used, check that:
1. You're using the default "auto" device setting
2. Compute type is set to "auto" (will use float16 for GPU)

#### Model download fails
- Check your internet connection
- Verify HuggingFace is accessible: https://huggingface.co/Systran/faster-whisper
- Models are downloaded to: `~/.cache/huggingface/` (or platform-specific data dir)

#### Audio file not supported or "No such file or directory"
**Install ffmpeg**:
```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# macOS
brew install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
```

#### Port already in use (development mode)
If port 8000 is busy, specify a different port:
```bash
python -m uvicorn backend.main:app --reload --port 8001
```
Then update the frontend to connect to the new port in `src/hooks/useWebSocket.ts`.

#### Build fails with PyInstaller
- Ensure all dependencies in requirements.txt are installed
- Check that frontend/dist exists before building
- On Linux, you may need additional system packages for PyQt6

---

## Building from Source

To create a distributable executable:

```bash
# Build the frontend
cd frontend
npm run build
cd ..

# Build with PyInstaller
pyinstaller app.spec

# Output will be in dist/Voice2Knowledge/
```

The build script (`./build.sh`) automates this process on Linux/macOS.

---

## Architecture Notes

### How It Works

1. **Frontend** (React) handles the UI - displays upload button, settings, chat messages
2. **WebSocket** (FastAPI) maintains real-time connection for progress updates
3. **Transcription** (faster-whisper) runs in a thread to avoid blocking the server
4. **Database** (SQLite) stores transcription history locally
5. **Export** generates PDF/DOCX on-demand

### Data Storage

All data is stored locally:
- **Models**: `~/.cache/huggingface/` (HuggingFace cache)
- **Transcriptions**: Platform-specific app data directory
- **Database**: `<app_data>/voice2knowledge.db`

The app uses `platformdirs` to determine the correct paths on each operating system.

---

## License

MIT License

Copyright (c) 2024 Voice2Knowledge

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## Future Development

The application is designed to support future AI assistant capabilities:

- **Local LLM Integration**: Ask questions about your transcriptions using a local large language model
- **RAG Pipeline**: Semantic search across all your transcription history
- **Smart Context**: Automatically retrieve relevant past transcriptions when asking questions

These features are planned but not yet implemented.