"""
RTSP Live Stream Service - Inference Pipeline
==============================================
Sliding window inference with continuous scoring
"""

import asyncio
import threading
import time
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Callable
from dataclasses import dataclass, field
from pathlib import Path
import tempfile

import numpy as np
import cv2
import aiohttp
from loguru import logger

from app.config import settings
from app.stream.ingestion import FrameData, StreamIngestion


@dataclass
class InferenceResult:
    """Result of a single inference."""
    violence_score: float
    non_violence_score: float
    timestamp: datetime
    inference_time_ms: float
    frame_count: int
    window_start: datetime
    window_end: datetime
    stream_id: int
    
    @property
    def is_violent(self) -> bool:
        return self.violence_score >= settings.violence_threshold
    
    @property
    def classification(self) -> str:
        return "violence" if self.is_violent else "non-violence"
    
    @property
    def confidence(self) -> float:
        return max(self.violence_score, self.non_violence_score)


@dataclass
class SlidingWindowState:
    """State for sliding window inference."""
    stream_id: int
    recent_scores: List[float] = field(default_factory=list)
    last_inference_time: Optional[datetime] = None
    consecutive_violent_frames: int = 0
    is_in_event: bool = False
    event_start_time: Optional[datetime] = None
    event_scores: List[float] = field(default_factory=list)


