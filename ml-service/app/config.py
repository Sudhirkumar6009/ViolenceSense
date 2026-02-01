import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Server settings
    host: str = "0.0.0.0"
    port: int = 8000
    
    # Model settings
    default_model_path: str = "./models/violence_detection.pth"
    model_architecture: str = "videomae"
    
    # Inference settings
    num_frames: int = 16
    frame_size: int = 224
    batch_size: int = 1
    
    # Device settings
    device: str = "cuda"
    use_fp16: bool = True
    
    # Logging
    log_level: str = "INFO"
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
