"""
ViolenceSense - Detection Module
================================
Event detection and alerting components.
"""

from .event_engine import (
    InferenceScore,
    DetectorState,
    EventDetectionEngine,
    MultiStreamEventManager,
    event_manager
)

__all__ = [
    "InferenceScore",
    "DetectorState", 
    "EventDetectionEngine",
    "MultiStreamEventManager",
    "event_manager"
]
