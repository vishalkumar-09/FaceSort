# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller specification file for FaceSort Desktop.
Bundles the FastAPI backend, static Next.js frontend, and PyWebView into dist/FaceSort.
"""

from PyInstaller.utils.hooks import collect_data_files, collect_submodules
from pathlib import Path
import os

block_cipher = None

datas = [
    ('frontend/out', 'frontend/out'),
    ('backend', 'backend'),
]

# Collect package assets
datas += collect_data_files('uvicorn')
datas += collect_data_files('fastapi')
datas += collect_data_files('webview')

hiddenimports = [
    'uvicorn',
    'uvicorn.config',
    'uvicorn.main',
    'uvicorn.server',
    'uvicorn.logging',
    'uvicorn.loops',
    'uvicorn.loops.auto',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.websockets',
    'uvicorn.protocols.websockets.auto',
    'uvicorn.lifespans',
    'uvicorn.lifespans.on',
    'uvicorn.lifespans.off',
    'fastapi',
    'fastapi.staticfiles',
    'fastapi.middleware.cors',
    'starlette',
    'starlette.routing',
    'starlette.staticfiles',
    'starlette.responses',
    'starlette.middleware.cors',
    'webview',
    'webview.platforms.winforms',
    'clr_loader',
    'pythonnet',
    'cv2',
    'numpy',
    'PIL',
    'PIL.Image',
    'sklearn',
    'aiofiles',
    'multipart',
    'pydantic',
    'dotenv',
]

hiddenimports += collect_submodules('uvicorn')
hiddenimports += collect_submodules('fastapi')
hiddenimports += collect_submodules('starlette')
hiddenimports += collect_submodules('webview')

a = Analysis(
    ['desktop.py'],
    pathex=['.', 'backend'],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'matplotlib'],
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
    name='FaceSort',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
    disable_windowed_traceback=False,
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
    name='FaceSort',
)
