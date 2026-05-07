# AudioToText

A lightweight, robust, and hardware-adaptive audio transcription tool powered by `faster-whisper`. 

It is designed to transcribe multiple audio files (e.g. work calls, lectures) efficiently in a single run, automatically utilizing your GPU if available, or gracefully falling back to CPU.

## Features

- **Batch Processing**: Process multiple files or an entire folder of audio files with a single command. The model is loaded only once, drastically reducing overhead.
- **Hardware Auto-Detection**: Automatically detects if a CUDA-enabled GPU is available. 
  - GPU: Uses `cuda` with `float16` precision for maximum speed.
  - CPU: Uses `cpu` with `int8` precision for efficiency.
- **Robust Error Handling**: If one file in a batch fails to transcribe, the script logs the error and continues with the next file.
- **Detailed Progress Tracking**: Features nested progress bars showing both the overall batch progress and the segment-level progress for the current file.
- **Dual Output Formats**: Generates both a clean text transcript (`_clean.txt`) and a timestamped WebVTT file (`_timed.vtt`) for each audio file.
- **Long Audio Support**: Flushes output to disk every 30 seconds to ensure data isn't lost if interrupted.
- **Language Detection**: Automatically detects the language and warns you if confidence is low.

## Requirements

- Python 3.9+
- [faster-whisper](https://github.com/SYSTRAN/faster-whisper)
- `torch`
- `tqdm`

Install dependencies:
```bash
pip install faster-whisper torch tqdm
```

## Usage

You can run the script by passing individual files, or by specifying an input directory.

### Single File
```bash
python script.py my_audio.wav
```

### Multiple Files (Batch)
Pass as many files as you want. The model will load once and process them sequentially.
```bash
python script.py call1.wav call2.mp3 call3.m4a -o results/
```

### Entire Directory
Process all supported audio files (`.wav`, `.mp3`, `.m4a`, `.flac`, `.ogg`) in a specific folder.
```bash
python script.py --input-dir ./recordings/ -o results/
```

### Organize Outputs into Subfolders
If you want the outputs for each audio file to be placed in their own separate subdirectories within the output folder, use the `--per-file-dir` flag:
```bash
python script.py --input-dir ./recordings/ -o results/ --per-file-dir
```

### Advanced Options

By default, the script tries to be smart (`--device auto` and `--compute-type auto`). You can override these if necessary:

- **Force CPU processing**:
  ```bash
  python script.py audio.wav -d cpu --compute-type int8
  ```
- **Change Model Size** (default is `small`):
  ```bash
  python script.py audio.wav -m large-v3
  ```
- **Force Language** (default is `it`):
  ```bash
  python script.py audio.wav -l en
  ```

Run `python script.py --help` to see all available options.
