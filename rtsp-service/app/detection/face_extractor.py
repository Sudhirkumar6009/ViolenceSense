"""
Face Extraction Module for Violence Event Clips
================================================
Extracts and saves participant faces from violence event video clips.
"""

import cv2
import os
from pathlib import Path
from datetime import datetime
from typing import List, Optional, Tuple
from loguru import logger
import threading


class FaceExtractor:
    """Extracts faces from video clips and saves them organized by event."""
    
    def __init__(self, base_output_dir: str = "./clips/face_participants"):
        """
        Initialize the face extractor.
        
        Args:
            base_output_dir: Root directory for storing extracted faces
        """
        self.base_output_dir = Path(base_output_dir)
        self.base_output_dir.mkdir(parents=True, exist_ok=True)
        
        # Load Haar Cascade face detector
        # cv2.data.haarcascades provides the path to cascade files
        try:
            cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'  # type: ignore
        except AttributeError:
            # Fallback for some OpenCV installations
            cascade_path = 'haarcascade_frontalface_default.xml'
        
        self.face_cascade = cv2.CascadeClassifier(cascade_path)
        
        if self.face_cascade.empty():
            logger.error("Failed to load Haar Cascade face detector")
            raise IOError("Failed to load Haar Cascade xml file.")
        
        # Detection parameters
        self.scale_factor = 1.1
        self.min_neighbors = 6  # Balanced for accuracy
        self.min_face_size = (50, 50)
        self.frame_interval = 0.5  # Extract frame every 0.5 seconds
        self.padding = 15  # Padding around detected face
        
        # Face deduplication - track face positions to avoid duplicates
        self.min_face_distance = 50  # Minimum pixel distance between "different" faces
        
        logger.info(f"✅ FaceExtractor initialized. Output: {self.base_output_dir}")
    
    def process_clip(self, clip_path: str, event_id: str) -> List[str]:
        """
        Process a video clip and extract unique faces.
        
        Args:
            clip_path: Path to the video clip file
            event_id: Unique event ID for organizing faces
            
        Returns:
            List of saved face image paths (relative to clips dir)
        """
        if not os.path.exists(clip_path):
            logger.warning(f"Clip not found: {clip_path}")
            return []
        
        # Create event-specific directory
        event_dir = self.base_output_dir / event_id
        event_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"🔍 Extracting faces from clip: {clip_path}")
        
        cap = cv2.VideoCapture(clip_path)
        if not cap.isOpened():
            logger.error(f"Failed to open clip: {clip_path}")
            return []
        
        fps = cap.get(cv2.CAP_PROP_FPS)
        if fps <= 0:
            fps = 30
        
        frame_skip = max(1, int(fps * self.frame_interval))
        
        saved_faces: List[str] = []
        seen_faces: List[Tuple[int, int, int, int]] = []  # Track face positions
        frame_count = 0
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Process every Nth frame
            if frame_count % frame_skip == 0:
                faces = self._detect_faces(frame)
                
                for (x, y, w, h) in faces:
                    # Check if this is a new face (not too close to previously seen faces)
                    if self._is_new_face(x, y, w, h, seen_faces):
                        face_path = self._save_face(frame, x, y, w, h, event_dir, len(saved_faces))
                        if face_path:
                            # Store relative path from clips directory
                            relative_path = f"face_participants/{event_id}/{face_path.name}"
                            saved_faces.append(relative_path)
                            seen_faces.append((x, y, w, h))
            
            frame_count += 1
        
        cap.release()
        
        logger.info(f"✅ Extracted {len(saved_faces)} unique faces from event {event_id}")
        return saved_faces
    
    def process_clip_async(self, clip_path: str, event_id: str, callback=None):
        """
        Process clip in background thread.
        
        Args:
            clip_path: Path to the video clip
            event_id: Event ID
            callback: Optional callback function(event_id, face_paths)
        """
        def _process():
            try:
                faces = self.process_clip(clip_path, event_id)
                if callback:
                    callback(event_id, faces)
            except Exception as e:
                logger.error(f"Face extraction failed for {event_id}: {e}")
                if callback:
                    callback(event_id, [])
        
        thread = threading.Thread(target=_process, daemon=True)
        thread.start()
        return thread
    
    def _detect_faces(self, frame) -> List[Tuple[int, int, int, int]]:
        """Detect faces in a frame."""
        try:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            gray = cv2.equalizeHist(gray)  # Improve contrast
            
            faces = self.face_cascade.detectMultiScale(
                gray,
                scaleFactor=self.scale_factor,
                minNeighbors=self.min_neighbors,
                minSize=self.min_face_size,
                flags=cv2.CASCADE_SCALE_IMAGE
            )
            
            # Convert to list of tuples
            result = []
            for face in faces:
                result.append((int(face[0]), int(face[1]), int(face[2]), int(face[3])))
            return result
        except Exception as e:
            logger.error(f"Face detection error: {e}")
            return []
    
    def _is_new_face(self, x: int, y: int, w: int, h: int, 
                      seen_faces: List[Tuple[int, int, int, int]]) -> bool:
        """Check if this face is sufficiently different from previously seen faces."""
        center_x = x + w // 2
        center_y = y + h // 2
        
        for (sx, sy, sw, sh) in seen_faces:
            seen_cx = sx + sw // 2
            seen_cy = sy + sh // 2
            
            distance = ((center_x - seen_cx) ** 2 + (center_y - seen_cy) ** 2) ** 0.5
            
            # If too close and similar size, probably same person
            size_ratio = (w * h) / max(1, sw * sh)
            if distance < self.min_face_distance and 0.5 < size_ratio < 2.0:
                return False
        
        return True
    
    def _save_face(self, frame, x: int, y: int, w: int, h: int, 
                   output_dir: Path, face_index: int) -> Optional[Path]:
        """Extract and save a face region from the frame."""
        try:
            # Add padding around face
            x_start = max(0, x - self.padding)
            y_start = max(0, y - self.padding)
            x_end = min(frame.shape[1], x + w + self.padding)
            y_end = min(frame.shape[0], y + h + self.padding)
            
            face_roi = frame[y_start:y_end, x_start:x_end]
            
            if face_roi.size == 0:
                return None
            
            # Generate filename with timestamp
            ts = datetime.now().strftime("%H%M%S%f")[:10]
            filename = f"participant_{face_index:02d}_{ts}.jpg"
            save_path = output_dir / filename
            
            # Save with good quality
            cv2.imwrite(str(save_path), face_roi, [cv2.IMWRITE_JPEG_QUALITY, 90])
            
            logger.debug(f"   Saved face: {filename}")
            return save_path
            
        except Exception as e:
            logger.error(f"Failed to save face: {e}")
            return None
    
    def get_faces_for_event(self, event_id: str) -> List[str]:
        """Get list of face image paths for an event."""
        event_dir = self.base_output_dir / event_id
        if not event_dir.exists():
            return []
        
        faces = []
        for img_path in event_dir.glob("*.jpg"):
            relative_path = f"face_participants/{event_id}/{img_path.name}"
            faces.append(relative_path)
        
        return sorted(faces)


# Global instance
face_extractor: Optional[FaceExtractor] = None


def get_face_extractor() -> FaceExtractor:
    """Get or create the global face extractor instance."""
    global face_extractor
    if face_extractor is None:
        face_extractor = FaceExtractor()
    return face_extractor
