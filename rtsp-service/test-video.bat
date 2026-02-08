@echo off
echo ============================================
echo  Quick Test with Local Video File
echo ============================================
echo.
echo This script will:
echo 1. Start the RTSP service
echo 2. Add your video file as a stream
echo 3. Run inference on it
echo.

if "%1"=="" (
    echo Usage: test-video.bat ^<path-to-video^>
    echo Example: test-video.bat "C:\Videos\test.mp4"
    echo.
    pause
    exit /b 1
)

echo Video file: %~1
echo.

REM Check if file exists
if not exist "%~1" (
    echo ERROR: File not found: %~1
    pause
    exit /b 1
)

echo Starting RTSP service in background...
start /min "RTSP Service" cmd /c "python main.py"

echo Waiting for service to start...
timeout /t 5 /nobreak > nul

echo.
echo Adding video stream via API...
echo.

REM Use PowerShell to make the API call
powershell -Command "$body = @{name='test_video'; url='%~1'; auto_start=$true} | ConvertTo-Json; Invoke-RestMethod -Uri 'http://localhost:8080/api/streams' -Method Post -Body $body -ContentType 'application/json'"

echo.
echo ============================================
echo  Stream Added!
echo ============================================
echo.
echo Open the dashboard in your browser:
echo   dashboard\index.html
echo.
echo Or check the API:
echo   http://localhost:8080/docs
echo   http://localhost:8080/api/streams
echo.
echo Press any key to stop the service...
pause > nul

echo Stopping service...
taskkill /FI "WINDOWTITLE eq RTSP Service" /F 2>nul
