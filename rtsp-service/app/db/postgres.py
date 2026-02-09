"""
ViolenceSense - PostgreSQL Database Integration
================================================
Async PostgreSQL database models and utilities using SQLAlchemy + asyncpg.

Provides:
- Stream, Event, and InferenceLog models
- Async CRUD operations
- Connection pooling
- Event aggregation utilities
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from enum import Enum
import uuid

from sqlalchemy import (
    Column, String, Text, Integer, BigInteger, Float, Boolean, 
    DateTime, ForeignKey, Enum as SQLEnum, Index,
    select, update, delete, func, and_, or_
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, AsyncEngine
from sqlalchemy.orm import sessionmaker, declarative_base, relationship
from sqlalchemy.pool import NullPool
from loguru import logger

from app.config import settings


# ============================================
# Enums
# ============================================

class StreamType(str, Enum):
    RTSP = "rtsp"
    RTMP = "rtmp"
    WEBCAM = "webcam"
    FILE = "file"


class StreamStatus(str, Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    ERROR = "error"
    CONNECTING = "connecting"


class EventSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class EventStatus(str, Enum):
    NEW = "new"
    CONFIRMED = "confirmed"
    DISMISSED = "dismissed"
    AUTO_DISMISSED = "auto_dismissed"


# ============================================
# Database Setup
# ============================================

# Base class for models
Base = declarative_base()

# Database engine and session factory
_engine: Optional[AsyncEngine] = None
_async_session: Optional[sessionmaker] = None


def get_database_url() -> str:
    """Get async database URL from settings."""
    url = settings.database_url
    
    # Convert standard PostgreSQL URL to async format
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    
    return url


async def init_db() -> None:
    """Initialize database connection and create tables with retry logic."""
    global _engine, _async_session
    
    database_url = get_database_url()
    
    logger.info(f"Connecting to LOCAL PostgreSQL database...")
    
    max_retries = 5
    retry_delay = 3
    
    for attempt in range(max_retries):
        try:
            _engine = create_async_engine(
                database_url,
                echo=settings.debug,
                pool_size=5,
                max_overflow=10,
                pool_timeout=30,
                pool_recycle=1800,
            )
            
            _async_session = sessionmaker(
                _engine, 
                class_=AsyncSession, 
                expire_on_commit=False
            )
            
            # Create tables if they don't exist
            async with _engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            
            logger.info("✅ PostgreSQL database initialized successfully (LOCAL)")
            return
            
        except Exception as e:
            logger.warning(f"Database connection attempt {attempt + 1}/{max_retries} failed: {e}")
            if attempt < max_retries - 1:
                logger.info(f"Retrying in {retry_delay} seconds...")
                await asyncio.sleep(retry_delay)
            else:
                logger.error("Failed to connect to PostgreSQL after all retries")
                raise


async def health_check() -> Dict[str, Any]:
    """Check PostgreSQL database health."""
    import time
    start = time.time()
    
    try:
        if _engine is None:
            return {"status": "disconnected", "latency_ms": 0, "error": "Not initialized"}
        
        async with _engine.connect() as conn:
            await conn.execute(select(func.now()))
        
        latency_ms = (time.time() - start) * 1000
        return {
            "status": "healthy",
            "latency_ms": round(latency_ms, 2),
            "type": "LOCAL PostgreSQL"
        }
    except Exception as e:
        return {
            "status": "error",
            "latency_ms": (time.time() - start) * 1000,
            "error": str(e)
        }


import asyncio


async def close_db() -> None:
    """Close database connections."""
    global _engine
    if _engine:
        await _engine.dispose()
        logger.info("Database connection closed")


def get_session() -> AsyncSession:
    """Get a new database session."""
    if _async_session is None:
        raise RuntimeError("Database not initialized. Call init_db() first.")
    return _async_session()


# Context manager for sessions
class DatabaseSession:
    """Async context manager for database sessions."""
    
    def __init__(self):
        self.session: Optional[AsyncSession] = None
    
    async def __aenter__(self) -> AsyncSession:
        self.session = get_session()
        return self.session
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            if exc_type:
                await self.session.rollback()
            await self.session.close()


# ============================================
# SQLAlchemy Models
# ============================================

class Stream(Base):
    """Camera/RTSP source registry."""
    __tablename__ = "streams"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    url = Column(Text, nullable=False)
    stream_type = Column(String(50), default=StreamType.RTSP.value)
    location = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    status = Column(String(50), default=StreamStatus.OFFLINE.value)
    last_frame_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)
    custom_threshold = Column(Float, nullable=True)
    custom_window_seconds = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    events = relationship("Event", back_populates="stream", lazy="dynamic")
    inference_logs = relationship("InferenceLog", back_populates="stream", lazy="dynamic")
    
    __table_args__ = (
        Index('idx_streams_is_active', 'is_active'),
        Index('idx_streams_status', 'status'),
    )
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": str(self.id),
            "name": self.name,
            "url": self.url,
            "stream_type": self.stream_type,
            "location": self.location,
            "is_active": self.is_active,
            "status": self.status,
            "last_frame_at": self.last_frame_at.isoformat() if self.last_frame_at else None,
            "error_message": self.error_message,
            "custom_threshold": self.custom_threshold,
            "custom_window_seconds": self.custom_window_seconds,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class InferenceLog(Base):
    """Raw sliding-window predictions."""
    __tablename__ = "inference_logs"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    stream_id = Column(PG_UUID(as_uuid=True), ForeignKey("streams.id", ondelete="CASCADE"))
    timestamp = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    violence_score = Column(Float, nullable=False)
    non_violence_score = Column(Float, nullable=False)
    inference_time_ms = Column(Integer, nullable=True)
    frame_number = Column(Integer, nullable=True)
    window_start = Column(DateTime(timezone=True), nullable=True)
    window_end = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    stream = relationship("Stream", back_populates="inference_logs")
    
    __table_args__ = (
        Index('idx_inference_logs_stream_time', 'stream_id', 'timestamp'),
        Index('idx_inference_logs_timestamp', 'timestamp'),
    )
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "stream_id": str(self.stream_id) if self.stream_id else None,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "violence_score": self.violence_score,
            "non_violence_score": self.non_violence_score,
            "inference_time_ms": self.inference_time_ms,
            "frame_number": self.frame_number,
            "window_start": self.window_start.isoformat() if self.window_start else None,
            "window_end": self.window_end.isoformat() if self.window_end else None,
        }


class Event(Base):
    """Actual violence incidents."""
    __tablename__ = "events"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    stream_id = Column(PG_UUID(as_uuid=True), ForeignKey("streams.id", ondelete="SET NULL"), nullable=True)
    stream_name = Column(String(255), nullable=False)
    
    # Timing
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    
    # Confidence scores
    max_confidence = Column(Float, nullable=False)
    avg_confidence = Column(Float, nullable=False)
    min_confidence = Column(Float, nullable=False)
    frame_count = Column(Integer, default=0)
    
    # Classification
    severity = Column(String(20), default=EventSeverity.MEDIUM.value)
    status = Column(String(20), default=EventStatus.NEW.value)
    
    # Clip information
    clip_path = Column(Text, nullable=True)
    clip_duration = Column(Integer, nullable=True)
    thumbnail_path = Column(Text, nullable=True)
    
    # Person captures (JSON array of filenames)
    person_images = Column(Text, nullable=True)  # JSON: ["file1.jpg", "file2.jpg"]
    person_count = Column(Integer, default=0)
    
    # Human review
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_by = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    stream = relationship("Stream", back_populates="events")
    
    __table_args__ = (
        Index('idx_events_status', 'status'),
        Index('idx_events_stream_id', 'stream_id'),
        Index('idx_events_stream_time', 'stream_id', 'start_time'),
        Index('idx_events_severity', 'severity'),
        Index('idx_events_start_time', 'start_time'),
        Index('idx_events_status_severity_time', 'status', 'severity', 'start_time'),
    )
    
    def to_dict(self) -> Dict[str, Any]:
        import json
        person_images_list = []
        if self.person_images:
            try:
                person_images_list = json.loads(self.person_images)
            except (json.JSONDecodeError, TypeError):
                pass
        return {
            "id": str(self.id),
            "stream_id": str(self.stream_id) if self.stream_id else None,
            "stream_name": self.stream_name,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "duration_seconds": self.duration_seconds,
            "max_confidence": self.max_confidence,
            "avg_confidence": self.avg_confidence,
            "min_confidence": self.min_confidence,
            "frame_count": self.frame_count,
            "severity": self.severity,
            "status": self.status,
            "clip_path": self.clip_path,
            "clip_duration": self.clip_duration,
            "thumbnail_path": self.thumbnail_path,
            "person_images": person_images_list,
            "person_count": self.person_count or 0,
            "reviewed_at": self.reviewed_at.isoformat() if self.reviewed_at else None,
            "reviewed_by": self.reviewed_by,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# ============================================
# CRUD Operations
# ============================================

class StreamRepository:
    """Repository for Stream CRUD operations."""
    
    @staticmethod
    async def create(
        name: str,
        url: str,
        stream_type: str = "rtsp",
        location: Optional[str] = None,
        custom_threshold: Optional[float] = None,
        custom_window_seconds: Optional[int] = None
    ) -> Stream:
        """Create a new stream."""
        async with DatabaseSession() as session:
            stream = Stream(
                name=name,
                url=url,
                stream_type=stream_type,
                location=location,
                custom_threshold=custom_threshold,
                custom_window_seconds=custom_window_seconds
            )
            session.add(stream)
            await session.commit()
            await session.refresh(stream)
            return stream
    
    @staticmethod
    async def get_by_id(stream_id: str) -> Optional[Stream]:
        """Get stream by ID."""
        async with DatabaseSession() as session:
            result = await session.execute(
                select(Stream).where(Stream.id == uuid.UUID(stream_id))
            )
            return result.scalar_one_or_none()
    
    @staticmethod
    async def get_all_active() -> List[Stream]:
        """Get all active streams."""
        async with DatabaseSession() as session:
            result = await session.execute(
                select(Stream).where(Stream.is_active == True)
            )
            return list(result.scalars().all())
    
    @staticmethod
    async def get_all() -> List[Stream]:
        """Get all streams."""
        async with DatabaseSession() as session:
            result = await session.execute(select(Stream))
            return list(result.scalars().all())
    
    @staticmethod
    async def update_status(
        stream_id: str,
        status: str,
        last_frame_at: Optional[datetime] = None,
        error_message: Optional[str] = None
    ) -> None:
        """Update stream status."""
        async with DatabaseSession() as session:
            await session.execute(
                update(Stream)
                .where(Stream.id == uuid.UUID(stream_id))
                .values(
                    status=status,
                    last_frame_at=last_frame_at or datetime.utcnow(),
                    error_message=error_message,
                    updated_at=datetime.utcnow()
                )
            )
            await session.commit()
    
    @staticmethod
    async def delete(stream_id: str) -> bool:
        """Delete a stream."""
        async with DatabaseSession() as session:
            result = await session.execute(
                delete(Stream).where(Stream.id == uuid.UUID(stream_id))
            )
            await session.commit()
            return result.rowcount > 0


class InferenceLogRepository:
    """Repository for InferenceLog CRUD operations."""
    
    @staticmethod
    async def create(
        stream_id: str,
        violence_score: float,
        non_violence_score: float,
        inference_time_ms: Optional[int] = None,
        frame_number: Optional[int] = None,
        window_start: Optional[datetime] = None,
        window_end: Optional[datetime] = None
    ) -> InferenceLog:
        """Create a new inference log entry."""
        async with DatabaseSession() as session:
            log = InferenceLog(
                stream_id=uuid.UUID(stream_id),
                violence_score=violence_score,
                non_violence_score=non_violence_score,
                inference_time_ms=inference_time_ms,
                frame_number=frame_number,
                window_start=window_start,
                window_end=window_end
            )
            session.add(log)
            await session.commit()
            await session.refresh(log)
            return log
    
    @staticmethod
    async def get_recent(stream_id: str, seconds: int = 60) -> List[InferenceLog]:
        """Get recent inference logs for a stream."""
        cutoff = datetime.utcnow() - timedelta(seconds=seconds)
        async with DatabaseSession() as session:
            result = await session.execute(
                select(InferenceLog)
                .where(
                    and_(
                        InferenceLog.stream_id == uuid.UUID(stream_id),
                        InferenceLog.timestamp >= cutoff
                    )
                )
                .order_by(InferenceLog.timestamp.desc())
            )
            return list(result.scalars().all())
    
    @staticmethod
    async def cleanup_old(hours: int = 24) -> int:
        """Delete inference logs older than specified hours."""
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        async with DatabaseSession() as session:
            result = await session.execute(
                delete(InferenceLog).where(InferenceLog.timestamp < cutoff)
            )
            await session.commit()
            return result.rowcount


class EventRepository:
    """Repository for Event CRUD operations."""
    
    @staticmethod
    def calculate_severity(confidence: float) -> str:
        """Calculate severity based on confidence score."""
        if confidence >= 0.95:
            return EventSeverity.CRITICAL.value
        elif confidence >= 0.85:
            return EventSeverity.HIGH.value
        elif confidence >= 0.75:
            return EventSeverity.MEDIUM.value
        else:
            return EventSeverity.LOW.value
    
    @staticmethod
    async def create(
        stream_id: str,
        stream_name: str,
        start_time: datetime,
        max_confidence: float,
        avg_confidence: float,
        min_confidence: float,
        frame_count: int = 0,
        end_time: Optional[datetime] = None,
        clip_path: Optional[str] = None,
        clip_duration: Optional[int] = None,
        thumbnail_path: Optional[str] = None
    ) -> Event:
        """Create a new event."""
        duration_seconds = None
        if end_time and start_time:
            duration_seconds = int((end_time - start_time).total_seconds())
        
        severity = EventRepository.calculate_severity(max_confidence)
        
        async with DatabaseSession() as session:
            event = Event(
                stream_id=uuid.UUID(stream_id),
                stream_name=stream_name,
                start_time=start_time,
                end_time=end_time,
                duration_seconds=duration_seconds,
                max_confidence=max_confidence,
                avg_confidence=avg_confidence,
                min_confidence=min_confidence,
                frame_count=frame_count,
                severity=severity
            )
            session.add(event)
            await session.commit()
            await session.refresh(event)
            return event
    
    @staticmethod
    async def get_by_id(event_id: str) -> Optional[Event]:
        """Get event by ID."""
        async with DatabaseSession() as session:
            result = await session.execute(
                select(Event).where(Event.id == uuid.UUID(event_id))
            )
            return result.scalar_one_or_none()
    
    @staticmethod
    async def get_pending(limit: int = 50) -> List[Event]:
        """Get pending (new) events."""
        async with DatabaseSession() as session:
            result = await session.execute(
                select(Event)
                .where(Event.status == EventStatus.NEW.value)
                .order_by(Event.start_time.desc())
                .limit(limit)
            )
            return list(result.scalars().all())
    
    @staticmethod
    async def get_by_stream(
        stream_id: str,
        limit: int = 50,
        status: Optional[str] = None
    ) -> List[Event]:
        """Get events for a specific stream."""
        async with DatabaseSession() as session:
            query = select(Event).where(Event.stream_id == uuid.UUID(stream_id))
            if status:
                query = query.where(Event.status == status)
            query = query.order_by(Event.start_time.desc()).limit(limit)
            
            result = await session.execute(query)
            return list(result.scalars().all())
    
    @staticmethod
    async def get_all(
        limit: int = 100,
        offset: int = 0,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        stream_id: Optional[str] = None,
        start_after: Optional[datetime] = None,
        start_before: Optional[datetime] = None
    ) -> List[Event]:
        """Get events with filters."""
        async with DatabaseSession() as session:
            query = select(Event)
            
            conditions = []
            if status:
                conditions.append(Event.status == status)
            if severity:
                conditions.append(Event.severity == severity)
            if stream_id:
                conditions.append(Event.stream_id == uuid.UUID(stream_id))
            if start_after:
                conditions.append(Event.start_time >= start_after)
            if start_before:
                conditions.append(Event.start_time <= start_before)
            
            if conditions:
                query = query.where(and_(*conditions))
            
            query = query.order_by(Event.start_time.desc()).offset(offset).limit(limit)
            
            result = await session.execute(query)
            return list(result.scalars().all())
    
    @staticmethod
    async def update_status(
        event_id: str,
        status: str,
        reviewed_by: Optional[str] = None,
        notes: Optional[str] = None
    ) -> Optional[Event]:
        """Update event status (confirm/dismiss)."""
        async with DatabaseSession() as session:
            await session.execute(
                update(Event)
                .where(Event.id == uuid.UUID(event_id))
                .values(
                    status=status,
                    reviewed_at=datetime.utcnow(),
                    reviewed_by=reviewed_by,
                    notes=notes,
                    updated_at=datetime.utcnow()
                )
            )
            await session.commit()
            
            # Return updated event
            result = await session.execute(
                select(Event).where(Event.id == uuid.UUID(event_id))
            )
            return result.scalar_one_or_none()
    
    @staticmethod
    async def update_clip_info(
        event_id: str,
        clip_path: str,
        clip_duration: Optional[int] = None,
        thumbnail_path: Optional[str] = None
    ) -> None:
        """Update event clip information."""
        async with DatabaseSession() as session:
            await session.execute(
                update(Event)
                .where(Event.id == uuid.UUID(event_id))
                .values(
                    clip_path=clip_path,
                    clip_duration=clip_duration,
                    thumbnail_path=thumbnail_path,
                    updated_at=datetime.utcnow()
                )
            )
            await session.commit()
    
    @staticmethod
    async def finalize_event(
        event_id: str,
        end_time: datetime,
        scores: List[float],
        frame_count: int,
        clip_path: Optional[str] = None,
        clip_duration: Optional[int] = None,
        thumbnail_path: Optional[str] = None,
        person_images: Optional[List[str]] = None,
        person_count: int = 0
    ) -> Optional[Event]:
        """Finalize an event with end time and statistics."""
        import json
        if not scores:
            return None
        
        async with DatabaseSession() as session:
            # Get existing event
            result = await session.execute(
                select(Event).where(Event.id == uuid.UUID(event_id))
            )
            event = result.scalar_one_or_none()
            if not event:
                return None
            
            duration_seconds = int((end_time - event.start_time).total_seconds())
            
            values = {
                "end_time": end_time,
                "duration_seconds": duration_seconds,
                "max_confidence": max(scores),
                "avg_confidence": sum(scores) / len(scores),
                "min_confidence": min(scores),
                "frame_count": frame_count,
                "severity": EventRepository.calculate_severity(max(scores)),
                "clip_path": clip_path,
                "clip_duration": clip_duration,
                "thumbnail_path": thumbnail_path,
                "updated_at": datetime.utcnow()
            }
            
            if person_images:
                values["person_images"] = json.dumps(person_images)
                values["person_count"] = person_count
            
            await session.execute(
                update(Event)
                .where(Event.id == uuid.UUID(event_id))
                .values(**values)
            )
            await session.commit()
            
            # Return updated event
            result = await session.execute(
                select(Event).where(Event.id == uuid.UUID(event_id))
            )
            return result.scalar_one_or_none()
    
    @staticmethod
    async def get_statistics(days: int = 7) -> Dict[str, Any]:
        """Get event statistics."""
        cutoff = datetime.utcnow() - timedelta(days=days)
        
        async with DatabaseSession() as session:
            # Total counts by status
            result = await session.execute(
                select(
                    Event.status,
                    func.count(Event.id).label('count')
                )
                .where(Event.created_at >= cutoff)
                .group_by(Event.status)
            )
            status_counts = {row.status: row.count for row in result}
            
            # Total counts by severity
            result = await session.execute(
                select(
                    Event.severity,
                    func.count(Event.id).label('count')
                )
                .where(Event.created_at >= cutoff)
                .group_by(Event.severity)
            )
            severity_counts = {row.severity: row.count for row in result}
            
            # Average confidence
            result = await session.execute(
                select(
                    func.avg(Event.max_confidence).label('avg_max'),
                    func.avg(Event.avg_confidence).label('avg_avg')
                )
                .where(Event.created_at >= cutoff)
            )
            row = result.one()
            
            return {
                "period_days": days,
                "total_events": sum(status_counts.values()),
                "by_status": status_counts,
                "by_severity": severity_counts,
                "avg_max_confidence": float(row.avg_max) if row.avg_max else 0,
                "avg_avg_confidence": float(row.avg_avg) if row.avg_avg else 0
            }


# ============================================
# Export convenience
# ============================================

async_session_factory = DatabaseSession

__all__ = [
    # Enums
    "StreamType", "StreamStatus", "EventSeverity", "EventStatus",
    # Models
    "Stream", "InferenceLog", "Event",
    # Database
    "init_db", "close_db", "get_session", "DatabaseSession",
    # Repositories
    "StreamRepository", "InferenceLogRepository", "EventRepository",
]
