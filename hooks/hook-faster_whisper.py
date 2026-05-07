from PyInstaller.utils.hooks import collect_data_files, collect_all

datas, binaries, hiddenimports = collect_all("faster_whisper")