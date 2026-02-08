"""
RTSP Test Stream Utilities
===========================
Tools for creating test RTSP streams for development

Usage:
    # Convert MP4 to RTSP stream
    python tools/rtsp_server.py --mode mp4 --file video.mp4
    
    # Stream webcam as RTSP
    python tools/rtsp_server.py --mode webcam --camera 0
    
    # Use public test stream
    python tools/rtsp_server.py --mode test
"""

import argparse
import subprocess
import sys
import time
import threading
from pathlib import Path


# Public RTSP test streams (for testing only, may be unstable)
PUBLIC_TEST_STREAMS = [
    {
        "name": "Wowza Test Stream",
        "url": "rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mp4",
        "type": "vod"
    },
    {
        "name": "Sample H264",
        "url": "rtsp://rtsp.stream/movie",
        "type": "vod"
    }
]


def check_ffmpeg():
    """Check if FFmpeg is installed."""
    try:
        result = subprocess.run(
            ["ffmpeg", "-version"],
            capture_output=True,
            text=True
        )
        return result.returncode == 0
    except FileNotFoundError:
        return False


def check_mediamtx():
    """Check if MediaMTX is available."""
    try:
        result = subprocess.run(
            ["mediamtx", "--help"],
            capture_output=True,
            text=True
        )
        return result.returncode == 0
    except FileNotFoundError:
        return False


