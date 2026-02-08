"""
RTSP Live Stream Service - API Routes
======================================
REST API endpoints for stream and event management
"""

from datetime import datetime
from typing import Optional, List
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import FileResponse, StreamingResponse, Response
from pydantic import BaseModel, Field
import asyncio
import os
import mimetypes

from app.config import settings
from app.database import EventStatus, AlertSeverity
from app.manager import stream_manager

router = APIRouter()


# ============== Pydantic Models ==============

class StreamCreate(BaseModel):
    """Request model for creating a stream."""
    name: str = Field(..., description="Stream display name")
    url: str = Field(..., description="RTSP/RTMP URL or webcam index")
    stream_type: str = Field(default="rtsp", description="Stream type: rtsp, rtmp, webcam, file")
    location: Optional[str] = Field(None, description="Physical location description")
    auto_start: bool = Field(default=False, description="Auto-start stream after creation")
    custom_threshold: Optional[float] = Field(None, ge=0.0, le=1.0, description="Custom violence threshold")


class StreamResponse(BaseModel):
    """Response model for stream info."""
    id: int
    name: str
    url: str
    stream_type: str
    is_running: bool
    is_connected: bool
    frame_count: int
    last_frame_time: Optional[str]
    error_message: Optional[str]


class StreamStatusResponse(BaseModel):
    """Detailed stream status."""
    stream: dict
    pipeline: dict
    detector: dict


class EventResponse(BaseModel):
    """Response model for events."""
    id: int
    stream_id: int
    stream_name: str
    start_time: str
    end_time: Optional[str]
    duration_seconds: Optional[float]
    max_confidence: float
    avg_confidence: float
    severity: str
    status: str
    clip_path: Optional[str]
    thumbnail_path: Optional[str]
    created_at: str


class EventUpdateRequest(BaseModel):
    """Request model for updating event status."""
    status: str = Field(..., description="New status: confirmed, dismissed")
    reviewed_by: Optional[str] = None
    notes: Optional[str] = None


class InferenceScoreResponse(BaseModel):
    """Real-time inference score."""
    stream_id: int
    violence_score: float
    non_violence_score: float
    is_violent: bool
    timestamp: str


# ============== Health Endpoints ==============

@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "RTSP Live Stream Service",
        "version": "1.0.0",
        "streams_active": len(stream_manager.streams)
    }


# ============== Stream Endpoints ==============

