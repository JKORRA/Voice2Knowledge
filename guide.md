# How to use the script

## Basic usage
Activate the virtual environment and run the script with your audio file:
```bash
source venv/bin/activate
python script.py "audio.wav"
```

## Custom options
```bash
python script.py "audio.wav" -m small -l it -o output_folder --beam-size 2
```

## Options:
- `-m`, `--model` : Whisper model size (base, small, medium, large-v3). Default is `small` (best balance for CPU).
- `-l`, `--language` : Language code (e.g., it, en). Default is `it`.
- `-o`, `--output-dir` : Output directory. Default is `transcriptions`.
- `-d`, `--device` : Device to run on (cpu, cuda). Default is `cpu`.
- `--compute-type` : Compute precision (int8, float16). Default is `int8` (highly optimized for CPU).
- `--beam-size` : Beam size for transcription search. Lower is faster. Default is `2`.

## Output Files
For every audio file processed, the script will generate one file in the output directory:
- `[filename]_clean.txt`: Pure text without timestamps, ready for reading or processing.