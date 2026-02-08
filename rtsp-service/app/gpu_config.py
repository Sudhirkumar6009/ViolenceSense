"""
RTSP Live Stream Service - GPU Configuration
=============================================
Configure TensorFlow and OpenCV for GPU/CUDA acceleration
"""

import os
import warnings

def configure_gpu():
    """
    Configure TensorFlow to use GPU with optimized settings.
    Should be called BEFORE importing TensorFlow/Keras.
    """
    # Suppress TensorFlow warnings
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # 0=all, 1=info, 2=warning, 3=error
    
    # Enable memory growth to avoid OOM
    os.environ['TF_FORCE_GPU_ALLOW_GROWTH'] = 'true'
    
    # Use XLA JIT compilation for faster inference
    os.environ['TF_XLA_FLAGS'] = '--tf_xla_auto_jit=2'
    
    # Enable mixed precision for faster GPU inference
    os.environ['TF_ENABLE_AUTO_MIXED_PRECISION'] = '1'
    
    try:
        import tensorflow as tf
        
        # Check for GPU availability
        gpus = tf.config.list_physical_devices('GPU')
        
        if gpus:
            print(f"[GPU] Found {len(gpus)} GPU(s): {[g.name for g in gpus]}")
            
            for gpu in gpus:
                try:
                    # Enable memory growth - don't pre-allocate all GPU memory
                    tf.config.experimental.set_memory_growth(gpu, True)
                except RuntimeError as e:
                    print(f"[GPU] Memory growth setting failed: {e}")
            
            # Configure visible devices
            tf.config.set_visible_devices(gpus, 'GPU')
            
            # Enable mixed precision for faster inference (FP16)
            try:
                from tensorflow.keras import mixed_precision
                mixed_precision.set_global_policy('mixed_float16')
                print("[GPU] Mixed precision (FP16) enabled for faster inference")
            except Exception as e:
                print(f"[GPU] Mixed precision not available: {e}")
            
            # Verify GPU is being used
            print(f"[GPU] TensorFlow built with CUDA: {tf.test.is_built_with_cuda()}")
            print(f"[GPU] GPU available: {tf.test.is_gpu_available()}")
            
            return True
        else:
            print("[GPU] No GPU found, using CPU (will be slower)")
            return False
            
    except Exception as e:
        print(f"[GPU] Configuration error: {e}")
        return False


def get_gpu_info():
    """Get detailed GPU information."""
    try:
        import tensorflow as tf
        
        gpus = tf.config.list_physical_devices('GPU')
        
        if not gpus:
            return {"available": False, "devices": []}
        
        devices = []
        for gpu in gpus:
            details = tf.config.experimental.get_device_details(gpu)
            devices.append({
                "name": gpu.name,
                "type": gpu.device_type,
                "details": details
            })
        
        return {
            "available": True,
            "cuda_built": tf.test.is_built_with_cuda(),
            "devices": devices
        }
        
    except Exception as e:
        return {"available": False, "error": str(e)}


def get_opencv_backends():
    """Check OpenCV video backend availability."""
    import cv2
    
    backends = []
    
    # Check FFmpeg
    try:
        cap = cv2.VideoCapture()
        if cap.getBackendName():
            backends.append("Default available")
        cap.release()
    except:
        pass
    
    # Check CUDA support
    if hasattr(cv2, 'cuda'):
        try:
            cuda_count = cv2.cuda.getCudaEnabledDeviceCount()
            if cuda_count > 0:
                backends.append(f"CUDA ({cuda_count} devices)")
        except:
            pass
    
    return backends
