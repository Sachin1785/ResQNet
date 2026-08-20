@echo off
echo ========================================
echo Starting ResQNet Simulation Streaming Server
echo ========================================
echo.

cd /d "D:\Codeathon\resqnet-visualizer\backend"
set PYTHONIOENCODING=utf-8
"D:\Codeathon\resqnet-module2\.venv\Scripts\python.exe" run_server.py