class LocalModelInference:
    """
    Local model inference using the Keras model directly with GPU optimization.
    Falls back to ML service API if local model not available.
    """
    
    # Model expects 16 frames at 224x224 resolution
    EXPECTED_FRAMES = 16
    TARGET_SIZE = (224, 224)
    
    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path or settings.model_path
        self.model = None
        self.use_local = False
        self._tf = None
        self._warmup_done = False
        self._load_model()
    
    def _load_model(self):
        """Try to load the local model with Keras 3 compatibility handling and GPU optimization."""
        try:
            if not self.model_path or not Path(self.model_path).exists():
                logger.warning(f"Local model not found at {self.model_path}, will use ML service API")
                return
                
            import tensorflow as tf
            self._tf = tf
            from tensorflow import keras
            from tensorflow.keras import layers
            
            # Log GPU status
            gpus = tf.config.list_physical_devices('GPU')
            if gpus:
                logger.info(f"GPU(s) available for inference: {len(gpus)}")
                for gpu in gpus:
                    logger.info(f"  - {gpu.name}")
            else:
                logger.warning("No GPU detected - inference will be slower")
            
            # Try direct loading first
            try:
                self.model = tf.keras.models.load_model(self.model_path, compile=False)
                self.use_local = True
                logger.info(f"Loaded local model from: {self.model_path}")
                self._warmup_model()
                return
            except Exception as e:
                logger.warning(f"Direct model load failed: {str(e)[:100]}..., trying fallback...")
            
            # Fallback: Build fresh model architecture and load weights
            # This fixes Keras 3 TimeDistributed compatibility issues
            logger.info("Building fresh model architecture and loading weights...")
            
            # MobileNetV2-LSTM architecture: (batch, 16 frames, 224, 224, 3 channels)
            input_shape = (self.EXPECTED_FRAMES, *self.TARGET_SIZE, 3)
            
            inputs = keras.Input(shape=input_shape)
            
            # TimeDistributed MobileNetV2 for frame-level features
            base_model = keras.applications.MobileNetV2(
                weights=None,
                include_top=False,
                input_shape=(224, 224, 3)
            )
            
            # Apply MobileNetV2 to each frame
            x = layers.TimeDistributed(base_model)(inputs)
            
            # Global average pooling for each frame
            x = layers.TimeDistributed(layers.GlobalAveragePooling2D())(x)
            
            # LSTM for temporal modeling
            x = layers.LSTM(64)(x)
            
            # Dense layers
            x = layers.Dense(64, activation='relu')(x)
            
            # Output: violence probability
            outputs = layers.Dense(1, activation='sigmoid')(x)
            
            self.model = keras.Model(inputs=inputs, outputs=outputs)
            logger.info(f"Built MobileNetV2-LSTM model with input shape: {input_shape}")
            
            # Load weights from H5 file
            self.model.load_weights(self.model_path)
            self.use_local = True
            logger.info("Successfully loaded model weights")
            self._warmup_model()
                
        except Exception as e:
            logger.error(f"Failed to load local model: {e}")
            self.use_local = False
    
    def _warmup_model(self):
        """Warmup the model with a dummy inference to optimize GPU memory allocation."""
        if self._warmup_done or self.model is None:
            return
        
        try:
            logger.info("Warming up model for GPU optimization...")
            # Create dummy input
            dummy_input = np.zeros((1, self.EXPECTED_FRAMES, *self.TARGET_SIZE, 3), dtype=np.float32)
            
            # Run a few warmup inferences to let TensorFlow optimize
            for _ in range(3):
                _ = self.model.predict(dummy_input, verbose=0)
            
            self._warmup_done = True
            logger.info("Model warmup complete - GPU memory allocated")
        except Exception as e:
            logger.warning(f"Model warmup failed: {e}")
    
    def preprocess_frames(self, frames: List[np.ndarray], target_size: tuple = None) -> np.ndarray:
        """Preprocess frames for model input.
        
        MobileNetV2 expects:
        - RGB color order (OpenCV gives BGR, must convert)
        - Pixel values in [-1, 1] range (not [0, 1])
        """
        target_size = target_size or self.TARGET_SIZE
        processed = []
        
        # Ensure we have exactly EXPECTED_FRAMES frames
        if len(frames) < self.EXPECTED_FRAMES:
            # Pad with repeated last frame
            frames = list(frames) + [frames[-1]] * (self.EXPECTED_FRAMES - len(frames))
        elif len(frames) > self.EXPECTED_FRAMES:
            # Sample frames uniformly
            indices = np.linspace(0, len(frames) - 1, self.EXPECTED_FRAMES, dtype=int)
            frames = [frames[i] for i in indices]
        
        for frame in frames:
            # Convert BGR (OpenCV default) to RGB
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            # Resize to 224x224
            resized = cv2.resize(rgb_frame, target_size, interpolation=cv2.INTER_AREA)
            # MobileNetV2 preprocess: scale to [-1, 1]
            # This matches tf.keras.applications.mobilenet_v2.preprocess_input
            normalized = resized.astype(np.float32) / 127.5 - 1.0
            processed.append(normalized)
        
        # Stack frames and add batch dimension
        # Shape: (1, num_frames, height, width, channels)
        stacked = np.stack(processed, axis=0)
        return np.expand_dims(stacked, axis=0)
    
    def predict(self, frames: List[np.ndarray]) -> Dict[str, float]:
        """
        Run inference on frames with GPU optimization.
        Uses model.__call__ for lower latency than model.predict.
        """
        if not self.use_local or self.model is None:
            raise RuntimeError("Local model not available")
        
        # Preprocess
        input_data = self.preprocess_frames(frames)
        
        # Run inference with optimized call
        start_time = time.time()
        
        # Use model() directly instead of model.predict() for faster GPU inference
        # model.predict() adds overhead for batch processing we don't need
        if self._tf is not None:
            # Convert to tensor for faster GPU transfer
            input_tensor = self._tf.constant(input_data, dtype=self._tf.float32)
            predictions = self.model(input_tensor, training=False)
            predictions = predictions.numpy()
        else:
            predictions = self.model.predict(input_data, verbose=0)
        
        inference_time = (time.time() - start_time) * 1000
        
        # Parse output (assuming binary classification: [violence, non-violence])
        if predictions.shape[-1] == 2:
            violence_score = float(predictions[0][0])
            non_violence_score = float(predictions[0][1])
        else:
            # Single output (violence probability)
            violence_score = float(predictions[0][0])
            non_violence_score = 1.0 - violence_score
        
        return {
            "violence_score": violence_score,
            "non_violence_score": non_violence_score,
            "inference_time_ms": inference_time
        }


