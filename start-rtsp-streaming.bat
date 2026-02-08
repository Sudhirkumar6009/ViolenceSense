@echo off
echo ============================================
echo  Starting ViolenceSense RTSP Live Streaming
echo ============================================
echo.

REM Start ML Service
echo Starting ML Service on port 8000...
start "ML-Service" cmd /k "cd /d d:\Projects\ViolenceSense\ml-service && python main.py"

REM Wait for ML service to start
echo Waiting for ML service to initialize...
timeout /t 10 /nobreak > nul

REM Start RTSP Service
echo Starting RTSP Service on port 8080...
start "RTSP-Service" cmd /k "cd /d d:\Projects\ViolenceSense\rtsp-service && python main.py"

echo.
echo ============================================
echo  Services Starting!
echo ============================================
echo.
echo ML Service:   http://localhost:8000
echo RTSP Service: http://localhost:8080
echo API Docs:     http://localhost:8080/docs
echo.
echo Dashboard: Open rtsp-service\dashboard\index.html in browser
echo.
echo Press any key to stop all services...
pause > nul

echo Stopping services...
taskkill /FI "WINDOWTITLE eq ML-Service*" /F 2>nul
taskkill /FI "WINDOWTITLE eq RTSP-Service*" /F 2>nul
echo Done.
