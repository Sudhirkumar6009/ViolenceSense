@echo off
echo ============================================
echo  MP4 Video Streamer (No FFmpeg Required)
echo ============================================
echo.

if "%1"=="" (
    echo Usage: stream-mp4.bat ^<video-file^>
    echo Example: stream-mp4.bat "C:\Videos\test.mp4"
    echo.
    echo NOTE: Use quotes around paths with spaces!
    echo.
    pause
    exit /b 1
)

echo.
echo TIP: You can add this video directly to the RTSP service!
echo.
echo Option 1 - Via API (recommended):
echo   POST http://localhost:8080/api/streams
echo   Body: {"name": "test", "url": "file:///%~1"}
echo.
echo Option 2 - Play video locally (current):
echo.

python tools\mp4_streamer.py %1

pause