def detect_stream_type(url: str) -> str:
    """Auto-detect stream type from URL."""
    url_lower = url.lower()
    if url_lower.startswith("rtsp://"):
        return "rtsp"
    elif url_lower.startswith("rtmp://"):
        return "rtmp"
    elif url_lower.startswith("file://") or url_lower.startswith("file:///"):
        return "file"
    elif url.isdigit():
        return "webcam"
    elif any(url_lower.endswith(ext) for ext in ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv']):
        return "file"
    return "rtsp"  # Default


@router.post("/streams", response_model=dict)
async def create_stream(request: StreamCreate):
    """Add a new stream."""
    try:
        # Auto-detect stream type if not explicitly set or set to default
        stream_type = request.stream_type
        if stream_type == "rtsp":  # Default value, try to auto-detect
            stream_type = detect_stream_type(request.url)
        
        stream_id = await stream_manager.add_stream(
            name=request.name,
            url=request.url,
            stream_type=stream_type,
            location=request.location,
            auto_start=request.auto_start,
            custom_threshold=request.custom_threshold
        )
        return {"success": True, "stream_id": stream_id, "stream_type": stream_type, "message": f"Stream '{request.name}' created"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/streams")
async def list_streams():
    """List all streams with status."""
    streams = []
    for stream_id, instance in stream_manager.streams.items():
        status = instance.ingestion.get_status()
        streams.append(status)
    return {"success": True, "data": streams}


@router.get("/streams/{stream_id}")
async def get_stream(stream_id: int):
    """Get detailed status for a stream."""
    status = stream_manager.get_stream_status(stream_id)
    if not status:
        raise HTTPException(status_code=404, detail="Stream not found")
    return {"success": True, "data": status}


@router.post("/streams/{stream_id}/start")
async def start_stream(stream_id: int):
    """Start a stream."""
    try:
        await stream_manager.start_stream(stream_id)
        return {"success": True, "message": f"Stream {stream_id} started"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/streams/{stream_id}/stop")
async def stop_stream(stream_id: int):
    """Stop a stream."""
    try:
        await stream_manager.stop_stream(stream_id)
        return {"success": True, "message": f"Stream {stream_id} stopped"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class StreamUpdate(BaseModel):
    """Request model for updating a stream."""
    name: Optional[str] = None
    url: Optional[str] = None
    location: Optional[str] = None
    custom_threshold: Optional[float] = Field(None, ge=0.0, le=1.0)


@router.patch("/streams/{stream_id}")
async def update_stream(stream_id: int, request: StreamUpdate):
    """Update stream configuration. Note: Some changes may require restart."""
    try:
        if stream_id not in stream_manager.streams:
            raise HTTPException(status_code=404, detail="Stream not found")
        
        instance = stream_manager.streams[stream_id]
        config = instance.config
        
        # Update fields if provided (config is a dataclass)
        # Note: url changes require stream restart to take effect
        if request.name is not None:
            config.name = request.name
        if request.url is not None:
            config.url = request.url
        
        return {
            "success": True, 
            "message": f"Stream {stream_id} updated. URL changes require restart.",
            "data": {
                "id": stream_id,
                "name": config.name,
                "url": config.url,
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/streams/{stream_id}")
async def delete_stream(stream_id: int):
    """Remove a stream."""
    try:
        await stream_manager.remove_stream(stream_id)
        return {"success": True, "message": f"Stream {stream_id} removed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============== Video Preview Endpoints ==============

@router.get("/streams/{stream_id}/snapshot")
async def get_stream_snapshot(stream_id: int):
    """Get a JPEG snapshot of the current stream frame."""
    import cv2
    
    if stream_id not in stream_manager.streams:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    instance = stream_manager.streams[stream_id]
    frame_data = instance.ingestion.get_latest_frame()
    
    if frame_data is None:
        raise HTTPException(status_code=503, detail="No frames available - stream may not be running")
    
    # Encode frame as JPEG
    success, jpeg_buffer = cv2.imencode('.jpg', frame_data.frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to encode frame")
    
    return StreamingResponse(
        iter([jpeg_buffer.tobytes()]),
        media_type="image/jpeg",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )


@router.get("/streams/{stream_id}/mjpeg")
async def get_stream_mjpeg(stream_id: int, fps: int = Query(default=15, ge=1, le=30)):
    """Get MJPEG video stream for live preview — optimized for low latency."""
    import cv2
    
    if stream_id not in stream_manager.streams:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    async def generate_mjpeg():
        """Generate MJPEG frames with deduplication to avoid serving stale frames."""
        frame_interval = 1.0 / fps
        last_frame_number = -1
        
        while True:
            current_time = asyncio.get_event_loop().time()
            
            if stream_id not in stream_manager.streams:
                break
            
            instance = stream_manager.streams[stream_id]
            
            if not instance.ingestion.is_running:
                await asyncio.sleep(0.5)
                continue
            
            frame_data = instance.ingestion.get_latest_frame()
            
            if frame_data is not None and frame_data.frame_number != last_frame_number:
                last_frame_number = frame_data.frame_number
                # Encode frame as JPEG — quality 75 balances sharpness vs bandwidth
                success, jpeg_buffer = cv2.imencode(
                    '.jpg', frame_data.frame,
                    [cv2.IMWRITE_JPEG_QUALITY, 75]
                )
                
                if success:
                    # MJPEG frame format
                    yield (
                        b'--frame\r\n'
                        b'Content-Type: image/jpeg\r\n\r\n' +
                        jpeg_buffer.tobytes() +
                        b'\r\n'
                    )
            
            # Rate limiting
            elapsed = asyncio.get_event_loop().time() - current_time
            sleep_time = max(0, frame_interval - elapsed)
            await asyncio.sleep(sleep_time)
    
    return StreamingResponse(
        generate_mjpeg(),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            "Connection": "keep-alive"
        }
    )


# ============== Event Endpoints ==============

@router.get("/events")
async def list_events(
    status: Optional[str] = Query(None, description="Filter by status"),
    stream_id: Optional[int] = Query(None, description="Filter by stream"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    """List violence events."""
    event_status = None
    if status:
        try:
            event_status = EventStatus(status)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
    
    events = await stream_manager.get_events(
        status=event_status,
        stream_id=stream_id,
        limit=limit,
        offset=offset
    )
    
    return {
        "success": True,
        "data": [
            {
                "id": e.id,
                "stream_id": e.stream_id,
                "stream_name": e.stream_name,
                "start_time": e.start_time.isoformat() if e.start_time else None,
                "end_time": e.end_time.isoformat() if e.end_time else None,
                "duration_seconds": e.duration_seconds,
                "max_confidence": e.max_confidence,
                "avg_confidence": e.avg_confidence,
                "severity": e.severity.value if e.severity else None,
                "status": e.status.value if e.status else None,
                "clip_path": e.clip_path,
                "clip_duration": e.clip_duration,
                "thumbnail_path": e.thumbnail_path,
                "created_at": e.created_at.isoformat() if e.created_at else None
            }
            for e in events
        ],
        "pagination": {
            "limit": limit,
            "offset": offset,
            "count": len(events)
        }
    }


@router.get("/events/pending")
async def get_pending_events():
    """Get all pending events requiring review."""
    events = await stream_manager.get_events(status=EventStatus.PENDING)
    return {
        "success": True,
        "data": [
            {
                "id": e.id,
                "stream_id": e.stream_id,
                "stream_name": e.stream_name,
                "start_time": e.start_time.isoformat() if e.start_time else None,
                "duration_seconds": e.duration_seconds,
                "max_confidence": e.max_confidence,
                "severity": e.severity.value if e.severity else None,
                "clip_path": e.clip_path,
                "clip_duration": e.clip_duration,
                "thumbnail_path": e.thumbnail_path
            }
            for e in events
        ],
        "count": len(events)
    }


@router.post("/events/{event_id}/confirm")
async def confirm_event(event_id: int, request: EventUpdateRequest = None):
    """Confirm an event as a real violence incident."""
    try:
        await stream_manager.update_event_status(
            event_id=event_id,
            status=EventStatus.CONFIRMED,
            reviewed_by=request.reviewed_by if request else None,
            notes=request.notes if request else None
        )
        return {"success": True, "message": f"Event {event_id} confirmed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/events/{event_id}/dismiss")
async def dismiss_event(event_id: int, request: EventUpdateRequest = None):
    """Dismiss an event as a false positive."""
    try:
        await stream_manager.update_event_status(
            event_id=event_id,
            status=EventStatus.DISMISSED,
            reviewed_by=request.reviewed_by if request else None,
            notes=request.notes if request else None
        )
        return {"success": True, "message": f"Event {event_id} dismissed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============== Clip Endpoints ==============

@router.get("/clips/{filename}")
async def get_clip(filename: str, request: Request):
    """Stream a video clip with HTTP Range request support for browser <video> playback."""
    clip_path = Path(settings.clips_dir) / filename
    
    if not clip_path.exists():
        raise HTTPException(status_code=404, detail="Clip not found")
    
    file_size = os.path.getsize(clip_path)
    range_header = request.headers.get("range")
    
    if range_header:
        # Parse Range header: "bytes=start-end"
        range_str = range_header.replace("bytes=", "")
        parts = range_str.split("-")
        start = int(parts[0]) if parts[0] else 0
        end = int(parts[1]) if parts[1] else file_size - 1
        end = min(end, file_size - 1)
        content_length = end - start + 1
        
        def iter_file():
            with open(clip_path, "rb") as f:
                f.seek(start)
                remaining = content_length
                while remaining > 0:
                    chunk_size = min(8192, remaining)
                    data = f.read(chunk_size)
                    if not data:
                        break
                    remaining -= len(data)
                    yield data
        
        return StreamingResponse(
            iter_file(),
            status_code=206,
            media_type="video/mp4",
            headers={
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(content_length),
                "Content-Disposition": f'inline; filename="{filename}"',
                "Cache-Control": "public, max-age=3600",
            },
        )
    
    # No range header — send full file
    return FileResponse(
        path=str(clip_path),
        media_type="video/mp4",
        filename=filename,
        headers={
            "Accept-Ranges": "bytes",
            "Content-Length": str(file_size),
            "Cache-Control": "public, max-age=3600",
        },
    )


@router.get("/thumbnails/{filename}")
async def get_thumbnail(filename: str):
    """Get event thumbnail."""
    thumb_path = Path(settings.clips_dir) / filename
    
    if not thumb_path.exists():
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    
    return FileResponse(
        path=str(thumb_path),
        media_type="image/jpeg",
        filename=filename
    )


# ============== WebSocket Endpoints ==============

# Store active WebSocket connections
active_connections: List[WebSocket] = []


async def broadcast_message(message: dict):
    """Broadcast message to all WebSocket clients."""
    import json
    for connection in active_connections[:]:  # Copy list to avoid modification during iteration
        try:
            await connection.send_json(message)
        except Exception:
            try:
                active_connections.remove(connection)
            except ValueError:
                pass


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates."""
    await websocket.accept()
    active_connections.append(websocket)
    
    # Set broadcast callback on manager
    stream_manager.set_broadcast_callback(broadcast_message)
    
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            
            # Handle client messages (e.g., ping)
            if data == "ping":
                await websocket.send_text("pong")
                
    except WebSocketDisconnect:
        if websocket in active_connections:
            active_connections.remove(websocket)
    except Exception as e:
        if websocket in active_connections:
            active_connections.remove(websocket)


# ============== Test Endpoints ==============

@router.post("/test/add-demo-stream")
async def add_demo_stream():
    """Add a demo stream for testing (uses webcam or test video)."""
    try:
        # Try webcam first
        stream_id = await stream_manager.add_stream(
            name="Demo Webcam",
            url="0",  # Webcam index 0
            stream_type="webcam",
            location="Local Development",
            auto_start=True
        )
        return {
            "success": True,
            "stream_id": stream_id,
            "message": "Demo webcam stream added and started"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/test/simulate-event")
async def simulate_event(stream_id: int = 1):
    """Simulate a violence event for testing."""
    from app.database import Event, EventStatus, AlertSeverity, async_session
    
    try:
        async with async_session() as session:
            event = Event(
                stream_id=stream_id,
                stream_name="Test Stream",
                start_time=datetime.utcnow(),
                max_confidence=0.85,
                avg_confidence=0.78,
                min_confidence=0.72,
                frame_count=15,
                severity=AlertSeverity.HIGH,
                status=EventStatus.PENDING
            )
            session.add(event)
            await session.commit()
            await session.refresh(event)
            
            # Broadcast alert
            await broadcast_message({
                "type": "event_start",
                "stream_id": stream_id,
                "event_id": event.id,
                "confidence": 0.85
            })
            
            return {
                "success": True,
                "event_id": event.id,
                "message": "Simulated event created"
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
