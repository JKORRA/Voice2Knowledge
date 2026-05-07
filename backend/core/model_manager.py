import os
import asyncio
from pathlib import Path
import logging
from faster_whisper import download_model

from backend.core.config import settings, APP_DATA_DIR

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ModelManager:
    @staticmethod
    def is_model_downloaded(model_size: str) -> bool:
        # Check if model exists in HF_HOME cache
        # faster-whisper uses huggingface_hub snapshots
        # We can just try to load local_files_only=True
        try:
            download_model(model_size, local_files_only=True)
            return True
        except Exception:
            return False

    @staticmethod
    async def download_model_async(model_size: str, progress_callback=None):
        """
        Downloads the model asynchronously. 
        Note: huggingface_hub doesn't natively expose an async progress callback easily 
        without deeply hooking into fsspec/requests, so we just run it in a thread.
        """
        logger.info(f"Starting download for model '{model_size}'...")
        
        def _download():
            # In a real GUI we might want to capture stderr to get tqdm progress,
            # but for now we just block and download.
            return download_model(model_size)
            
        try:
            # Let the UI know we've started
            if progress_callback:
                await progress_callback(0, f"Downloading model '{model_size}' (this may take a while)...")
            
            # Download in background thread
            model_path = await asyncio.to_thread(_download)
            
            # Let UI know we finished
            if progress_callback:
                await progress_callback(100, f"Model '{model_size}' downloaded successfully.")
                
            return model_path
        except Exception as e:
            logger.error(f"Error downloading model: {e}")
            raise e

model_manager = ModelManager()
