@echo off
echo ============================================
echo  ViolenceSense RTSP Live Stream Service
echo ============================================
echo.

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt -q

REM Create directories
if not exist "clips" mkdir clips
if not exist "logs" mkdir logs

echo.
echo Starting RTSP Live Stream Service...
echo Dashboard: Open dashboard\index.html in browser
echo API Docs: http://localhost:8080/docs
echo.

python main.py

pause
