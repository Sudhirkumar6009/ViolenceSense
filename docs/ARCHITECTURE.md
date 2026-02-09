# ViolenceSense - Real-Time Violence Detection System Architecture

## System Overview

ViolenceSense is a CCTV-friendly real-time violence detection system designed for single-machine deployment with CPU-first operation and optional GPU acceleration.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           ViolenceSense Architecture                              │
└──────────────────────────────────────────────────────────────────────────────────┘

                              VIDEO INPUT SOURCES
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  CCTV/IP    │  │   Mobile    │  │   Webcam    │  │  MP4 File   │
│  Cameras    │  │   Cameras   │  │             │  │  (Testing)  │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │                │
       │         ┌──────┴──────┐  ┌──────┴──────┐         │
       │         │  IP Webcam  │  │   MediaMTX  │         │
       │         │    App      │  │ RTSP Server │         │
       │         └──────┬──────┘  └──────┬──────┘         │
       │                │                │                │
       └────────────────┴────────┬───────┴────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │    RTSP UNIFIED LAYER   │
                    │  rtsp://host:port/path  │
                    └────────────┬────────────┘
                                 │
┌────────────────────────────────▼─────────────────────────────────────────────────┐
│                         RTSP SERVICE (Python FastAPI)                            │
│                                Port: 8080                                        │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐              │
│  │   INGESTION     │───▶│   INFERENCE     │───▶│     EVENT       │              │
│  │     LAYER       │    │    PIPELINE     │    │   DETECTOR      │              │
│  │                 │    │                 │    │                 │              │
│  │ • FFmpeg/OpenCV │    │ • Frame Buffer  │    │ • Threshold     │              │
│  │ • Frame Extract │    │ • Sliding Win   │    │ • Duration Rule │              │
│  │ • Resize/FPS    │    │ • ML Inference  │    │ • Event Trigger │              │
│  │ • Reconnection  │    │ • Score Output  │    │ • Clip Recorder │              │
│  └─────────────────┘    └────────┬────────┘    └────────┬────────┘              │
│                                  │                      │                        │
│  ┌───────────────────────────────┴──────────────────────┴────────────────────┐  │
│  │                         FRAME BUFFER (Ring Buffer)                        │  │
│  │              150 frames @ 15 FPS = 10 seconds rolling buffer              │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                           API ENDPOINTS                                    │ │
│  │  /api/v1/streams     - Stream CRUD & control                              │ │
│  │  /api/v1/events      - Event listing & management                         │ │
│  │  /api/v1/ws          - WebSocket real-time updates                        │ │
│  │  /static/clips       - Clip file serving                                  │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    │                                     │
           ┌────────▼────────┐                 ┌──────────▼──────────┐
           │   ML SERVICE    │                 │     PostgreSQL      │
           │   (FastAPI)     │                 │      Database       │
           │   Port: 8000    │                 │     violencesense   │
           │                 │                 │                     │
           │ • Keras/TF      │                 │ • streams           │
           │ • ONNX/OpenVINO │                 │ • inference_logs    │
           │ • CPU Optimized │                 │ • events            │
           └─────────────────┘                 └─────────────────────┘
                                                          │
┌─────────────────────────────────────────────────────────┴─────────────────────────┐
│                          BACKEND SERVICE (Node.js Express)                        │
│                                   Port: 5000                                      │
├───────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                              API ENDPOINTS                                  │ │
│  │  /api/events         - Event listing, filtering, pagination                │ │
│  │  /api/events/:id     - Event details, status update                        │ │
│  │  /api/clips/:id      - Clip playback proxy                                 │ │
│  │  /api/streams        - Stream registry (from PostgreSQL)                   │ │
│  │  /api/health         - Health check                                        │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────────────┘
                                           │
                    ┌──────────────────────▼──────────────────────┐
                    │           FRONTEND (Next.js)                │
                    │                Port: 3000                   │
                    │                                             │
                    │  • Dashboard - Stream status overview       │
                    │  • Alerts - Real-time event list            │
                    │  • Clip Viewer - Auto-play on alert click   │
                    │  • Settings - Threshold configuration       │
                    │                                             │
                    │  ⚠️ NO DIRECT RTSP ACCESS                   │
                    │  Uses only Backend APIs for data            │
                    └─────────────────────────────────────────────┘


## Data Flow

### 1. Frame Ingestion Flow
```

RTSP Stream → FFmpeg/OpenCV → Frame Extraction → Resize (640x360) →
Ring Buffer (150 frames) → Sample at 3-5 FPS → Inference Queue

```

### 2. Inference Flow
```

Frame Buffer → Sample 8-16 frames over 3s window → Resize to 224x224 →
Normalize [0,1] → Model Input → Violence Score (0.0-1.0)

```

### 3. Event Detection Flow
```

Raw Score Stream → Threshold Filter (>0.65) → Duration Check (≥2s) →
Event Creation → Clip Recording (5s before + 10s after) →
Database Storage → WebSocket Alert → UI Update

```

