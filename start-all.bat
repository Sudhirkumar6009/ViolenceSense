@echo off
echo ============================================
echo   ViolenceSense - Start All Services
echo ============================================
echo.

REM Start ML Service in new terminal
echo Starting ML Service...
start "ViolenceSense ML Service" cmd /k "cd /d %~dp0 && call start-ml-service.bat"

REM Wait for ML service to start
echo Waiting for ML Service to initialize (10 seconds)...
timeout /t 10 /nobreak >nul

REM Start Backend in new terminal
echo Starting Backend Service...
start "ViolenceSense Backend" cmd /k "cd /d %~dp0backend && npm run dev"

REM Wait for Backend to start
echo Waiting for Backend to initialize (5 seconds)...
timeout /t 5 /nobreak >nul

REM Start Frontend in new terminal
echo Starting Frontend...
start "ViolenceSense Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ============================================
echo   All services started!
echo.
echo   ML Service:  http://localhost:8000
echo   Backend:     http://localhost:5000
echo   Frontend:    http://localhost:3000
echo.
echo   ML Docs:     http://localhost:8000/docs
echo ============================================
echo.

pause
