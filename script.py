import os
import argparse
import logging
import time
from pathlib import Path
import torch
from faster_whisper import WhisperModel
from tqdm import tqdm

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)


class LectureTranscriber:
    def __init__(self, model_size="small", device="cpu", compute_type="int8"):
        logging.info(
            f"Loading faster-whisper '{model_size}' model (device={device}, compute_type={compute_type})..."
        )
        self.model = WhisperModel(model_size, device=device, compute_type=compute_type)

    def transcribe(
        self, audio_path: str, output_dir: str, language: str = "it", beam_size: int = 2
    ):
        audio_path_obj = Path(audio_path)
        output_path_obj = Path(output_dir)
        output_path_obj.mkdir(parents=True, exist_ok=True)

        base_name = audio_path_obj.stem
        clean_txt_path = output_path_obj / f"{base_name}_clean.txt"

        logging.info(f"Starting transcription for: {audio_path_obj.name}")
        start_time = time.time()

        segments, info = self.model.transcribe(
            str(audio_path),
            beam_size=beam_size,
            language=language,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=1000),
        )

        logging.info(
            f"Detected language '{info.language}' (Probability: {info.language_probability:.2f})"
        )
        if info.language_probability < 0.7:
            logging.warning(
                f"Low confidence in language detection. Might not be {language}."
            )

        pbar = tqdm(
            total=info.duration,
            unit="s",
            desc=f"Transcribing {audio_path_obj.name}",
            dynamic_ncols=True,
            bar_format="{l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}]",
        )
        pbar.n = 0
        pbar.refresh()

        with open(clean_txt_path, "w", encoding="utf-8") as f_clean:
            for segment in segments:
                text = segment.text.strip()
                if not text:
                    continue

                f_clean.write(f"{text} ")

                delta = segment.end - pbar.n
                if delta > 0:
                    pbar.update(delta)

        pbar.close()

        elapsed = time.time() - start_time
        logging.info(f"Transcription complete in {elapsed / 60:.2f} minutes.")
        logging.info(f"Output saved to:\n  - {clean_txt_path}")

        return str(clean_txt_path)


def gather_audio_files(args):
    """Collect files from command-line arguments or a directory."""
    audio_exts = {".wav", ".mp3", ".m4a", ".flac", ".ogg"}
    files = []

    if args.input_dir:
        folder = Path(args.input_dir)
        if not folder.is_dir():
            raise NotADirectoryError(f"Not a directory: {args.input_dir}")
        for ext in audio_exts:
            files.extend(folder.glob(f"*{ext}"))
        files = sorted(files)
    else:
        files = [Path(f) for f in args.audio_files]

    return list(dict.fromkeys([f for f in files if f.exists()]))


def main():
    parser = argparse.ArgumentParser(
        description="Lightweight Audio to Text transcription with faster-whisper"
    )
    parser.add_argument(
        "audio_files", nargs="*", help="Audio file(s) – ignored if --input-dir is used"
    )
    parser.add_argument("--input-dir", help="Process all audio files in this folder")
    parser.add_argument(
        "-o", "--output-dir", default="transcriptions", help="Output directory"
    )
    parser.add_argument(
        "--per-file-dir",
        action="store_true",
        help="Create a subfolder per input file inside output-dir",
    )
    parser.add_argument(
        "-m",
        "--model",
        default="small",
        help="Whisper model (base, small, medium, large-v3)",
    )
    parser.add_argument(
        "-l", "--language", default="it", help="Language code (e.g., it, en)"
    )
    parser.add_argument(
        "-d", "--device", default="auto", help="Device: auto, cpu, cuda"
    )
    parser.add_argument(
        "--compute-type", default="auto", help="Compute type: auto, int8, float16"
    )
    parser.add_argument(
        "--beam-size",
        type=int,
        default=2,
        help="Beam size (lower is faster, default: 2)",
    )

    args = parser.parse_args()

    if args.device == "auto":
        device = "cuda" if torch.cuda.is_available() else "cpu"
    else:
        device = args.device

    if args.compute_type == "auto":
        compute_type = "float16" if device == "cuda" else "int8"
    else:
        compute_type = args.compute_type

    try:
        audio_files = gather_audio_files(args)
    except Exception as e:
        logging.error(f"Error finding audio files: {e}")
        return

    if not audio_files:
        logging.error("No audio files found.")
        return

    missing = [f for f in audio_files if not f.exists()]
    if missing:
        logging.error(f"Audio file(s) not found: {', '.join(str(f) for f in missing)}")
        return

    logging.info(f"Found {len(audio_files)} file(s) to process")
    logging.info(f"Using device={device}, compute_type={compute_type}")

    transcriber = LectureTranscriber(
        model_size=args.model, device=device, compute_type=compute_type
    )

    file_pbar = tqdm(total=len(audio_files), desc="Total progress", unit="file")

    for audio_file in audio_files:
        out_dir = args.output_dir
        if args.per_file_dir:
            out_dir = str(Path(args.output_dir) / audio_file.stem)

        try:
            transcriber.transcribe(
                audio_path=str(audio_file),
                output_dir=out_dir,
                language=args.language,
                beam_size=args.beam_size,
            )
        except Exception as e:
            logging.error(f"Failed to transcribe {audio_file.name}: {e}")

        file_pbar.update(1)

    file_pbar.close()
    logging.info("All files processed.")


if __name__ == "__main__":
    main()
