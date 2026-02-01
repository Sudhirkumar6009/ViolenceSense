@echo off
echo ====================================
echo  ViolenceSense - Project Setup
echo ====================================
echo.

:: Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed. Please install Node.js 18+
    pause
    exit /b 1
)

:: Check for Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed. Please install Python 3.9+
    pause
    exit /b 1
)

echo Installing Backend Dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install backend dependencies
    pause
    exit /b 1
)
cd ..

echo.
echo Installing Frontend Dependencies...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install frontend dependencies
    pause
    exit /b 1
)
cd ..

echo.
echo Installing ML Service Dependencies...
cd ml-service
python -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo WARNING: Some ML dependencies may have failed. GPU support may be limited.
)
cd ..

echo.
echo Setting up environment files...
if not exist backend\.env (
    copy backend\.env.example backend\.env
    echo Created backend\.env
)
if not exist frontend\.env.local (
    copy frontend\.env.local.example frontend\.env.local
    echo Created frontend\.env.local
)
if not exist ml-service\.env (
    copy ml-service\.env.example ml-service\.env
    echo Created ml-service\.env
)

echo.
echo Creating necessary directories...
if not exist backend\uploads mkdir backend\uploads
if not exist backend\logs mkdir backend\logs
if not exist ml-service\models mkdir ml-service\models

echo.
echo ====================================
echo  Setup Complete!
echo ====================================
echo.
echo To start the application:
echo.
echo 1. Start MongoDB:
echo    mongod
echo.
echo 2. Start ML Service (Terminal 1):
echo    cd ml-service ^&^& python main.py
echo.
echo 3. Start Backend (Terminal 2):
echo    cd backend ^&^& npm run dev
echo.
echo 4. Start Frontend (Terminal 3):
echo    cd frontend ^&^& npm run dev
echo.
echo Then open http://localhost:3000 in your browser.
echo.
pause
