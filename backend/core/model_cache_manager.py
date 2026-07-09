import shutil
import logging
from pathlib import Path

from faster_whisper.utils import _MODELS as WHISPER_MODELS

from backend.core.config import APP_DATA_DIR
from backend.core.llm_manager import LLM_MODELS

logger = logging.getLogger(__name__)

AVAILABLE_MODELS = ['tiny', 'base', 'small', 'medium', 'large-v3']
AVAILABLE_CHAT_MODELS = ['qwen3.5-2b', 'qwen3.5-4b', 'qwen3.5-9b']


def get_hf_cache_dir() -> Path:
    return APP_DATA_DIR / "huggingface" / "hub"


def _get_model_dir(model_name: str, model_type: str) -> Path | None:
    base = get_hf_cache_dir()
    if not base.exists():
        return None

    if model_type == "transcription":
        repo_id = WHISPER_MODELS.get(model_name, f"Systran/faster-whisper-{model_name}")
        dir_name = "models--" + repo_id.replace("/", "--")
    elif model_type == "chat":
        model_info = LLM_MODELS.get(model_name)
        if not model_info:
            return None
        repo_id = model_info["repo_id"]
        dir_name = "models--" + repo_id.replace("/", "--")
    else:
        return None

    return base / dir_name


def delete_cached_model(model_name: str, model_type: str) -> bool:
    model_dir = _get_model_dir(model_name, model_type)
    if model_dir is None or not model_dir.exists():
        return False

    shutil.rmtree(model_dir)
    logger.info(f"Deleted cached model: {model_name} ({model_type})")
    return True


def get_cached_models() -> dict[str, list[str]]:
    base = get_hf_cache_dir()
    if not base.exists():
        return {"transcription": [], "chat": []}

    cached = {"transcription": [], "chat": []}

    for model in AVAILABLE_MODELS:
        repo_id = WHISPER_MODELS.get(model, f"Systran/faster-whisper-{model}")
        dir_name = "models--" + repo_id.replace("/", "--")
        if (base / dir_name).exists():
            cached["transcription"].append(model)

    for model in AVAILABLE_CHAT_MODELS:
        model_info = LLM_MODELS.get(model)
        if model_info:
            repo_id = model_info["repo_id"]
            dir_name = "models--" + repo_id.replace("/", "--")
            if (base / dir_name).exists():
                cached["chat"].append(model)

    return cached
