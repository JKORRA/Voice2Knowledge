# -*- mode: python ; coding: utf-8 -*-

from PyInstaller.utils.hooks import collect_data_files, collect_dynamic_libs

block_cipher = None

datas = [
    ('frontend/dist', 'frontend/dist'),
]
datas += collect_data_files('llama_cpp')
datas += collect_data_files('huggingface_hub')
datas += collect_data_files('imageio_ffmpeg')

binaries = []
binaries += collect_dynamic_libs('llama_cpp')

a = Analysis(
    ['src/launcher.py'],
    pathex=['.'],
    binaries=binaries,
    datas=datas,
    hiddenimports=[
        'backend',
        'backend.main',
        'backend.api.routes',
        'backend.api.websocket',
        'backend.core.config',
        'backend.core.model_manager',
        'backend.core.transcriber',
        'ctranslate2',
        'faster_whisper',
        'llama_cpp',
        'llama_cpp.llama_cpp',
        'huggingface_hub',
        'tiktoken',
        'tokenizers',
        'torch',
        'uvicorn',
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'pydantic',
        'platformdirs',
        'websockets',
        'pydantic_settings',
        'pydantic_settings.main',
        'pydantic_settings.sources',
        'pydantic_settings.types',
        'platformdirs',
        'platformdirs.unix',
        'platformdirs.api',
        'platformdirs.utils',
        'PIL',
        'PIL._imaging',
        'fontTools',
        'fontTools.ttLib',
        'fontTools.ttFont',
        'fontTools.designspaceLib',
        'imageio_ffmpeg',
    ],
    hookspath=['hooks'],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='Voice2Knowledge',
    debug=True,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=True,
    disable_windowed_traceback=True,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='Voice2Knowledge',
)