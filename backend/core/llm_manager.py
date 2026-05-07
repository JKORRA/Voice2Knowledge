import os
import asyncio
import logging
import threading
import gc
from pathlib import Path

from backend.core.config import settings, APP_DATA_DIR

logger = logging.getLogger(__name__)

class LLMManager:
    def __init__(self):
        self._lock = asyncio.Lock()
        self._model = None
        # Use a safe default modern GGUF. We use Qwen2.5-3B as it's the current state of the art tiny model.
        # It's ~2.3GB and runs perfectly on 8GB machines.
        self.repo_id = "Qwen/Qwen2.5-3B-Instruct-GGUF"
        self.filename = "qwen2.5-3b-instruct-q4_k_m.gguf"
        
    def is_model_downloaded(self) -> bool:
        """Check if the GGUF model is cached."""
        try:
            from huggingface_hub import hf_hub_download
            # Check without downloading
            model_path = hf_hub_download(
                repo_id=self.repo_id,
                filename=self.filename,
                local_files_only=True
            )
            return bool(model_path)
        except Exception:
            return False

    async def download_model_async(self, progress_callback=None):
        """Download the model via huggingface_hub."""
        logger.info(f"Downloading LLM model {self.repo_id}...")
        
        def _download():
            from huggingface_hub import hf_hub_download
            return hf_hub_download(
                repo_id=self.repo_id,
                filename=self.filename,
            )

        try:
            if progress_callback:
                await progress_callback(0, f"Downloading LLM model (this may take a few minutes)...")
                
            model_path = await asyncio.to_thread(_download)
            
            if progress_callback:
                await progress_callback(100, "LLM model downloaded successfully.")
                
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
        import torch

        # Force download/get path
        model_path = hf_hub_download(repo_id=self.repo_id, filename=self.filename)
        
        # Check for GPU
        n_gpu_layers = 0
        if torch.cuda.is_available():
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
                    import torch
                    if torch.cuda.is_available():
                        torch.cuda.empty_cache()
                except ImportError:
                    pass

    async def generate_stream(self, system_prompt: str, user_prompt: str, cancel_event: threading.Event):
        """Generate response via streaming."""
        async with self._lock:
            if self._model is None:
                await asyncio.to_thread(self._load_model)

            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]

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
