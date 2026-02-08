"""
ViolenceSense - Database Module
================================
Database integrations for the RTSP service.
"""

from .postgres import (
    # Enums
    StreamType,
    StreamStatus,
    EventSeverity,
    EventStatus,
    # Models
    Stream,
    InferenceLog,
    Event,
    # Database
    init_db,
    close_db,
    get_session,
    DatabaseSession,
    # Repositories
    StreamRepository,
    InferenceLogRepository,
    EventRepository,
)

__all__ = [
    # Enums
    "StreamType",
    "StreamStatus", 
    "EventSeverity",
    "EventStatus",
    # Models
    "Stream",
    "InferenceLog",
    "Event",
    # Database
    "init_db",
    "close_db",
    "get_session",
    "DatabaseSession",
    # Repositories
    "StreamRepository",
    "InferenceLogRepository",
    "EventRepository",
]
