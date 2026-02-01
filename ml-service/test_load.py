"""Test loading the Keras model directly"""
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

# Redirect at file descriptor level - this is the ONLY way to capture C-level output
import sys
import ctypes

# Save the real stderr
try:
    # Windows-specific
    if sys.platform == 'win32':
        libc = ctypes.CDLL('ucrtbase')
    else:
        libc = ctypes.CDLL(None)
    c_stderr = libc.freopen(b'nul' if sys.platform == 'win32' else b'/dev/null', b'w', ctypes.c_void_p.in_dll(libc, 'stderr'))
except:
    pass

# Also redirect Python streams
import io
old_stdout = sys.stdout
old_stderr = sys.stderr

def write_result(msg):
    """Write to a file so output is captured regardless of redirects"""
    with open('test_load_result.txt', 'a') as f:
        f.write(msg + '\n')

# Clear previous results
if os.path.exists('test_load_result.txt'):
    os.remove('test_load_result.txt')

try:
    import warnings
    warnings.filterwarnings('ignore')
    
    import tensorflow as tf
    tf.get_logger().setLevel('ERROR')
    
    write_result(f"TensorFlow version: {tf.__version__}")
    
    # Redirect Python stdout/stderr during model loading
    sys.stdout = io.StringIO()
    sys.stderr = io.StringIO()
    
    try:
        model = tf.keras.models.load_model('./models/best_violence_model.keras', compile=False)
        
        # Restore output
        sys.stdout = old_stdout
        sys.stderr = old_stderr
        
        write_result("=" * 50)
        write_result("SUCCESS! Model loaded")
        write_result("=" * 50)
        write_result(f"Model type: {type(model)}")
        write_result(f"Model input shape: {model.input_shape}")
        write_result(f"Model output shape: {model.output_shape}")
        print("Check test_load_result.txt for results")
    except Exception as e:
        # Restore output
        sys.stdout = old_stdout
        sys.stderr = old_stderr
        
        write_result("=" * 50)
        write_result(f"ERROR: {type(e).__name__}")
        write_result("=" * 50)
        write_result(f"Message: {str(e)}")
        import traceback
        write_result(traceback.format_exc())
        print("Check test_load_result.txt for results")
        
except Exception as e:
    sys.stdout = old_stdout
    sys.stderr = old_stderr
    write_result(f"Import Error: {str(e)}")
    print("Check test_load_result.txt for results")
