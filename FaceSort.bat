@echo off
title FaceSort Launcher
cd /d "%~dp0"
echo Starting FaceSort Desktop Application...
python desktop.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo FaceSort encountered an error. Press any key to exit...
    pause >nul
)
