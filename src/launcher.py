import os
import sys
import threading
import socket
import logging
import time
from pathlib import Path

# Handle frozen (PyInstaller) vs development mode
if getattr(sys, 'frozen', False):
    from pathlib import Path
    import platformdirs
    app_data = Path(platformdirs.user_data_dir("Voice2Knowledge", "Voice2Knowledge"))
    hf_home = app_data / "huggingface"
    os.environ["HF_HOME"] = str(hf_home)
    os.environ["TRANSFORMERS_CACHE"] = str(hf_home)
    os.environ["HF_HUB_DISABLE_SYMLINKS"] = "1"
    os.environ["HF_HUB_OFFLINE"] = "0"
else:
    # Development mode: add project root to sys.path
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import webview
import uvicorn
from contextlib import closing
from backend.core.config import APP_DATA_DIR

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

def find_free_port():
    with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as s:
        s.bind(('', 0))
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        return s.getsockname()[1]

def run_server(port):
    from backend.main import app
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")

def check_server_up(port):
    for _ in range(120):
        try:
            with socket.create_connection(('127.0.0.1', port), timeout=0.5):
                return True
        except (ConnectionRefusedError, socket.timeout):
            time.sleep(0.5)
    return False

def on_closed():
    logger.info("Window closed. Exiting...")
    os._exit(0)

class Api:
    def open_file_dialog(self):
        try:
            window = webview.windows[0]
            file_types = ('GGUF Files (*.gguf)', 'All files (*.*)')
            result = window.create_file_dialog(
                webview.FileDialog.OPEN, allow_multiple=False, file_types=file_types
            )
            if result and len(result) > 0:
                return result[0]
            return None
        except Exception as e:
            logger.error(f"Error in open_file_dialog: {e}")
            return None

def main():
    port = find_free_port()
    logger.info(f"Starting server on port {port}")

    server_thread = threading.Thread(target=run_server, args=(port,), daemon=True)
    server_thread.start()

    splash_html = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Voice2Knowledge</title>
        <style>
            :root {
                --background: #09090b;
                --bg-gradient-1: #0f172a;
                --bg-gradient-2: #2e1065;
                --bg-gradient-3: #1e1b4b;
                --foreground: #f5f5f5;
                --foreground-secondary: #a1a1aa;
                --mic-bg: rgba(255,255,255,0.1);
                --mic-border: rgba(255,255,255,0.2);
            }
            @media (prefers-color-scheme: light) {
                :root {
                    --background: #fdfdfd;
                    --bg-gradient-1: #e0f2fe;
                    --bg-gradient-2: #f3e8ff;
                    --bg-gradient-3: #ffedd5;
                    --foreground: #1a1a1a;
                    --foreground-secondary: #4b5563;
                    --mic-bg: rgba(255,255,255,0.8);
                    --mic-border: rgba(0,0,0,0.1);
                }
            }
            body {
                font-family: system-ui, -apple-system, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                background-color: var(--background);
                background-image: 
                    radial-gradient(at 0% 0%, var(--bg-gradient-1) 0px, transparent 50%),
                    radial-gradient(at 100% 0%, var(--bg-gradient-2) 0px, transparent 50%),
                    radial-gradient(at 100% 100%, var(--bg-gradient-3) 0px, transparent 50%),
                    radial-gradient(at 0% 100%, var(--bg-gradient-1) 0px, transparent 50%);
                background-size: 200% 200%;
                animation: gradientFlow 15s ease infinite;
                color: var(--foreground);
            }
            @keyframes gradientFlow {
                0% { background-position: 0% 0%; }
                25% { background-position: 100% 0%; }
                50% { background-position: 100% 100%; }
                75% { background-position: 0% 100%; }
                100% { background-position: 0% 0%; }
            }
            .logo-container {
                position: relative;
                margin-bottom: 32px;
            }
            .bot-box {
                width: 96px;
                height: 96px;
                border-radius: 24px;
                background: linear-gradient(135deg, #007aff 0%, #0252c6 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 0 40px rgba(0,122,255,0.4);
                position: relative;
                z-index: 10;
                animation: bounce 2s ease-in-out infinite;
            }
            .mic-box {
                position: absolute;
                bottom: -8px;
                right: -8px;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: var(--mic-bg);
                backdrop-filter: blur(16px);
                border: 1px solid var(--mic-border);
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                z-index: 20;
                animation: scaleBounce 2s ease-in-out infinite;
            }
            .pulse-glow {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 150px;
                height: 150px;
                background: rgba(0,122,255,0.2);
                border-radius: 50%;
                filter: blur(40px);
                z-index: 1;
                animation: pulse 2s ease-in-out infinite;
            }
            @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
            }
            @keyframes scaleBounce {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }
            @keyframes pulse {
                0%, 100% { opacity: 0.5; }
                50% { opacity: 1; }
            }
            h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 8px; letter-spacing: -0.025em; }
            p { color: var(--foreground-secondary); font-size: 0.875rem; text-align: center; font-weight: 500; }
            svg { color: var(--foreground); }
            .bot-box svg { color: white; }
            .mic-box svg { color: #007aff; }
        </style>
    </head>
    <body>
        <div class="logo-container">
            <div class="pulse-glow"></div>
            <div class="bot-box">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
            </div>
            <div class="mic-box">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
            </div>
        </div>
        <h1>Voice2Knowledge</h1>
        <p>Starting local server...</p>
    </body>
    </html>
    """

    window = webview.create_window('Voice2Knowledge', html=splash_html, width=1000, height=800, js_api=Api())
    window.events.closed += on_closed

    def redirect_when_ready():
        if check_server_up(port):
            logger.info("Server ready, loading app...")
            window.load_url(f"http://127.0.0.1:{port}")
        else:
            logger.error("Server failed to start")
            window.evaluate_js("document.body.innerHTML = '<h1 style=\"color:#dc2626\">Failed to start server. Check terminal for errors.</h1>'")

    threading.Thread(target=redirect_when_ready, daemon=True).start()

    logger.info("Starting pywebview...")
    webview.start(gui="qt")

if __name__ == '__main__':
    main()