### 4. Alert Acknowledgment Flow
```

UI Alert Click → Frontend API Call → Backend Update →
PostgreSQL Event Update (status: confirmed/dismissed) →
WebSocket Broadcast → All Clients Updated

````


## Database Schema (PostgreSQL)

### 1. streams - Camera/RTSP Source Registry
```sql
CREATE TABLE streams (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    url             TEXT NOT NULL,
    stream_type     VARCHAR(50) DEFAULT 'rtsp',    -- rtsp, rtmp, webcam, file
    location        VARCHAR(255),
    is_active       BOOLEAN DEFAULT true,
    status          VARCHAR(50) DEFAULT 'offline',  -- online, offline, error
    last_frame_at   TIMESTAMP WITH TIME ZONE,
    error_message   TEXT,
    custom_threshold    FLOAT,
    custom_window_seconds INT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
````

### 2. inference_logs - Raw Model Output (Optional but Powerful)

```sql
CREATE TABLE inference_logs (
    id              BIGSERIAL PRIMARY KEY,
    stream_id       UUID REFERENCES streams(id) ON DELETE CASCADE,
    timestamp       TIMESTAMP WITH TIME ZONE NOT NULL,
    violence_score  FLOAT NOT NULL,
    non_violence_score FLOAT NOT NULL,
    inference_time_ms INT,
    frame_number    INT,
    window_start    TIMESTAMP WITH TIME ZONE,
    window_end      TIMESTAMP WITH TIME ZONE
);

-- Partition by time for performance (optional)
-- CREATE INDEX idx_inference_logs_stream_time ON inference_logs(stream_id, timestamp);
```

### 3. events - Actual Violence Incidents

```sql
CREATE TABLE events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stream_id       UUID REFERENCES streams(id) ON DELETE SET NULL,
    stream_name     VARCHAR(255) NOT NULL,

    start_time      TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time        TIMESTAMP WITH TIME ZONE,
    duration_seconds INT,

    max_confidence  FLOAT NOT NULL,
    avg_confidence  FLOAT NOT NULL,
    min_confidence  FLOAT NOT NULL,
    frame_count     INT DEFAULT 0,

    severity        VARCHAR(20) DEFAULT 'medium',  -- low, medium, high, critical
    status          VARCHAR(20) DEFAULT 'new',     -- new, confirmed, dismissed

    clip_path       TEXT,
    clip_duration   INT,
    thumbnail_path  TEXT,

    reviewed_at     TIMESTAMP WITH TIME ZONE,
    reviewed_by     VARCHAR(255),
    notes           TEXT,

    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_stream_time ON events(stream_id, start_time);
CREATE INDEX idx_events_severity ON events(severity);
```

## Performance Optimization

### Frame Processing Strategy

| Parameter      | Value      | Rationale                       |
| -------------- | ---------- | ------------------------------- |
| Input FPS      | 15-25      | Camera native FPS               |
| Processing FPS | 3-5        | Sufficient for motion detection |
| Buffer Size    | 150 frames | 10s rolling window at 15 FPS    |
| Window Size    | 3s         | Captures complete action        |
| Resize         | 640x360    | Buffer storage                  |
| Model Input    | 224x224    | Standard model size             |

### Event Detection Rules

```
TRIGGER EVENT IF:
    violence_score > threshold (0.65)
    FOR >= min_duration (2 seconds)
    AND cooldown_expired (10 seconds since last event)

SEVERITY MAPPING:
    0.65 - 0.75: LOW
    0.75 - 0.85: MEDIUM
    0.85 - 0.95: HIGH
    0.95+:       CRITICAL
```

### Memory Management

- Ring buffer with fixed size prevents memory leaks
- Clip files auto-deleted after 7 days (configurable)
- Inference logs auto-purged after 24 hours (optional)

## Deployment Configuration

### Single Machine MVP

```yaml
services:
  postgresql:
    port: 5432
    database: violencesense

  rtsp-service:
    port: 8080
    depends_on: [postgresql, ml-service]

  ml-service:
    port: 8000

  backend:
    port: 5000
    depends_on: [postgresql, ml-service]

  frontend:
    port: 3000
    depends_on: [backend]
```

### Environment Variables

```bash
# PostgreSQL
DATABASE_URL=postgresql://user:pass@localhost:5432/violencesense

# RTSP Service
RTSP_SERVICE_PORT=8080
ML_SERVICE_URL=http://localhost:8000
VIOLENCE_THRESHOLD=0.65
SLIDING_WINDOW_SECONDS=3
CLIP_DURATION_BEFORE=5
CLIP_DURATION_AFTER=10

# ML Service
ML_SERVICE_PORT=8000
MODEL_PATH=./models/best_violence_model.keras
USE_GPU=false

# Backend
BACKEND_PORT=5000
RTSP_SERVICE_URL=http://localhost:8080

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Security Considerations

- ✅ No face recognition (privacy-first)
- ✅ RTSP credentials stored encrypted
- ✅ Clips stored locally (no cloud upload)
- ✅ WebSocket authentication required
- ✅ Rate limiting on all API endpoints
- ⚠️ Frontend never accesses RTSP directly