def start_mediamtx_server(port: int = 8554):
    """Start MediaMTX RTSP server."""
    print(f"Starting MediaMTX RTSP server on port {port}...")
    print("Download MediaMTX from: https://github.com/bluenviron/mediamtx/releases")
    
    try:
        process = subprocess.Popen(
            ["mediamtx"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        print(f"MediaMTX started (PID: {process.pid})")
        return process
    except FileNotFoundError:
        print("MediaMTX not found. Install it or use FFmpeg directly.")
        return None


def stream_mp4_to_rtsp(
    video_path: str,
    rtsp_url: str = "rtsp://localhost:8554/stream",
    loop: bool = True
):
    """Stream an MP4 file to RTSP using FFmpeg."""
    if not Path(video_path).exists():
        print(f"Error: Video file not found: {video_path}")
        return None
    
    loop_args = ["-stream_loop", "-1"] if loop else []
    
    cmd = [
        "ffmpeg",
        *loop_args,
        "-re",  # Read at native frame rate
        "-i", video_path,
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-tune", "zerolatency",
        "-f", "rtsp",
        "-rtsp_transport", "tcp",
        rtsp_url
    ]
    
    print(f"Streaming {video_path} to {rtsp_url}")
    print(f"Command: {' '.join(cmd)}")
    
    try:
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        print(f"FFmpeg started (PID: {process.pid})")
        print(f"\nRTSP stream available at: {rtsp_url}")
        return process
    except FileNotFoundError:
        print("FFmpeg not found. Please install FFmpeg.")
        return None


def stream_webcam_to_rtsp(
    camera_index: int = 0,
    rtsp_url: str = "rtsp://localhost:8554/webcam",
    resolution: str = "640x480",
    fps: int = 15
):
    """Stream webcam to RTSP using FFmpeg."""
    width, height = resolution.split("x")
    
    # Platform-specific input
    if sys.platform == "win32":
        input_args = ["-f", "dshow", "-i", f"video=Integrated Webcam"]  # Adjust name
    elif sys.platform == "darwin":
        input_args = ["-f", "avfoundation", "-i", f"{camera_index}"]
    else:
        input_args = ["-f", "v4l2", "-i", f"/dev/video{camera_index}"]
    
    cmd = [
        "ffmpeg",
        *input_args,
        "-s", resolution,
        "-r", str(fps),
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-tune", "zerolatency",
        "-f", "rtsp",
        "-rtsp_transport", "tcp",
        rtsp_url
    ]
    
    print(f"Streaming webcam {camera_index} to {rtsp_url}")
    print(f"Command: {' '.join(cmd)}")
    
    try:
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        print(f"FFmpeg started (PID: {process.pid})")
        print(f"\nRTSP stream available at: {rtsp_url}")
        return process
    except FileNotFoundError:
        print("FFmpeg not found. Please install FFmpeg.")
        return None


def print_public_streams():
    """Print available public test streams."""
    print("\n📺 Available Public Test Streams (for testing only):")
    print("=" * 60)
    for stream in PUBLIC_TEST_STREAMS:
        print(f"  Name: {stream['name']}")
        print(f"  URL:  {stream['url']}")
        print(f"  Type: {stream['type']}")
        print()


def print_ip_camera_examples():
    """Print IP camera URL examples."""
    print("\n📹 IP Camera RTSP URL Examples:")
    print("=" * 60)
    print("""
  Hikvision:
    rtsp://admin:password@192.168.1.100:554/Streaming/Channels/101
    
  Dahua:
    rtsp://admin:password@192.168.1.100:554/cam/realmonitor?channel=1&subtype=0
    
  CP Plus:
    rtsp://admin:password@192.168.1.100:554/cam/realmonitor?channel=1&subtype=1
    
  Axis:
    rtsp://admin:password@192.168.1.100:554/axis-media/media.amp
    
  Generic ONVIF:
    rtsp://admin:password@192.168.1.100:554/stream1
    
  Note: Replace admin:password with your credentials
        Replace 192.168.1.100 with your camera IP
""")


def main():
    parser = argparse.ArgumentParser(
        description="RTSP Test Stream Utilities",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Stream MP4 to RTSP
  python rtsp_server.py --mode mp4 --file video.mp4
  
  # Stream webcam to RTSP
  python rtsp_server.py --mode webcam --camera 0
  
  # Show public test streams
  python rtsp_server.py --mode test
  
  # Show IP camera examples
  python rtsp_server.py --mode examples
        """
    )
    
    parser.add_argument(
        "--mode",
        choices=["mp4", "webcam", "test", "examples", "server"],
        default="test",
        help="Operation mode"
    )
    parser.add_argument("--file", help="MP4 file path for mp4 mode")
    parser.add_argument("--camera", type=int, default=0, help="Camera index for webcam mode")
    parser.add_argument("--port", type=int, default=8554, help="RTSP server port")
    parser.add_argument("--url", default=None, help="Custom RTSP output URL")
    parser.add_argument("--loop", action="store_true", help="Loop MP4 playback")
    
    args = parser.parse_args()
    
    # Check FFmpeg
    if not check_ffmpeg():
        print("⚠️ FFmpeg not found. Please install FFmpeg:")
        print("  Windows: choco install ffmpeg  OR  scoop install ffmpeg")
        print("  Linux:   sudo apt install ffmpeg")
        print("  macOS:   brew install ffmpeg")
        print()
    
    if args.mode == "test":
        print_public_streams()
        
    elif args.mode == "examples":
        print_ip_camera_examples()
        
    elif args.mode == "server":
        if check_mediamtx():
            server = start_mediamtx_server(args.port)
            if server:
                print("\nPress Ctrl+C to stop...")
                try:
                    server.wait()
                except KeyboardInterrupt:
                    server.terminate()
        else:
            print("MediaMTX not found.")
            print("Download from: https://github.com/bluenviron/mediamtx/releases")
            print("\nAlternative: Use FFmpeg to stream directly to an RTSP URL")
            
    elif args.mode == "mp4":
        if not args.file:
            print("Error: --file required for mp4 mode")
            return
        
        rtsp_url = args.url or f"rtsp://localhost:{args.port}/stream"
        process = stream_mp4_to_rtsp(args.file, rtsp_url, args.loop)
        
        if process:
            print("\nPress Ctrl+C to stop...")
            try:
                process.wait()
            except KeyboardInterrupt:
                process.terminate()
                
    elif args.mode == "webcam":
        rtsp_url = args.url or f"rtsp://localhost:{args.port}/webcam"
        process = stream_webcam_to_rtsp(args.camera, rtsp_url)
        
        if process:
            print("\nPress Ctrl+C to stop...")
            try:
                process.wait()
            except KeyboardInterrupt:
                process.terminate()


if __name__ == "__main__":
    main()
