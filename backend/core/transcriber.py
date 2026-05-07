import time
import logging
import asyncio
from pathlib import Path
import torch
from faster_whisper import WhisperModel

logger = logging.getLogger(__name__)

class LectureTranscriber:
    def __init__(self, model_size="small", device="cpu", compute_type="int8"):
        logger.info(
            f"Loading faster-whisper '{model_size}' model (device={device}, compute_type={compute_type})..."
        )
        self.model = WhisperModel(model_size, device=device, compute_type=compute_type)

    def format_timestamp(self, seconds):
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = seconds % 60
        return f"{hours:02d}:{minutes:02d}:{secs:06.3f}"

    def transcribe(
        self,
        audio_path: str,
        output_dir: str,
        language: str = "it",
        beam_size: int = 2,
        progress_callback=None,
        cancel_event=None
    ):
        audio_path_obj = Path(audio_path)
        output_path_obj = Path(output_dir)
        output_path_obj.mkdir(parents=True, exist_ok=True)

        base_name = audio_path_obj.stem
        clean_txt_path = output_path_obj / f"{base_name}_clean.txt"
        timed_vtt_path = output_path_obj / f"{base_name}_timed.vtt"

        logger.info(f"Starting transcription for: {audio_path_obj.name}")
        start_time = time.time()

        segments, info = self.model.transcribe(
            str(audio_path),
            beam_size=beam_size,
            language=language,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=1000),
        )

        logger.info(
            f"Detected language '{info.language}' (Probability: {info.language_probability:.2f})"
        )

        last_flush_time = 0.0
        processed_seconds = 0.0

        with (
            open(clean_txt_path, "w", encoding="utf-8") as f_clean,
            open(timed_vtt_path, "w", encoding="utf-8") as f_timed,
        ):
            f_timed.write("WEBVTT\n\n")

            for segment in segments:
                # Check for cancellation
                if cancel_event and cancel_event.is_set():
                    logger.info(f"Transcription cancelled for {audio_path_obj.name}")
                    break

                text = segment.text.strip()
                if not text:
                    continue

                f_clean.write(f"{text} ")

                start_formatted = self.format_timestamp(segment.start)
                end_formatted = self.format_timestamp(segment.end)

                f_timed.write(f"{start_formatted} --> {end_formatted}\n")
                f_timed.write(f"{text}\n\n")

                # Update progress
                processed_seconds = segment.end
                if progress_callback and info.duration > 0:
                    percent = min(100, int((processed_seconds / info.duration) * 100))
                    progress_callback(percent, text)

                # Periodic flush
                if segment.end - last_flush_time >= 30:
                    f_clean.flush()
                    f_timed.flush()
                    last_flush_time = segment.end

        # If cancelled, we might want to return a specific flag or just paths
        if cancel_event and cancel_event.is_set():
            return None, None, None

        elapsed = time.time() - start_time
        logger.info(f"Transcription complete in {elapsed / 60:.2f} minutes.")

        metadata = {
            "duration": info.duration if hasattr(info, 'duration') else None,
            "language": info.language if hasattr(info, 'language') else None,
            "language_probability": info.language_probability if hasattr(info, 'language_probability') else None,
        }

        return str(clean_txt_path), str(timed_vtt_path), metadata


class TranscriberWrapper:
    def __init__(self):
        self._lock = asyncio.Lock()
        self._model = None
        self._current_model_size = None

    def _ensure_model_loaded(self, model_size, device, compute_type):
        if self._model is None or self._current_model_size != model_size:
            self._model = LectureTranscriber(
                model_size=model_size,
                device=device,
                compute_type=compute_type
            )
            self._current_model_size = model_size

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
                import gc
                gc.collect()
                try:
                    import torch
                    if torch.cuda.is_available():
                        torch.cuda.empty_cache()
                except ImportError:
                    pass

transcriber_instance = TranscriberWrapper()
