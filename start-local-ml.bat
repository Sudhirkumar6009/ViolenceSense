@echo off
echo Starting ViolenceSense ML Service...
cd /d D:\Projects\ViolenceSense\ml-service
python -m uvicorn main:app --host 0.0.0.0 --port 8000
pause
