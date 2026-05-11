import threading
from huggingface_hub.utils import _tqdm
import huggingface_hub

_lock = threading.Lock()
_active_callback = None
_bars = {}

class CustomTqdm(_tqdm.tqdm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        with _lock:
            _bars[id(self)] = self

    def update(self, n=1):
        super().update(n)
        with _lock:
            if _active_callback:
                total_bytes = sum(b.total for b in _bars.values() if b.total)
                downloaded_bytes = sum(b.n for b in _bars.values() if b.total)
                if total_bytes > 0:
                    pct = min(100, int((downloaded_bytes / total_bytes) * 100))
                    _active_callback(pct)

    def close(self):
        super().close()
        with _lock:
            _bars.pop(id(self), None)

# Monkeypatch huggingface_hub's tqdm
_tqdm.tqdm = CustomTqdm

class ProgressContext:
    """
    Context manager to inject a progress callback into the CustomTqdm globally,
    handling multithreaded downloads from huggingface_hub.
    """
    def __init__(self, callback):
        self.callback = callback

    def __enter__(self):
        global _active_callback
        with _lock:
            _bars.clear()
            _active_callback = self.callback
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        global _active_callback
        with _lock:
            _active_callback = None
            _bars.clear()
