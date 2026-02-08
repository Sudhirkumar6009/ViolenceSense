# ViolenceSense API Documentation

## Overview

ViolenceSense provides three main services with REST APIs:

| Service      | Port | Description                            |
| ------------ | ---- | -------------------------------------- |
| RTSP Service | 8080 | Stream management, real-time inference |
| Backend      | 5000 | Event management, clip playback        |
| ML Service   | 8000 | Violence detection model inference     |

---

## RTSP Service API (Port 8080)

Base URL: `http://localhost:8080/api/v1`

### Health Check

```http
GET /health
```

**Response:**

```json
{
  "status": "healthy",
  "service": "RTSP Live Stream Service",
  "version": "1.0.0",
  "streams_active": 2
}
```

### Stream Management

#### List All Streams

```http
GET /streams
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Main Entrance",
      "url": "rtsp://192.168.1.100:554/stream1",
      "stream_type": "rtsp",
      "is_running": true,
      "is_connected": true,
      "frame_count": 1520,
      "last_frame_time": "2024-01-15T10:30:45.123Z"
    }
  ]
}
```

#### Add New Stream

```http
POST /streams
Content-Type: application/json

{
  "name": "Parking Lot Camera",
  "url": "rtsp://192.168.1.101:554/stream1",
  "stream_type": "rtsp",
  "location": "Building A - North Parking",
  "auto_start": true,
  "custom_threshold": 0.7
}
```

**Stream Types:**

- `rtsp` - RTSP camera feed
- `rtmp` - RTMP stream
- `webcam` - Local webcam (index: "0", "1", etc.)
- `file` - Video file for testing

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Parking Lot Camera",
    "status": "connecting"
  }
}
```

#### Start Stream

```http
POST /streams/{stream_id}/start
```

#### Stop Stream

```http
POST /streams/{stream_id}/stop
```

#### Delete Stream

```http
DELETE /streams/{stream_id}
```

#### Get Stream Status

```http
GET /streams/{stream_id}/status
```

**Response:**

```json
{
  "stream": {
    "id": "...",
    "is_running": true,
    "is_connected": true,
    "frame_count": 5420
  },
  "pipeline": {
    "total_inferences": 180,
    "last_inference": "2024-01-15T10:30:44.000Z"
  },
  "detector": {
    "phase": "idle",
    "total_events": 3,
    "current_event_id": null
  }
}
```

### Real-Time WebSocket

```javascript
const ws = new WebSocket("ws://localhost:8080/api/v1/ws");

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case "inference_score":
      // Real-time inference score
      console.log(`Violence score: ${data.violence_score}`);
      break;
    case "event_started":
      // Violence event started
      console.log(`🚨 Event started on ${data.stream_name}`);
      break;
    case "event_ended":
      // Violence event ended
      console.log(`Event ended: ${data.event_id}`);
      break;
    case "alert":
      // New alert for dashboard
      console.log(`Alert: ${data.severity} - ${data.stream_name}`);
      break;
  }
};
```

---

## Backend API (Port 5000)

Base URL: `http://localhost:5000/api/v1`

### Event Management

#### List Events

```http
GET /events?status=new&severity=high&limit=50&offset=0
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status: `new`, `confirmed`, `dismissed` |
| severity | string | Filter by severity: `low`, `medium`, `high`, `critical` |
| stream_id | uuid | Filter by stream ID |
| start_after | ISO date | Events after this time |
| start_before | ISO date | Events before this time |
| limit | int | Max results (default: 50) |
| offset | int | Pagination offset |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "event-uuid",
      "stream_id": "stream-uuid",
      "stream_name": "Main Entrance",
      "stream_location": "Building A - Front Gate",
      "start_time": "2024-01-15T10:25:30.000Z",
      "end_time": "2024-01-15T10:25:45.000Z",
      "duration_seconds": 15,
      "max_confidence": 0.92,
      "avg_confidence": 0.85,
      "severity": "high",
      "status": "new",
      "clip_path": "/static/clips/main_entrance_event123.mp4",
      "thumbnail_path": "/static/clips/main_entrance_event123_thumb.jpg"
    }
  ],
  "pagination": {
    "total": 127,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

#### Get Pending Events

```http
GET /events/pending?limit=20
```

Returns only `status=new` events, ordered by most recent.

#### Get Event by ID

```http
GET /events/{event_id}
```

#### Update Event Status

```http
PATCH /events/{event_id}/status
Content-Type: application/json

{
  "status": "confirmed",
  "reviewed_by": "security_operator_1",
  "notes": "Confirmed physical altercation between two individuals"
}
```

**Status Options:**

- `confirmed` - Event verified as actual violence
- `dismissed` - False positive or not relevant

#### Get Event Statistics

```http
GET /events/stats?days=7
```

**Response:**

```json
{
  "success": true,
  "data": {
    "period_days": 7,
    "total_events": 45,
    "by_status": {
      "new": 5,
      "confirmed": 28,
      "dismissed": 12
    },
    "by_severity": {
      "low": 15,
      "medium": 20,
      "high": 8,
      "critical": 2
    },
    "daily_breakdown": [
      {
        "date": "2024-01-15",
        "total": 8,
        "confirmed": 6,
        "avg_confidence": 0.78
      }
    ],
    "top_streams": [
      {
        "stream_name": "Main Entrance",
        "event_count": 12,
        "max_confidence": 0.95
      }
    ]
  }
}
```

### Stream Registry

#### List Streams

```http
GET /streams?active=true
```

#### Get Stream Events

```http
GET /streams/{stream_id}/events?limit=50&status=confirmed
```

### Clip Playback

#### Get Clip

```http
GET /clips/{event_id}
```

Returns the video clip file for the event.

---

## ML Service API (Port 8000)

Base URL: `http://localhost:8000/api/v1`

### Model Status

```http
GET /model/status
```

**Response:**

```json
{
  "model_loaded": true,
  "model_path": "./models/best_violence_model.keras",
  "model_type": "keras",
  "device": "cpu",
  "metrics": {
    "total_predictions": 1250,
    "avg_inference_time_ms": 45.2
  }
}
```

### Run Inference

```http
POST /inference/predict
Content-Type: multipart/form-data

file: <video_file>
```

**Response:**

```json
{
  "success": true,
  "classification": "violence",
  "confidence": 0.87,
  "probabilities": {
    "violence": 0.87,
    "nonViolence": 0.13
  },
  "metrics": {
    "inferenceTime": 0.052,
    "framesProcessed": 16
  }
}
```

### Load Model

```http
POST /model/load
Content-Type: application/json

{
  "model_path": "./models/custom_model.keras",
  "architecture": "keras-cnn"
}
```

---

## Error Responses

All APIs return errors in this format:

```json
{
  "success": false,
  "error": "Stream not found",
  "details": "No stream exists with ID: abc123"
}
```

**HTTP Status Codes:**

- `200` - Success
- `201` - Created
- `400` - Bad Request (invalid parameters)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

| Service      | Window | Max Requests |
| ------------ | ------ | ------------ |
| RTSP Service | 1 min  | 120          |
| Backend      | 15 min | 100          |
| ML Service   | 1 min  | 60           |

---

## Authentication

Currently, all APIs are open (no authentication required) for development.

For production, add JWT or API key authentication:

```http
Authorization: Bearer <jwt_token>
```

or

```http
X-API-Key: <api_key>
```