class MLServiceInference:
    """Inference using the remote ML service API."""
    
    def __init__(self, base_url: str = None, timeout: int = None):
        self.base_url = base_url or settings.ml_service_url
        self.timeout = timeout or settings.ml_service_timeout
    
    async def predict_from_frames(
        self,
        frames: List[np.ndarray],
        stream_id: int
    ) -> Dict[str, Any]:
        """
        Send frames to ML service for inference.
        Creates a temporary video file from frames.
        """
        temp_video_path = None
        
        try:
            # Create temporary video from frames
            temp_video_path = self._create_temp_video(frames)
            
            if not temp_video_path:
                raise RuntimeError("Failed to create temporary video")
            
            # Send to ML service
            result = await self._send_to_ml_service(temp_video_path)
            return result
            
        finally:
            # Cleanup temp file
            if temp_video_path and Path(temp_video_path).exists():
                try:
                    Path(temp_video_path).unlink()
                except:
                    pass
    
    def _create_temp_video(self, frames: List[np.ndarray], fps: float = 15.0) -> Optional[str]:
        """Create a temporary video file from frames."""
        if not frames:
            return None
        
        try:
            # Create temp file
            fd, temp_path = tempfile.mkstemp(suffix=".mp4")
            
            height, width = frames[0].shape[:2]
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            writer = cv2.VideoWriter(temp_path, fourcc, fps, (width, height))
            
            for frame in frames:
                writer.write(frame)
            
            writer.release()
            return temp_path
            
        except Exception as e:
            logger.error(f"Failed to create temp video: {e}")
            return None
    
    async def _send_to_ml_service(self, video_path: str) -> Dict[str, Any]:
        """Send video to ML service API."""
        url = f"{self.base_url}/inference/predict-upload"
        
        try:
            timeout = aiohttp.ClientTimeout(total=self.timeout)
            
            async with aiohttp.ClientSession(timeout=timeout) as session:
                with open(video_path, 'rb') as f:
                    data = aiohttp.FormData()
                    data.add_field(
                        'video',
                        f,
                        filename='inference.mp4',
                        content_type='video/mp4'
                    )
                    
                    async with session.post(url, data=data) as response:
                        if response.status == 200:
                            result = await response.json()
                            return {
                                "violence_score": result.get("probabilities", {}).get("violence", 0.0),
                                "non_violence_score": result.get("probabilities", {}).get("nonViolence", 1.0),
                                "inference_time_ms": result.get("metrics", {}).get("inferenceTime", 0) * 1000
                            }
                        else:
                            text = await response.text()
                            raise RuntimeError(f"ML service error: {response.status} - {text}")
                            
        except asyncio.TimeoutError:
            raise RuntimeError("ML service timeout")
        except Exception as e:
            logger.error(f"ML service request failed: {e}")
            raise


