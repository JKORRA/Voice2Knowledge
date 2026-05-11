"""
Lightweight GPU/CUDA detection utilities.

Replaces the heavy `torch` dependency (~2 GB) with ctranslate2's built-in
device detection for CUDA availability, and a direct ctypes call for
clearing CUDA cache. This keeps the PyInstaller bundle under GitHub's
2 GB release asset limit.
"""
import os
import logging

logger = logging.getLogger(__name__)


def is_cuda_available() -> bool:
    """Check if CUDA is actually usable (not just present)."""
    try:
        import ctranslate2
        supported = ctranslate2.get_supported_compute_types("cuda")
        if supported:
            try:
                ctranslate2.Ct2FastWhisper("small", device="cuda", compute_type="float16")
                return True
            except Exception:
                pass
    except Exception:
        pass

    try:
        import subprocess
        result = subprocess.run(
            ["nvidia-smi"], capture_output=True, timeout=5
        )
        return result.returncode == 0
    except Exception:
        pass

    return False


def get_cuda_device_name() -> str | None:
    """Get the name of the first CUDA device, if available."""
    try:
        import subprocess
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=name", "--format=csv,noheader,nounits"],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip().split("\n")[0]
    except Exception:
        pass
    return None


def clear_cuda_cache():
    """Attempt to free CUDA memory without requiring torch."""
    try:
        import ctypes
        # Try to load the CUDA runtime library and call cudaDeviceReset
        for lib_name in ["libcudart.so", "cudart64_12.dll", "cudart64_11.dll"]:
            try:
                cudart = ctypes.CDLL(lib_name)
                cudart.cudaDeviceReset()
                logger.info("CUDA cache cleared via cudart.")
                return
            except OSError:
                continue
    except Exception as e:
        logger.debug(f"Could not clear CUDA cache: {e}")
