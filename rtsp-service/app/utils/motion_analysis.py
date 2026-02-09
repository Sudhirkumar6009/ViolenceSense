"""
Motion Analysis - Camera Shake and Rapid Motion Detection
==========================================================
Detects camera shake and rapid global motion to prevent false 
violence detections when video is unstable.

Camera shake produces uniform motion across the entire frame,
while actual violence has localized, erratic motion patterns.

CRITICAL: This module must be VERY aggressive at detecting camera motion
because the violence model gives 90-100% false positives on any camera movement.
"""

import numpy as np
import cv2
from typing import List, Tuple, Optional
from dataclasses import dataclass
from loguru import logger
import time


@dataclass
class MotionAnalysis:
    """Result of motion analysis on a set of frames."""
    is_camera_shake: bool
    shake_score: float  # 0.0 = stable, 1.0 = severe shake
    global_motion_magnitude: float
    motion_uniformity: float  # How uniform the motion is (high = camera shake)
    frame_blur_score: float  # Motion blur amount
    confidence: float  # Confidence in the analysis
    # Static scene detection
    is_static_scene: bool = False  # True if scene is mostly static
    frame_similarity: float = 0.0  # 0-1, how similar consecutive frames are
    is_suspicious_motion: bool = False  # True if motion looks like camera movement
    # Stability tracking
    is_stable: bool = True  # True if camera has been stable long enough
    stability_duration: float = 0.0  # How long camera has been stable (seconds)


