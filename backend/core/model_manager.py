import os
import asyncio
from pathlib import Path
import logging
import huggingface_hub
from faster_whisper.utils import _MODELS

from backend.core.config import settings
from backend.core.download_progress import ProgressContext, CustomTqdm

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ModelManager:
    @staticmethod
    def is_model_downloaded(model_size: str) -> bool:
        repo_id = _MODELS.get(model_size, model_size)
        try:
            huggingface_hub.snapshot_download(
                repo_id=repo_id,
                local_files_only=True,
                allow_patterns=["config.json", "preprocessor_config.json", "model.bin", "tokenizer.json", "vocabulary.*"]
            )
            return True
        except Exception:
            return False

    @staticmethod
    async def download_model_async(model_size: str, progress_callback=None):
        """
        Downloads the model asynchronously. 
        progress_callback should be a synchronous thread-safe function taking a single integer argument (percentage).
        """
        logger.info(f"Starting download for model '{model_size}'...")
        repo_id = _MODELS.get(model_size, model_size)
        
        def _download():
            with ProgressContext(progress_callback):
                return huggingface_hub.snapshot_download(
                    repo_id=repo_id,
                    allow_patterns=["config.json", "preprocessor_config.json", "model.bin", "tokenizer.json", "vocabulary.*"],
                    tqdm_class=CustomTqdm
                )
            
        try:
            model_path = await asyncio.to_thread(_download)
            return model_path
        except Exception as e:
            logger.error(f"Error downloading model: {e}")
            raise e

model_manager = ModelManager()
