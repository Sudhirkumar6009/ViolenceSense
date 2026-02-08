"""
ViolenceSense - Core Module
============================
Core components for the RTSP service.
"""

from .stream_manager import (
    ProductionStreamManager,
    ManagedStream,
    stream_manager
)

__all__ = [
    "ProductionStreamManager",
    "ManagedStream",
    "stream_manager"
]
