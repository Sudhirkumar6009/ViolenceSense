@echo off
echo ============================================
echo  ViolenceSense RTSP Live Stream Service
echo ============================================
echo.

REM Use ml-service venv which has TensorFlow + all required packages
set VENV_PYTHON=..\ml-service\venv\Scripts\python.exe

REM Check if ml-service venv exists
if not exist "%VENV_PYTHON%" (
    echo ERROR: ml-service venv not found at %VENV_PYTHON%
    echo Please run ml-service setup first to install TensorFlow.
    pause
    exit /b 1
)

REM Install any additional rtsp-service specific deps
echo Checking dependencies...
..\ml-service\venv\Scripts\pip.exe install -r requirements.txt -q 2>nul

REM Create directories
if not exist "clips" mkdir clips
if not exist "logs" mkdir logs

echo.
echo Starting RTSP Live Stream Service (CCTV-style continuous inference)...
echo Using Python: %VENV_PYTHON%
echo Dashboard: Open dashboard\index.html in browser
echo API Docs: http://localhost:8080/docs
echo.

%VENV_PYTHON% main.py

pause
