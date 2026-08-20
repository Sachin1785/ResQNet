@echo off
echo ========================================
echo Starting ResQNet AI Dispatch Worker Daemon
echo ========================================
echo.

set PYTHONIOENCODING=utf-8
if exist "..\resqnet-module2\.venv\Scripts\python.exe" (
    "..\resqnet-module2\.venv\Scripts\python.exe" ai_dispatch_worker.py
) else if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" ai_dispatch_worker.py
) else (
    python ai_dispatch_worker.py
)