class InferencePipeline:
    """
    CCTV-style continuous inference pipeline.
    
    Checks every frame by using a sliding window of the last 16 consecutive 
    frames. At each inference cycle, the window has advanced by a few frames
    (depending on FPS and inference interval), giving continuous, overlapping
    coverage like a professional CCTV system.
    
    At 30fps camera + 100ms inference interval:
    - ~10 inferences/second
    - Window advances ~3 frames between cycles 
    - Every single frame participates in ~5 inference windows
    - 16 consecutive frames = ~0.53s of video per inference
    """
    
    def __init__(
        self,
        stream: StreamIngestion,
        on_result: Optional[Callable[[InferenceResult], None]] = None,
        use_local_model: bool = True
    ):
        self.stream = stream
        self.on_result = on_result
        
        # Initialize inference backend
        if use_local_model:
            try:
                self.local_inference = LocalModelInference()
                self.use_local = self.local_inference.use_local
            except:
                self.use_local = False
        else:
            self.use_local = False
        
        if not self.use_local:
            self.ml_service = MLServiceInference()
        
        # State
        self.state = SlidingWindowState(stream_id=stream.config.id)
        self.is_running = False
        self._task: Optional[asyncio.Task] = None
        
        # Scoring history for smoothing
        self.score_history: List[float] = []
        self.max_history_size = 20  # Keep more history for CCTV-style smoothing
        
        # Track last processed frame to detect new frames
        self._last_frame_number: int = -1
    
    async def _inference_loop(self):
        """
        CCTV-style continuous inference loop.
        
        Runs at high frequency, always using the LAST 16 consecutive frames
        from the camera. This ensures every frame is checked as part of at
        least one inference window, mimicking how professional CCTV analytics
        continuously monitor the feed.
        """
        required_frames = LocalModelInference.EXPECTED_FRAMES  # 16
        interval_seconds = settings.inference_interval_ms / 1000.0
        
        logger.info(
            f"🎬 Starting CCTV-style continuous inference for [{self.stream.config.name}] "
            f"(interval: {settings.inference_interval_ms}ms = "
            f"{1000 / settings.inference_interval_ms:.1f} checks/sec, "
            f"window: {required_frames} consecutive frames)"
        )
        
        while self.is_running:
            try:
                # Check if stream is connected
                if not self.stream.is_connected:
                    await asyncio.sleep(0.5)
                    continue
                
                # Get the LAST 16 CONSECUTIVE frames — no sampling, no gaps
                frames = self.stream.get_consecutive_frames(required_frames)
                
                if len(frames) < required_frames:
                    # Not enough frames accumulated yet (camera just started)
                    await asyncio.sleep(interval_seconds)
                    continue
                
                # Skip if no new frames since last inference (avoid redundant work)
                latest_frame_num = frames[-1].frame_number
                if latest_frame_num == self._last_frame_number:
                    await asyncio.sleep(0.01)  # Brief wait for new frame
                    continue
                self._last_frame_number = latest_frame_num
                
                # Time the full cycle: inference + sleep = constant interval
                cycle_start = asyncio.get_event_loop().time()
                
                # Run inference on consecutive frames
                result = await self._run_inference(frames)
                
                if result and self.on_result:
                    self.on_result(result)
                
                # Sleep for remaining interval time
                elapsed = asyncio.get_event_loop().time() - cycle_start
                sleep_time = max(0, interval_seconds - elapsed)
                if sleep_time > 0:
                    await asyncio.sleep(sleep_time)
                    
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Inference error: {e}")
                await asyncio.sleep(interval_seconds)
        
        logger.info(f"Inference pipeline stopped for stream {self.stream.config.name}")
    
    async def _run_inference(self, frames: List[FrameData]) -> Optional[InferenceResult]:
        """Run inference on consecutive frames (CCTV-style)."""
        if not frames:
            return None
        
        start_time = time.time()
        
        try:
            # Extract numpy arrays from frame data
            frame_arrays = [f.frame for f in frames]
            
            # Run inference
            if self.use_local and self.local_inference:
                result_data = self.local_inference.predict(frame_arrays)
            else:
                result_data = await self.ml_service.predict_from_frames(
                    frame_arrays,
                    self.stream.config.id
                )
            
            inference_time = (time.time() - start_time) * 1000
            
            # Update score history
            violence_score = result_data["violence_score"]
            self.score_history.append(violence_score)
            if len(self.score_history) > self.max_history_size:
                self.score_history.pop(0)
            
            # Compute window span from actual frame timestamps
            window_span_ms = (frames[-1].timestamp - frames[0].timestamp).total_seconds() * 1000
            
            # Create result
            result = InferenceResult(
                violence_score=violence_score,
                non_violence_score=result_data["non_violence_score"],
                timestamp=datetime.utcnow(),
                inference_time_ms=result_data.get("inference_time_ms", inference_time),
                frame_count=len(frames),
                window_start=frames[0].timestamp,
                window_end=frames[-1].timestamp,
                stream_id=self.stream.config.id
            )
            
            # Update state
            self.state.last_inference_time = result.timestamp
            self.state.recent_scores.append(violence_score)
            if len(self.state.recent_scores) > 30:
                self.state.recent_scores.pop(0)
            
            # Log scores — every score when violent, periodic otherwise
            score_count = len(self.state.recent_scores)
            if violence_score >= settings.violence_threshold:
                avg = sum(self.state.recent_scores[-5:]) / min(5, len(self.state.recent_scores))
                logger.warning(
                    f"🔴 VIOLENT [{self.stream.config.name}] "
                    f"score={violence_score:.1%} avg5={avg:.1%} "
                    f"frames={len(frames)} span={window_span_ms:.0f}ms "
                    f"({inference_time:.0f}ms)"
                )
            elif score_count % 10 == 0:
                avg = sum(self.state.recent_scores) / len(self.state.recent_scores)
                logger.info(
                    f"📊 [{self.stream.config.name}] "
                    f"score={violence_score:.1%} avg={avg:.1%} "
                    f"frames={len(frames)} span={window_span_ms:.0f}ms "
                    f"({inference_time:.0f}ms)"
                )
            
            return result
            
        except Exception as e:
            logger.error(f"Inference failed: {e}")
            return None
    
    def get_smoothed_score(self) -> float:
        """Get smoothed violence score using moving average."""
        if not self.score_history:
            return 0.0
        return sum(self.score_history) / len(self.score_history)
    
    async def start(self):
        """Start the inference pipeline."""
        if self.is_running:
            return
        
        self.is_running = True
        self._task = asyncio.create_task(self._inference_loop())
    
    async def stop(self):
        """Stop the inference pipeline."""
        self.is_running = False
        
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
    
    def get_status(self) -> Dict[str, Any]:
        """Get pipeline status."""
        return {
            "stream_id": self.stream.config.id,
            "is_running": self.is_running,
            "use_local_model": self.use_local,
            "last_inference_time": self.state.last_inference_time.isoformat() if self.state.last_inference_time else None,
            "recent_scores_count": len(self.state.recent_scores),
            "avg_recent_score": sum(self.state.recent_scores) / len(self.state.recent_scores) if self.state.recent_scores else 0,
            "is_in_event": self.state.is_in_event,
            "consecutive_violent_frames": self.state.consecutive_violent_frames
        }
