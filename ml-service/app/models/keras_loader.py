"""
Keras Model Loader with compatibility handling for H5 models.
"""

import os
import json
import logging
import tempfile
import shutil

logger = logging.getLogger(__name__)


def load_keras_model_compatible(model_path: str):
    """
    Load a Keras H5 model with compatibility handling.
    
    Args:
        model_path: Path to .h5 model file
        
    Returns:
        Loaded Keras model
    """
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
    
    from tensorflow.keras.models import load_model
    import tensorflow as tf
    
    logger.info(f"Loading Keras model from: {model_path}")
    
    # Try direct loading first
    try:
        model = load_model(model_path, compile=False)
        logger.info("Direct loading succeeded")
        return model
    except Exception as e:
        logger.warning(f"Direct load failed: {str(e)[:100]}..., trying fallback...")
    
    # Fallback: Build fresh model and load weights
    return _build_and_load_weights(model_path)


def _build_and_load_weights(model_path: str):
    """Build a fresh model architecture and load weights from H5 file."""
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras import layers
    
    logger.info("Building fresh model architecture and loading weights...")
    
    # Build the MobileNetV2-LSTM model architecture
    # Input: (batch, 16 frames, 224, 224, 3 channels)
    input_shape = (16, 224, 224, 3)
    
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
    
    model = keras.Model(inputs=inputs, outputs=outputs)
    
    logger.info(f"Built MobileNetV2-LSTM model with input shape: {input_shape}")
    
    # Load weights from H5 file
    try:
        model.load_weights(model_path)
        logger.info("Successfully loaded weights")
        return model
    except Exception as e:
        logger.error(f"Failed to load weights: {e}")
        raise
