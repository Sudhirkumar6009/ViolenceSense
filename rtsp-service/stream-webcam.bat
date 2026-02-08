@echo off
echo ============================================
echo  RTSP Test Stream from Webcam
echo ============================================
echo.

echo This will stream your webcam as RTSP at:
echo   rtsp://localhost:8554/webcam
echo.
echo Note: You need MediaMTX running first!
echo Download from: https://github.com/bluenviron/mediamtx/releases
echo.
echo Press Ctrl+C to stop
echo.

REM Get webcam name - adjust as needed for your system
set WEBCAM_NAME=Integrated Webcam

ffmpeg -f dshow -i video="%WEBCAM_NAME%" -s 640x480 -r 15 -c:v libx264 -preset ultrafast -tune zerolatency -f rtsp -rtsp_transport tcp rtsp://localhost:8554/webcam

pause
