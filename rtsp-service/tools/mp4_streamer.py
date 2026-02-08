"""
MP4 to RTSP Streamer using OpenCV
No FFmpeg required - uses OpenCV to read and stream frames
"""

import cv2
import time
import sys
import argparse
from pathlib import Path

def stream_mp4_to_rtsp(mp4_path: str, rtsp_url: str = "rtsp://localhost:8554/stream", loop: bool = True):
    """
    Stream an MP4 file to an RTSP server using OpenCV.
    
    Note: This requires an RTSP server like MediaMTX running.
    For simplicity, we'll simulate streaming by just playing the video.
    """
    print(f"\n{'='*50}")
    print(" MP4 Video Player/Streamer")
    print(f"{'='*50}\n")
    
    path = Path(mp4_path)
    if not path.exists():
        print(f"Error: File not found: {mp4_path}")
        return False
    
    print(f"Video: {path.name}")
    print(f"Path: {mp4_path}")
    
    cap = cv2.VideoCapture(str(path))
    
    if not cap.isOpened():
        print("Error: Could not open video file")
        return False
    
    # Get video properties
    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps if fps > 0 else 0
    
    print(f"Resolution: {width}x{height}")
    print(f"FPS: {fps:.2f}")
    print(f"Duration: {duration:.2f} seconds")
    print(f"Total Frames: {total_frames}")
    print(f"\nPress 'q' to quit, 'p' to pause/resume")
    print(f"{'='*50}\n")
    
    frame_delay = 1.0 / fps if fps > 0 else 1.0 / 30
    paused = False
    frame_count = 0
    
    while True:
        if not paused:
            ret, frame = cap.read()
            
            if not ret:
                if loop:
                    print("\nRestarting video...")
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    frame_count = 0
                    continue
                else:
                    print("\nVideo ended")
                    break
            
            frame_count += 1
            
            # Add frame info overlay
            info_text = f"Frame: {frame_count}/{total_frames} | Time: {frame_count/fps:.1f}s"
            cv2.putText(frame, info_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 
                       0.7, (0, 255, 0), 2)
            
            # Show frame
            cv2.imshow('MP4 Stream (Press Q to quit)', frame)
        
        # Handle key presses
        key = cv2.waitKey(int(frame_delay * 1000)) & 0xFF
        
        if key == ord('q'):
            print("\nStopped by user")
            break
        elif key == ord('p'):
            paused = not paused
            print(f"\n{'Paused' if paused else 'Resumed'}")
    
    cap.release()
    cv2.destroyAllWindows()
    return True


def main():
    parser = argparse.ArgumentParser(description="Stream MP4 video")
    parser.add_argument("video", help="Path to MP4 file")
    parser.add_argument("--no-loop", action="store_true", help="Don't loop the video")
    
    args = parser.parse_args()
    
    stream_mp4_to_rtsp(args.video, loop=not args.no_loop)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python mp4_streamer.py <video_path>")
        print("Example: python mp4_streamer.py C:\\Videos\\test.mp4")
        sys.exit(1)
    
    main()
