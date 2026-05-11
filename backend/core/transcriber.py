import time
import logging
import asyncio
from pathlib import Path
from faster_whisper import WhisperModel

logger = logging.getLogger(__name__)

class LectureTranscriber:
    def __init__(self, model_size="small", device="cpu", compute_type="int8", fallback_to_cpu=True):
        logger.info(
            f"Loading faster-whisper '{model_size}' model (device={device}, compute_type={compute_type})..."
        )
        self._device = device
        self._compute_type = compute_type
        try:
            self.model = WhisperModel(model_size, device=device, compute_type=compute_type)
        except RuntimeError as e:
            cuda_err = str(e)
            if fallback_to_cpu and device == "cuda" and "CUDA" in cuda_err:
                logger.warning(f"CUDA failed ({cuda_err}), falling back to CPU with int8...")
                self._device = "cpu"
                self._compute_type = "int8"
                self.model = WhisperModel(model_size, device="cpu", compute_type="int8")
            else:
                raise

    def format_timestamp(self, seconds):
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = seconds % 60
        return f"{hours:02d}:{minutes:02d}:{secs:06.3f}"

    def transcribe(
        self,
        audio_path: str,
        output_dir: str,
        language: str = None,
        beam_size: int = 2,
        progress_callback=None,
        cancel_event=None
    ):
        audio_path_obj = Path(audio_path)
        output_path_obj = Path(output_dir)
        output_path_obj.mkdir(parents=True, exist_ok=True)

        base_name = audio_path_obj.stem
        clean_txt_path = output_path_obj / f"{base_name}_clean.txt"

        logger.info(f"Starting transcription for: {audio_path_obj.name}")
        start_time = time.time()

        segments, info = self.model.transcribe(
            str(audio_path),
            beam_size=beam_size,
            language=language,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=1000),
        )



        last_flush_time = 0.0
        processed_seconds = 0.0

        with open(clean_txt_path, "w", encoding="utf-8") as f_clean:

            for segment in segments:
                # Check for cancellation
                if cancel_event and cancel_event.is_set():
                    logger.info(f"Transcription cancelled for {audio_path_obj.name}")
                    break

                text = segment.text.strip()
                if not text:
                    continue

                f_clean.write(f"{text} ")

                # Update progress
                processed_seconds = segment.end
                if progress_callback and info.duration > 0:
                    percent = min(100, int((processed_seconds / info.duration) * 100))
                    progress_callback(percent, text)

                # Periodic flush
                if segment.end - last_flush_time >= 30:
                    f_clean.flush()
                    last_flush_time = segment.end

        # If cancelled, we might want to return a specific flag or just paths
        if cancel_event and cancel_event.is_set():
            return None, None

        elapsed = time.time() - start_time
        logger.info(f"Transcription complete in {elapsed / 60:.2f} minutes.")

        metadata = {
            "duration": info.duration if hasattr(info, 'duration') else None,
            "language": info.language if hasattr(info, 'language') else None,
            "language_probability": info.language_probability if hasattr(info, 'language_probability') else None,
        }

        return str(clean_txt_path), metadata


class TranscriberWrapper:
    def __init__(self):
        self._lock = asyncio.Lock()
        self._model = None
        self._current_model_size = None
        self._current_device = None
        self._current_compute_type = None

    def _ensure_model_loaded(self, model_size, device, compute_type):
        if (
            self._model is None
            or self._current_model_size != model_size
            or self._current_device != device
            or self._current_compute_type != compute_type
        ):
            self._model = LectureTranscriber(
                model_size=model_size,
                device=device,
                compute_type=compute_type
            )
            self._current_model_size = model_size
            self._current_device = device
            self._current_compute_type = compute_type

    async def transcribe(self, audio_path, output_dir, model_size, language, device, compute_type, beam_size, progress_callback=None, cancel_event=None):
        async with self._lock:
            # Ensure model is loaded on the current thread context just before use,
            # but since faster-whisper loads in __init__ we do it in a thread to avoid blocking.
            await asyncio.to_thread(self._ensure_model_loaded, model_size, device, compute_type)

            return await asyncio.to_thread(
                self._model.transcribe,
                audio_path,
                output_dir,
                language,
                beam_size,
                progress_callback,
                cancel_event
            )

    async def unload_model(self):
        async with self._lock:
            if self._model is not None:
                logger.info("Unloading faster-whisper model to free memory...")
                self._model = None
                self._current_model_size = None
                self._current_device = None
                self._current_compute_type = None
                import gc
                gc.collect()
                try:
                    from backend.core.gpu_utils import clear_cuda_cache
                    clear_cuda_cache()
                except Exception:
                    pass

transcriber_instance = TranscriberWrapper()