class CameraShakeDetector:
    """
    Detects camera shake and rapid global motion using optical flow analysis.
    
    VERY AGGRESSIVE at detecting camera motion because the violence model
    gives false positives on any camera movement.
    
    Camera shake characteristics:
    1. Uniform motion direction across the frame
    2. High motion magnitude in all regions
    3. Low motion variance (all pixels moving similarly)
    
    Violence characteristics:
    1. Localized motion in specific regions
    2. High motion variance (different areas moving differently)
    3. Irregular motion patterns
    """
    
    # VERY LOW thresholds to catch any camera movement
    SHAKE_UNIFORMITY_THRESHOLD = 0.30  # Very low - catch subtle uniform motion
    SHAKE_MAGNITUDE_THRESHOLD = 2.0    # Very low - catch slight movement
    BLUR_THRESHOLD = 100.0             # Laplacian variance below this = blurry
    STATIC_SIMILARITY_THRESHOLD = 0.92  # Frame similarity above this = static scene
    SUSPICIOUS_UNIFORMITY_THRESHOLD = 0.25  # Very low - catch any uniform motion
    
    # Stability requirements
    STABILITY_REQUIRED_SECONDS = 2.0  # Must be stable for 2 seconds before trusting
    STABLE_MAGNITUDE_THRESHOLD = 1.5  # Motion below this = stable
    
    def __init__(self):
        self._prev_gray: Optional[np.ndarray] = None
        self._flow_history: List[float] = []
        self._blur_history: List[float] = []
        self.max_history = 10
        
        # Stability tracking
        self._stable_since: Optional[float] = None
        self._last_unstable_time: float = time.time()
    
    def reset(self):
        """Reset detector state."""
        self._prev_gray = None
        self._flow_history.clear()
        self._blur_history.clear()
        self._stable_since = None
        self._last_unstable_time = time.time()
    
    def analyze_frames(self, frames: List[np.ndarray]) -> MotionAnalysis:
        """
        Analyze a sequence of frames for camera shake and static scenes.
        
        VERY AGGRESSIVE detection - any global motion is treated as camera shake.
        
        Returns MotionAnalysis with shake detection results.
        """
        current_time = time.time()
        
        if len(frames) < 2:
            return MotionAnalysis(
                is_camera_shake=False,
                shake_score=0.0,
                global_motion_magnitude=0.0,
                motion_uniformity=0.0,
                frame_blur_score=1000.0,
                confidence=0.0,
                is_static_scene=True,
                frame_similarity=1.0,
                is_suspicious_motion=False,
                is_stable=False,  # Not enough data = not stable
                stability_duration=0.0
            )
        
        # Analyze motion between consecutive frame pairs
        motion_magnitudes = []
        motion_uniformities = []
        blur_scores = []
        frame_similarities = []
        
        # Sample frames for efficiency (analyze every 2nd or 3rd frame pair)
        step = max(1, len(frames) // 6)
        
        prev_gray = None
        for i in range(0, len(frames), step):
            frame = frames[i]
            
            # Convert to grayscale
            if len(frame.shape) == 3:
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            else:
                gray = frame
            
            # Calculate blur score using Laplacian variance
            laplacian = cv2.Laplacian(gray, cv2.CV_64F)
            blur_score = laplacian.var()
            blur_scores.append(blur_score)
            
            if prev_gray is not None:
                # Calculate optical flow
                mag, uniformity = self._calculate_flow_metrics(prev_gray, gray)
                motion_magnitudes.append(mag)
                motion_uniformities.append(uniformity)
                
                # Calculate frame similarity (structural similarity)
                similarity = self._calculate_frame_similarity(prev_gray, gray)
                frame_similarities.append(similarity)
            
            prev_gray = gray
        
        if not motion_magnitudes:
            return MotionAnalysis(
                is_camera_shake=False,
                shake_score=0.0,
                global_motion_magnitude=0.0,
                motion_uniformity=0.0,
                frame_blur_score=float(np.mean(blur_scores)) if blur_scores else 1000.0,
                confidence=0.5,
                is_static_scene=True,
                frame_similarity=1.0,
                is_suspicious_motion=False,
                is_stable=False,
                stability_duration=0.0
            )
        
        # Aggregate metrics
        avg_magnitude = float(np.mean(motion_magnitudes))
        max_magnitude = float(np.max(motion_magnitudes))  # Track peak motion
        avg_uniformity = float(np.mean(motion_uniformities))
        avg_blur = float(np.mean(blur_scores))
        avg_similarity = float(np.mean(frame_similarities)) if frame_similarities else 1.0
        
        # Update history for temporal smoothing
        self._flow_history.append(avg_magnitude)
        self._blur_history.append(avg_blur)
        if len(self._flow_history) > self.max_history:
            self._flow_history.pop(0)
            self._blur_history.pop(0)
        
        # Detect static scene (frames are very similar - paused video, static image)
        is_static = avg_similarity > self.STATIC_SIMILARITY_THRESHOLD
        
        # Calculate shake score (0-1) - VERY aggressive
        magnitude_factor = min(1.0, avg_magnitude / self.SHAKE_MAGNITUDE_THRESHOLD)
        uniformity_factor = min(1.0, avg_uniformity / 0.5)  # Normalize to 0.5
        
        shake_score = float(magnitude_factor * 0.5 + uniformity_factor * 0.5)
        
        # VERY AGGRESSIVE shake detection - trigger on ANY of these:
        is_shake = bool(
            # Any significant global motion
            (avg_magnitude > self.SHAKE_MAGNITUDE_THRESHOLD) or
            # Any uniform motion pattern
            (avg_uniformity > self.SHAKE_UNIFORMITY_THRESHOLD and avg_magnitude > 1.0) or
            # Peak motion spike
            (max_magnitude > self.SHAKE_MAGNITUDE_THRESHOLD * 2) or
            # Moderate shake score
            (shake_score > 0.35) or
            # Any suspicious uniform motion
            (avg_uniformity > self.SUSPICIOUS_UNIFORMITY_THRESHOLD and avg_magnitude > 1.5)
        )
        
        # Detect suspicious motion patterns (camera pointed at screen)
        is_suspicious = bool(
            (avg_similarity > 0.80 and avg_uniformity > 0.25) or
            (avg_magnitude < 3.0 and avg_uniformity > 0.35) or
            (is_static and avg_magnitude > 0.3)  # Static scene with any motion
        )
        
        # Consider historical context - if recent motion was high, still unstable
        if len(self._flow_history) >= 3:
            recent_avg_magnitude = float(np.mean(self._flow_history[-3:]))
            if recent_avg_magnitude > self.STABLE_MAGNITUDE_THRESHOLD:
                is_shake = True
        
        # If static scene with any motion, treat as shake
        if is_static and avg_magnitude > 0.2:
            is_shake = True
            shake_score = max(shake_score, 0.5)
        
        # Update stability tracking
        is_currently_stable = avg_magnitude < self.STABLE_MAGNITUDE_THRESHOLD and not is_shake
        
        if is_currently_stable:
            if self._stable_since is None:
                self._stable_since = current_time
            stability_duration = current_time - self._stable_since
        else:
            self._stable_since = None
            self._last_unstable_time = current_time
            stability_duration = 0.0
        
        # Camera is considered "stable" only if stable for required duration
        is_stable = stability_duration >= self.STABILITY_REQUIRED_SECONDS
        
        confidence = float(min(1.0, len(motion_magnitudes) / 5))
        
        return MotionAnalysis(
            is_camera_shake=is_shake,
            shake_score=shake_score,
            global_motion_magnitude=avg_magnitude,
            motion_uniformity=avg_uniformity,
            frame_blur_score=avg_blur,
            confidence=confidence,
            is_static_scene=is_static,
            frame_similarity=avg_similarity,
            is_suspicious_motion=is_suspicious,
            is_stable=is_stable,
            stability_duration=stability_duration
        )
    
    def _calculate_flow_metrics(
        self, 
        prev_gray: np.ndarray, 
        curr_gray: np.ndarray
    ) -> Tuple[float, float]:
        """
        Calculate optical flow metrics between two frames.
        
        Returns:
            (magnitude, uniformity) where uniformity indicates how uniform
            the motion is across the frame (high = camera shake).
        """
        try:
            # Downsample for speed
            scale = 0.25
            small_prev = cv2.resize(prev_gray, None, fx=scale, fy=scale)
            small_curr = cv2.resize(curr_gray, None, fx=scale, fy=scale)
            
            # Initialize flow array (required by OpenCV)
            h, w = small_prev.shape[:2]
            flow = np.zeros((h, w, 2), dtype=np.float32)
            
            # Calculate dense optical flow using Farneback method
            flow = cv2.calcOpticalFlowFarneback(
                small_prev, small_curr, flow,
                pyr_scale=0.5, levels=3, winsize=15,
                iterations=3, poly_n=5, poly_sigma=1.2, flags=0
            )
            
            # Get magnitude and angle
            mag, ang = cv2.cartToPolar(flow[..., 0], flow[..., 1])
            
            # Calculate average magnitude
            avg_magnitude = float(np.mean(mag))
            
            # Calculate motion uniformity
            # Divide frame into grid and check if all regions have similar motion
            h, w = mag.shape
            grid_size = 4
            cell_h, cell_w = h // grid_size, w // grid_size
            
            region_magnitudes = []
            region_angles = []
            
            for i in range(grid_size):
                for j in range(grid_size):
                    y1, y2 = i * cell_h, (i + 1) * cell_h
                    x1, x2 = j * cell_w, (j + 1) * cell_w
                    region_mag = float(np.mean(mag[y1:y2, x1:x2]))
                    region_ang = float(np.median(ang[y1:y2, x1:x2]))  # Median angle for region
                    region_magnitudes.append(region_mag)
                    region_angles.append(region_ang)
            
            # Uniformity based on how similar the motion is across regions
            if max(region_magnitudes) > 0.1:
                # Coefficient of variation (lower = more uniform)
                mag_std = float(np.std(region_magnitudes))
                mag_mean = float(np.mean(region_magnitudes))
                mag_cv = mag_std / (mag_mean + 1e-6)
                
                # Angle variance (lower = more uniform direction)
                ang_std = float(np.std(region_angles))
                
                # Uniformity score (0-1, higher = more uniform = camera shake)
                # Low CV and low angle variance = uniform motion = camera shake
                uniformity = 1.0 - min(1.0, mag_cv * 0.5 + ang_std / np.pi * 0.5)
            else:
                uniformity = 0.0  # No significant motion
            
            return avg_magnitude, uniformity
            
        except Exception as e:
            logger.warning(f"Optical flow calculation failed: {e}")
            return 0.0, 0.0
    
    def _calculate_frame_similarity(
        self,
        prev_gray: np.ndarray,
        curr_gray: np.ndarray
    ) -> float:
        """
        Calculate similarity between two frames.
        
        Returns:
            Similarity score 0-1 (1.0 = identical frames)
        """
        try:
            # Resize for faster computation
            scale = 0.25
            small_prev = cv2.resize(prev_gray, None, fx=scale, fy=scale)
            small_curr = cv2.resize(curr_gray, None, fx=scale, fy=scale)
            
            # Method 1: Normalized cross-correlation
            result = cv2.matchTemplate(small_prev, small_curr, cv2.TM_CCOEFF_NORMED)
            ncc = float(np.max(result))
            
            # Method 2: Mean absolute difference (inverted to similarity)
            diff = cv2.absdiff(small_prev, small_curr)
            mean_diff = float(np.mean(diff))
            # Convert to similarity (0 diff = 1.0 similarity)
            diff_similarity = 1.0 - min(1.0, mean_diff / 50.0)
            
            # Combine both metrics
            similarity = (ncc * 0.6 + diff_similarity * 0.4)
            
            return max(0.0, min(1.0, similarity))
            
        except Exception as e:
            logger.warning(f"Frame similarity calculation failed: {e}")
            return 0.5  # Neutral similarity on error


class ScoreStabilizer:
    """
    Stabilizes violence scores to prevent false positives from
    transient high scores (camera shake, brief motion, etc.).
    
    Requires sustained high scores over a time window (default 4-5 seconds)
    before confirming violence detection.
    """
    
    def __init__(
        self,
        confirmation_window_seconds: float = 4.0,  # 4 seconds to confirm
        inference_rate_hz: float = 5.0,  # Expected inferences per second
        min_confirmations: int = 15,  # Minimum high scores needed
        decay_factor: float = 0.85,  # How fast old scores decay
        shake_penalty: float = 0.7  # Score multiplier when shake detected
    ):
        self.confirmation_window = confirmation_window_seconds
        self.inference_rate = inference_rate_hz
        self.min_confirmations = min_confirmations
        self.decay_factor = decay_factor
        self.shake_penalty = shake_penalty
        
        # State
        self._score_history: List[Tuple[float, float, bool]] = []  # (timestamp, score, is_shake)
        self._accumulated_confidence: float = 0.0
        self._last_stabilized_score: float = 0.0
    
    def reset(self):
        """Reset stabilizer state."""
        self._score_history.clear()
        self._accumulated_confidence = 0.0
        self._last_stabilized_score = 0.0
    
    def add_score(
        self, 
        raw_score: float, 
        timestamp: float,
        is_camera_shake: bool = False,
        shake_score: float = 0.0,
        is_static_scene: bool = False,
        is_suspicious_motion: bool = False,
        is_stable: bool = True
    ) -> Tuple[float, bool]:
        """
        Add a new score and get the stabilized result.
        
        CRITICAL: When camera is moving, we COMPLETELY suppress the score.
        The violence model gives 90-100% false positives on camera movement.
        
        Args:
            raw_score: Raw violence score from model (0-1)
            timestamp: Current timestamp in seconds
            is_camera_shake: Whether camera shake was detected
            shake_score: Severity of shake (0-1)
            is_static_scene: Whether the scene is mostly static
            is_suspicious_motion: Whether motion looks like camera movement
            is_stable: Whether camera has been stable long enough
        
        Returns:
            (stabilized_score, is_confirmed) where is_confirmed indicates
            if violence has been sustained long enough to be confirmed.
        """
        # COMPLETE SUPPRESSION for problematic scenarios
        # The model gives 98-100% on any camera movement, so we must zero it out
        is_problematic = is_camera_shake or is_static_scene or is_suspicious_motion or not is_stable
        
        if is_problematic:
            # ZERO the score - camera movement causes 98-100% false positives
            adjusted_score = 0.0
        else:
            adjusted_score = raw_score
        
        # Add to history (track problematic state, not just shake)
        self._score_history.append((timestamp, adjusted_score, is_problematic))
        
        # Remove old scores outside the confirmation window
        cutoff_time = timestamp - self.confirmation_window
        self._score_history = [
            (t, s, sh) for t, s, sh in self._score_history if t >= cutoff_time
        ]
        
        # Calculate stabilized score using weighted average
        # More recent scores have higher weight
        if not self._score_history:
            return 0.0, False
        
        total_weight = 0.0
        weighted_sum = 0.0
        high_score_count = 0
        non_problematic_count = 0
        threshold = 0.5  # Violence threshold
        
        oldest_time = self._score_history[0][0]
        time_span = timestamp - oldest_time + 0.001
        
        for t, score, is_prob in self._score_history:
            # Time-based weight (more recent = higher weight)
            recency = (t - oldest_time) / time_span
            weight = 0.5 + 0.5 * recency * recency  # Quadratic recency weight
            
            # Heavily reduce weight for problematic frames
            if is_prob:
                weight *= 0.3
            
            weighted_sum += score * weight
            total_weight += weight
            
            # Only count non-problematic high scores
            if score >= threshold and not is_prob:
                high_score_count += 1
            if not is_prob:
                non_problematic_count += 1
        
        stabilized_score = weighted_sum / total_weight if total_weight > 0 else 0.0
        
        # Update accumulated confidence (only for non-problematic frames)
        if adjusted_score >= threshold and not is_problematic:
            self._accumulated_confidence += adjusted_score
        else:
            self._accumulated_confidence *= self.decay_factor
        
        # Determine if violence is confirmed
        # Need: enough HIGH QUALITY (non-problematic) high scores sustained over time
        time_coverage = len(self._score_history) / (self.confirmation_window * self.inference_rate)
        is_confirmed = (
            high_score_count >= self.min_confirmations and
            time_coverage >= 0.6 and  # At least 60% of expected samples
            stabilized_score >= threshold and
            non_problematic_count >= len(self._score_history) * 0.5 and  # At least 50% non-problematic
            not is_problematic  # Current frame should be clean
        )
        
        self._last_stabilized_score = stabilized_score
        
        return stabilized_score, is_confirmed
    
    def get_confidence_level(self) -> float:
        """Get current accumulated confidence (0-1)."""
        # Normalize accumulated confidence to 0-1 range
        return min(1.0, self._accumulated_confidence / self.min_confirmations)
    
    def get_trend(self) -> str:
        """Get score trend: 'rising', 'falling', or 'stable'."""
        if len(self._score_history) < 5:
            return "stable"
        
        recent = [s for _, s, _ in self._score_history[-5:]]
        older = [s for _, s, _ in self._score_history[:-5][:5]] if len(self._score_history) > 5 else recent
        
        recent_avg = np.mean(recent)
        older_avg = np.mean(older)
        
        diff = recent_avg - older_avg
        if diff > 0.1:
            return "rising"
        elif diff < -0.1:
            return "falling"
        return "stable"
