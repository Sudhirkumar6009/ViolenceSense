# INSTALLATION INSTRUCTION:
# The package name for cv2 is 'opencv-python', NOT 'cv2'.
# Run this command in your terminal: pip install opencv-python

import cv2
import os
import glob
from datetime import datetime

class FaceExtractionModel:
    def __init__(self, output_directory='face_datasets'):
        """
        Initializes the model.
        :param output_directory: The root folder where data will be saved.
        """
        self.root_dir = output_directory
        self.raw_frames_folder = os.path.join(self.root_dir, 'frames')
        self.detected_faces_folder = os.path.join(self.root_dir, 'faces')
        
        # 1. Setup Directories
        for folder in [self.raw_frames_folder, self.detected_faces_folder]:
            if not os.path.exists(folder):
                os.makedirs(folder)

        # 2. Load Pre-trained Face Detection Model (Haar Cascade)
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        self.face_cascade = cv2.CascadeClassifier(cascade_path)
        
        if self.face_cascade.empty():
            raise IOError("Failed to load Haar Cascade xml file.")
        
        print(f"[INIT] Model initialized. Output path: {self.root_dir}")

    def process_video(self, video_path, interval=1.0):
        """
        Main function to run the entire pipeline on a video.
        :param video_path: Path to the video file.
        :param interval: Time in seconds between frame extractions.
        :return: List of file paths of the detected faces.
        """
        if not os.path.exists(video_path):
            print(f"[ERROR] Video not found: {video_path}")
            return []

        # Step 1: Extract Frames
        self._extract_frames(video_path, interval)
        
        # Step 2: Detect Faces
        saved_faces = self._detect_faces_in_frames()
        
        return saved_faces

    def _extract_frames(self, video_path, interval):
        """Internal helper to extract frames from video."""
        print(f"\n[STEP 1] Extracting frames from: {video_path}")
        cap = cv2.VideoCapture(video_path)
        
        fps = cap.get(cv2.CAP_PROP_FPS)
        if fps == 0: fps = 30
        
        frame_interval = int(fps * interval)
        frame_count = 0
        saved_count = 0

        # Clean old frames to avoid mixing data
        self._clear_folder(self.raw_frames_folder)

        while True:
            ret, frame = cap.read()
            if not ret: break

            if frame_count % frame_interval == 0:
                filename = f"frame_{saved_count:04d}.jpg"
                filepath = os.path.join(self.raw_frames_folder, filename)
                cv2.imwrite(filepath, frame)
                saved_count += 1
            
            frame_count += 1

        cap.release()
        print(f"   -> Extracted {saved_count} frames.")

    def _detect_faces_in_frames(self):
        """Internal helper to detect faces in the extracted frames."""
        print(f"\n[STEP 2] Running Detection...")
        images = glob.glob(os.path.join(self.raw_frames_folder, "*.jpg"))
        saved_face_paths = []

        for img_path in images:
            frame = cv2.imread(img_path)
            if frame is None: continue

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            gray = cv2.equalizeHist(gray) # Improve contrast

            # Strict settings to reduce false positives
            faces = self.face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=8,
                minSize=(60, 60)
            )

            for (x, y, w, h) in faces:
                padding = 10
                x_start = max(0, x - padding)
                y_start = max(0, y - padding)
                x_end = min(frame.shape[1], x + w + padding)
                y_end = min(frame.shape[0], y + h + padding)

                face_roi = frame[y_start:y_end, x_start:x_end]
                
                ts = datetime.now().strftime("%H%M%S%f")
                save_name = f"face_{ts}.jpg"
                save_path = os.path.join(self.detected_faces_folder, save_name)
                
                cv2.imwrite(save_path, face_roi)
                saved_face_paths.append(save_path)
                print(f"   [MATCH] Saved: {save_name}")

        print(f"[INFO] Process Complete. {len(saved_face_paths)} faces saved.")
        return saved_face_paths

    def _clear_folder(self, folder_path):
        """Helper to remove old files before starting."""
        files = glob.glob(os.path.join(folder_path, "*"))
        for f in files:
            os.remove(f)

# --- EXAMPLE USAGE BLOCK ---
if __name__ == "__main__":
    # 1. Initialize the 'Model'
    model = FaceExtractionModel(output_directory='my_face_dataset')
    
    # 2. Define video source
    target_video = "test_video.mp4"
    
    # 3. Run the model
    # This single line can now be used in any other script!
    if os.path.exists(target_video):
        detected_files = model.process_video(target_video, interval=1.0)
        print(f"\nResult: Successfully processed. {len(detected_files)} faces are ready.")
    else:
        print(f"Please provide a video file named '{target_video}' to test.")