"""
RTSP Live Stream Service - Main Application
============================================
FastAPI application for RTSP stream ingestion and violence detection
"""

import sys
from pathlib import Path
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from loguru import logger

# Add app to path
sys.path.insert(0, str(Path(__file__).parent))

from app.config import settings
from app.database import init_db
from app.manager import stream_manager
from app.api.routes import router, active_connections, broadcast_message


# Configure logging
logger.remove()
logger.add(
    sys.stderr,
    level=settings.log_level,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>"
)
logger.add(
    settings.log_file,
    rotation="10 MB",
    retention="7 days",
    level=settings.log_level
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    logger.info("🚀 Starting RTSP Live Stream Service...")
    
    # Initialize database
    await init_db()
    logger.info("✅ Database initialized")
    
    # Initialize stream manager
    await stream_manager.initialize()
    logger.info("✅ Stream manager initialized")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down RTSP Live Stream Service...")
    await stream_manager.shutdown()
    logger.info("✅ Shutdown complete")


# Create FastAPI application
app = FastAPI(
    title="ViolenceSense RTSP Live Stream Service",
    description="""
    Real-time RTSP stream ingestion and violence detection service.
    
    ## Features
    - RTSP/RTMP/Webcam stream ingestion
    - Sliding window continuous inference
    - Event detection with threshold + duration rules
    - Clip recording and storage
    - Real-time WebSocket updates
    - Alert dashboard API
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for clips
clips_path = Path(settings.clips_dir)
clips_path.mkdir(parents=True, exist_ok=True)
app.mount("/static/clips", StaticFiles(directory=str(clips_path)), name="clips")

# Include API routes
app.include_router(router, prefix="/api/v1", tags=["API"])


# Root-level WebSocket endpoint (for frontend connecting to /ws)
@app.websocket("/ws")
async def websocket_root(websocket: WebSocket):
    """Root WebSocket endpoint for real-time updates."""
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
        logger.warning(f"WebSocket error: {e}")
        if websocket in active_connections:
            active_connections.remove(websocket)


@app.get("/")
async def root():
    """Root endpoint with service information."""
    return {
        "service": "ViolenceSense RTSP Live Stream Service",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "endpoints": {
            "health": "/api/v1/health",
            "streams": "/api/v1/streams",
            "events": "/api/v1/events",
            "websocket": "/ws"
        }
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower()
    )
