@echo off
echo ========================================
echo Crisis Management Backend Setup
echo ========================================
echo.

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
    echo.
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat
echo.

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt
echo.

REM Initialize database
echo Initializing database...
python database.py
echo.

echo ========================================
echo Setup complete!
echo ========================================
echo.
echo To start the server, run:
echo   start_server.bat
echo.
pause
