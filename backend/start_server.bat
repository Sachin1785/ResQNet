@echo off
echo ========================================
echo Starting Crisis Management Backend
echo ========================================
echo.

REM Activate virtual environment
if exist ".venv" (
    call .venv\Scripts\activate.bat
) else if exist "venv" (
    call venv\Scripts\activate.bat
)

REM Start the server
echo Starting Flask server with WebSocket support...
echo.
echo Server will be available at:
echo   HTTP: http://localhost:5000
echo   WebSocket: ws://localhost:5000
echo.
echo Press Ctrl+C to stop the server
echo.

python app.py
