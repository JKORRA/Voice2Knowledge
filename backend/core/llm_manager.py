import os
import asyncio
import logging
import threading
import gc
from pathlib import Path

from backend.core.config import settings, APP_DATA_DIR

logger = logging.getLogger(__name__)

LLM_MODELS = {
    "qwen3.5-2b": {"repo_id": "unsloth/Qwen3.5-2B-GGUF", "filename": "Qwen3.5-2B-Q4_K_M.gguf"},
    "qwen3.5-4b": {"repo_id": "unsloth/Qwen3.5-4B-GGUF", "filename": "Qwen3.5-4B-Q4_K_M.gguf"},
    "qwen3.5-9b": {"repo_id": "unsloth/Qwen3.5-9B-GGUF", "filename": "Qwen3.5-9B-Q4_K_M.gguf"},
}

class LLMManager:
    def __init__(self):
        self._lock = asyncio.Lock()
        self._model = None
        self.current_model_id = "qwen3.5-2b"
        self.repo_id = LLM_MODELS[self.current_model_id]["repo_id"]
        self.filename = LLM_MODELS[self.current_model_id]["filename"]
        
    def is_model_downloaded(self, model_id: str = None) -> bool:
        """Check if the GGUF model is cached."""
        model_id = model_id or self.current_model_id
        model_info = LLM_MODELS.get(model_id, LLM_MODELS["qwen3.5-2b"])
        repo_id = model_info["repo_id"]
        filename = model_info["filename"]
        try:
            from huggingface_hub import hf_hub_download
            # Check without downloading
            model_path = hf_hub_download(
                repo_id=repo_id,
                filename=filename,
                local_files_only=True
            )
            return bool(model_path)
        except Exception:
            return False

    async def download_model_async(self, model_id: str = None, progress_callback=None):
        """Download the model via huggingface_hub."""
        model_id = model_id or self.current_model_id
        model_info = LLM_MODELS.get(model_id, LLM_MODELS["qwen3.5-2b"])
        repo_id = model_info["repo_id"]
        filename = model_info["filename"]
        
        logger.info(f"Downloading LLM model {repo_id}...")
        
        def _download():
            from huggingface_hub import hf_hub_download
            from backend.core.download_progress import ProgressContext
            with ProgressContext(progress_callback):
                return hf_hub_download(
                    repo_id=repo_id,
                    filename=filename,
                )

        try:
            model_path = await asyncio.to_thread(_download)
            return model_path
        except Exception as e:
            logger.error(f"Error downloading LLM: {e}")
            raise e

    def _load_model(self):
        """Internal synchronous load model."""
        if self._model is not None:
            return
            
        from huggingface_hub import hf_hub_download
        from llama_cpp import Llama
        from backend.core.gpu_utils import is_cuda_available

        # Force download/get path
        model_path = hf_hub_download(repo_id=self.repo_id, filename=self.filename)
        
        # Check for GPU
        n_gpu_layers = 0
        if is_cuda_available():
            logger.info("CUDA detected. Enabling GPU offloading for LLM.")
            n_gpu_layers = -1  # Offload all layers to GPU
            
        logger.info("Loading LLM into memory...")
        self._model = Llama(
            model_path=model_path,
            n_gpu_layers=n_gpu_layers,
            n_ctx=8192,  # Large context for transcriptions
            verbose=False,
        )

    async def load_model(self):
        async with self._lock:
            await asyncio.to_thread(self._load_model)

    async def unload_model(self):
        async with self._lock:
            if self._model is not None:
                logger.info("Unloading LLM from memory...")
                self._model = None
                gc.collect()
                try:
                    from backend.core.gpu_utils import clear_cuda_cache
                    clear_cuda_cache()
                except Exception:
                    pass

    async def generate_stream(self, messages: list, cancel_event: threading.Event, chat_model: str = "qwen3.5-2b"):
        """Generate response via streaming."""
        async with self._lock:
            if chat_model and chat_model != self.current_model_id:
                if self._model is not None:
                    logger.info("Unloading current LLM from memory to switch models...")
                    self._model = None
                    gc.collect()
                    try:
                        from backend.core.gpu_utils import clear_cuda_cache
                        clear_cuda_cache()
                    except Exception:
                        pass
                
                self.current_model_id = chat_model
                model_info = LLM_MODELS.get(chat_model, LLM_MODELS["qwen3.5-2b"])
                self.repo_id = model_info["repo_id"]
                self.filename = model_info["filename"]

            if self._model is None:
                await asyncio.to_thread(self._load_model)


            logger.info("Starting LLM stream generation...")
            
            def _generate():
                # Llama-cpp-python generator
                stream = self._model.create_chat_completion(
                    messages=messages,
                    stream=True,
                    temperature=0.3,
                    max_tokens=1024,
                )
                for chunk in stream:
                    if cancel_event and cancel_event.is_set():
                        logger.info("LLM Generation cancelled.")
                        break
                    
                    delta = chunk['choices'][0]['delta']
                    if 'content' in delta:
                        yield delta['content']

            # We iterate over the generator and yield to the async context
            # To do this cleanly without blocking the event loop:
            # We can run the iteration in a thread or just run the whole create_chat_completion in a thread.
            # Llama.create_chat_completion blocks. We need to be careful.
            
            # Since llama_cpp blocks the thread, we should yield from an async queue populated by a thread.
            queue = asyncio.Queue()
            loop = asyncio.get_running_loop()
            
            def producer():
                try:
                    for token in _generate():
                        # Use threadsafe put
                        asyncio.run_coroutine_threadsafe(queue.put(("token", token)), loop)
                    asyncio.run_coroutine_threadsafe(queue.put(("done", None)), loop)
                except Exception as e:
                    logger.error(f"Error in LLM producer thread: {e}")
                    asyncio.run_coroutine_threadsafe(queue.put(("error", str(e))), loop)

            thread = threading.Thread(target=producer, daemon=True)
            thread.start()

            while True:
                msg_type, content = await queue.get()
                if msg_type == "token":
                    yield content
                elif msg_type == "done":
                    break
                elif msg_type == "error":
                    raise RuntimeError(content)

llm_manager = LLMManager()
