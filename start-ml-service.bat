@echo off
echo ============================================
echo   ViolenceSense ML Service Startup Script
echo ============================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.10+ from https://python.org
    pause
    exit /b 1
)

REM Navigate to ml-service directory
cd /d "%~dp0ml-service"

REM Create virtual environment if not exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install/update dependencies
echo Installing dependencies...
pip install --upgrade pip
pip install -r requirements.txt

REM Create models directory if not exists
if not exist "models" mkdir models

REM Create uploads directory if not exists  
if not exist "uploads" mkdir uploads

echo.
echo ============================================
echo   Starting ML Service on http://localhost:8000
echo   Press Ctrl+C to stop
echo ============================================
echo.

REM Start the ML service
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

pause
