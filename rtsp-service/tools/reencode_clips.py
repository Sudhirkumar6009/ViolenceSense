"""
Re-encode existing clips from MPEG-4 Part 2 (mp4v) to H.264.
=============================================================
Run once to convert old clips so they play in browsers.

Usage:
    python tools/reencode_clips.py
"""

import sys
from pathlib import Path

# Add parent to path so we can import av
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    import av
    import numpy as np
except ImportError:
    print("ERROR: PyAV is required. Install with: pip install av")
    sys.exit(1)


def reencode_clip(src: Path):
    """Re-encode a single clip to H.264 in-place."""
    tmp = src.with_suffix(".tmp.mp4")

    try:
        # Open source
        in_container = av.open(str(src))
        in_stream = in_container.streams.video[0]
        fps = float(in_stream.average_rate or 15)
        width = in_stream.codec_context.width
        height = in_stream.codec_context.height
        codec_name = in_stream.codec_context.name

        if codec_name == "h264":
            print(f"  SKIP (already H.264): {src.name}")
            in_container.close()
            return

        print(f"  Converting {src.name}  ({codec_name} -> h264, {width}x{height} @ {fps:.0f}fps)")

        # Open destination
        out_container = av.open(str(tmp), mode="w")
        out_stream = out_container.add_stream("libx264", rate=int(fps))
        out_stream.width = width
        out_stream.height = height
        out_stream.pix_fmt = "yuv420p"
        out_stream.options = {
            "preset": "ultrafast",
            "crf": "23",
            "movflags": "+faststart",
        }

        frame_count = 0
        for frame in in_container.decode(video=0):
            out_frame = frame.reformat(format="yuv420p")
            for packet in out_stream.encode(out_frame):
                out_container.mux(packet)
            frame_count += 1

        # Flush
        for packet in out_stream.encode():
            out_container.mux(packet)

        out_container.close()
        in_container.close()

        # Replace original
        src.unlink()
        tmp.rename(src)
        print(f"  OK: {frame_count} frames re-encoded")

    except Exception as e:
        print(f"  ERROR: {e}")
        if tmp.exists():
            tmp.unlink()


def main():
    clips_dir = Path(__file__).resolve().parent.parent / "clips"
    if not clips_dir.exists():
        print(f"No clips directory found at {clips_dir}")
        return

    mp4_files = sorted(clips_dir.glob("*.mp4"))
    if not mp4_files:
        print("No .mp4 clips found.")
        return

    print(f"Found {len(mp4_files)} clip(s) in {clips_dir}\n")
    for clip in mp4_files:
        reencode_clip(clip)

    print("\nDone!")


if __name__ == "__main__":
    main()
