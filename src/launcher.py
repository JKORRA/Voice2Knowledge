import os
import sys
import threading
import socket
import logging
import time
from pathlib import Path

# Handle frozen (PyInstaller) vs development mode
if getattr(sys, 'frozen', False):
    # When frozen, reset HuggingFace cache to user directory
    # to avoid looking inside the bundle for cached models
    hf_home = os.path.expanduser("~/.cache/huggingface")
    os.environ["HF_HOME"] = hf_home
    os.environ["TRANSFORMERS_CACHE"] = hf_home
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
            body {
                font-family: system-ui, -apple-system, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #007aff 0%, #0252c6 100%);
                color: white;
            }
            .spinner {
                width: 50px;
                height: 50px;
                border: 4px solid rgba(255,255,255,0.3);
                border-top-color: white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 24px;
            }
            @keyframes spin { to { transform: rotate(360deg); } }
            h1 { font-size: 1.5rem; font-weight: 600; margin-bottom: 12px; }
            p { color: rgba(255,255,255,0.8); font-size: 0.9rem; text-align: center; max-width: 80%; line-height: 1.5; }
        </style>
    </head>
    <body>
        <div class="spinner"></div>
        <h1>Voice2Knowledge</h1>
        <p>Loading application...</p>
    </body>
    </html>
    """

    window = webview.create_window('Voice2Knowledge', html=splash_html, width=1000, height=800)
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