# ViolenceSense - Quick Start Guide

## Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 15+ (or Docker)
- FFmpeg (for video processing)

## Option 1: Docker Deployment (Recommended)

### 1. Start All Services

```bash
# Start with PostgreSQL (production config)
docker-compose -f docker-compose.production.yml up -d

# Check status
docker-compose -f docker-compose.production.yml ps
```

### 2. Initialize Database

The database is automatically initialized when PostgreSQL starts.

### 3. Access Services

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api/v1
- RTSP Service: http://localhost:8080/api/v1
- ML Service: http://localhost:8000

---

## Option 2: Local Development

### 1. Install PostgreSQL

**Windows (using chocolatey):**

```powershell
choco install postgresql
```

**Or use Docker:**

```bash
docker run -d --name violencesense-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=violencesense \
  -p 5432:5432 \
  postgres:16-alpine
```

### 2. Initialize Database

```bash
psql -U postgres -d violencesense -f database/init_schema.sql
```

### 3. Start ML Service

```powershell
cd ml-service
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements-cpu.txt
python main.py
```

### 4. Start RTSP Service

```powershell
cd rtsp-service
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env with your settings

python main.py
```

### 5. Start Backend

```powershell
cd backend
npm install

# Configure environment
copy .env.example .env
# Edit .env with your settings

npm run dev
```

### 6. Start Frontend

```powershell
cd frontend
npm install

# Configure environment
copy .env.local.example .env.local
# Edit .env.local with your settings

npm run dev
```

---

## Adding Video Streams

### Using the API

```bash
# Add RTSP camera
curl -X POST http://localhost:8080/api/v1/streams \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Main Entrance",
    "url": "rtsp://192.168.1.100:554/stream1",
    "stream_type": "rtsp",
    "location": "Building A - Front Gate",
    "auto_start": true
  }'

# Add webcam for testing
curl -X POST http://localhost:8080/api/v1/streams \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Webcam",
    "url": "0",
    "stream_type": "webcam",
    "auto_start": true
  }'
```

### Using the Dashboard

1. Open http://localhost:3000
2. Navigate to Settings > Streams
3. Click "Add Stream"
4. Enter stream details
5. Click "Start"

---

## Testing with Webcam

### Option 1: Direct Webcam

The RTSP service can directly access webcams:

```bash
curl -X POST http://localhost:8080/api/v1/streams \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Laptop Camera",
    "url": "0",
    "stream_type": "webcam",
    "auto_start": true
  }'
```

### Option 2: Webcam to RTSP (using MediaMTX)

```powershell
# Start MediaMTX (included in docker-compose)
docker-compose -f docker-compose.production.yml --profile testing up -d mediamtx

# Stream webcam to RTSP using FFmpeg
ffmpeg -f dshow -i video="Your Webcam Name" -c:v libx264 -preset ultrafast -tune zerolatency -f rtsp rtsp://localhost:8554/webcam
```

Then add the stream:

```bash
curl -X POST http://localhost:8080/api/v1/streams \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Webcam via RTSP",
    "url": "rtsp://localhost:8554/webcam",
    "stream_type": "rtsp",
    "auto_start": true
  }'
```

---

## Testing with Video Files

```bash
# Add a video file for testing
curl -X POST http://localhost:8080/api/v1/streams \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Video",
    "url": "file:///C:/Videos/test_violence.mp4",
    "stream_type": "file",
    "auto_start": true
  }'
```

---

## Monitoring & Alerts

### Real-Time Dashboard

Open http://localhost:3000 to view:

- Active streams and their status
- Real-time inference scores
- Pending alerts
- Event history

### WebSocket Connection

```javascript
const ws = new WebSocket("ws://localhost:8080/api/v1/ws");

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === "alert") {
    console.log(`🚨 Violence detected on ${data.stream_name}!`);
    console.log(`Severity: ${data.severity}`);
    console.log(`Confidence: ${(data.max_confidence * 100).toFixed(1)}%`);
  }
};
```

### Event API

```bash
# Get pending (unreviewed) events
curl http://localhost:5000/api/v1/events/pending

# Get event statistics
curl http://localhost:5000/api/v1/events/stats?days=7
```

---

## Configuration

### Violence Detection Thresholds

Edit `rtsp-service/.env`:

```ini
# Trigger event when score exceeds this (0.0-1.0)
VIOLENCE_THRESHOLD=0.65

# Minimum consecutive frames above threshold to confirm event
MIN_CONSECUTIVE_FRAMES=5

# Minimum event duration in seconds
MIN_EVENT_DURATION_SECONDS=2.0

# Cooldown between events (seconds)
ALERT_COOLDOWN_SECONDS=10

# Clip recording settings
CLIP_DURATION_BEFORE=5
CLIP_DURATION_AFTER=10
```

### Per-Stream Thresholds

```bash
curl -X POST http://localhost:8080/api/v1/streams \
  -H "Content-Type: application/json" \
  -d '{
    "name": "High-Risk Area",
    "url": "rtsp://...",
    "custom_threshold": 0.55
  }'
```

---

## Troubleshooting

### Stream Not Connecting

1. Check RTSP URL is accessible:

   ```bash
   ffplay rtsp://192.168.1.100:554/stream1
   ```

2. Check firewall allows port 554

3. Verify credentials in URL:
   ```
   rtsp://username:password@192.168.1.100:554/stream1
   ```

### No Inference Results

1. Check ML service is running:

   ```bash
   curl http://localhost:8000/health
   ```

2. Check model is loaded:
   ```bash
   curl http://localhost:8000/api/v1/model/status
   ```

### High False Positives

1. Increase threshold:

   ```ini
   VIOLENCE_THRESHOLD=0.75
   ```

2. Increase minimum consecutive frames:
   ```ini
   MIN_CONSECUTIVE_FRAMES=8
   ```

### Database Connection Errors

1. Check PostgreSQL is running:

   ```bash
   docker ps | grep postgres
   ```

2. Verify connection string:
   ```ini
   DATABASE_URL=postgresql://postgres:password@localhost:5432/violencesense
   ```

---

## Support

- Documentation: [docs/](./docs/)
- API Reference: [docs/API.md](./docs/API.md)
- Architecture: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
