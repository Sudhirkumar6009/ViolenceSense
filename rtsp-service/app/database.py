"""
RTSP Live Stream Service - Database Models
===========================================
SQLAlchemy models for event storage
"""

from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, Enum as SQLEnum
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
import enum

from app.config import settings

# Create async engine
engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    future=True
)

# Create async session factory
async_session = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

# Base class for models
Base = declarative_base()


class EventStatus(str, enum.Enum):
    """Event status enumeration."""
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    DISMISSED = "DISMISSED"
    AUTO_DISMISSED = "AUTO_DISMISSED"
    ACTION_EXECUTED = "ACTION_EXECUTED"
    NO_ACTION_REQUIRED = "NO_ACTION_REQUIRED"


class AlertSeverity(str, enum.Enum):
    """Alert severity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Stream(Base):
    """Registered RTSP streams."""
    __tablename__ = "streams"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    url = Column(String(1024), nullable=False)
    stream_type = Column(String(50), default="rtsp")  # rtsp, rtmp, webcam, file
    location = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Stream status
    status = Column(String(50), default="disconnected")  # connected, disconnected, error
    last_frame_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Configuration overrides
    custom_threshold = Column(Float, nullable=True)
    custom_window_seconds = Column(Integer, nullable=True)


class Event(Base):
    """Violence detection events."""
    __tablename__ = "events"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    stream_id = Column(Integer, nullable=False)
    stream_name = Column(String(255), nullable=False)
    
    # Detection details
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=True)
    duration_seconds = Column(Float, nullable=True)
    
    # Confidence scores
    max_confidence = Column(Float, nullable=False)
    avg_confidence = Column(Float, nullable=False)
    min_confidence = Column(Float, nullable=False)
    frame_count = Column(Integer, default=0)
    
    # Classification
    severity = Column(SQLEnum(AlertSeverity), default=AlertSeverity.MEDIUM)
    status = Column(SQLEnum(EventStatus), default=EventStatus.PENDING)
    
    # Clip information
    clip_path = Column(String(1024), nullable=True)
    clip_duration = Column(Float, nullable=True)
    thumbnail_path = Column(String(1024), nullable=True)
    
    # Review
    reviewed_at = Column(DateTime, nullable=True)
    reviewed_by = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class InferenceLog(Base):
    """Log of all inference results for analytics."""
    __tablename__ = "inference_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    stream_id = Column(Integer, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Inference results
    violence_score = Column(Float, nullable=False)
    non_violence_score = Column(Float, nullable=False)
    inference_time_ms = Column(Float, nullable=True)
    
    # Frame info
    frame_number = Column(Integer, nullable=True)
    window_start = Column(DateTime, nullable=True)
    window_end = Column(DateTime, nullable=True)


async def init_db():
    """Initialize the database tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_session() -> AsyncSession:
    """Get a database session."""
    async with async_session() as session:
        yield session
