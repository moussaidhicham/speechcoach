import cv2
import glob
import os
import logging
import numpy as np
import mediapipe as mp
from metrics.schema import VisionMetrics

logger = logging.getLogger(__name__)

# Initialize MediaPipe Face Mesh
mp_face_mesh = mp.solutions.face_mesh
FACE_MESH = mp_face_mesh.FaceMesh(
    static_image_mode=True,
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.5
)

def analyze_frames(frames_dir: str) -> VisionMetrics:
    """
    Analyzes all images in the frames directory.
    Returns:
        - Face Presence Ratio (0.0 - 1.0)
    """
    if not os.path.exists(frames_dir):
        logger.error(f"Frames directory not found: {frames_dir}")
        return VisionMetrics()

    frame_paths = sorted(glob.glob(os.path.join(frames_dir, "*.jpg")))
    total_frames = len(frame_paths)
    
    if total_frames == 0:
        logger.warning("No frames found to analyze.")
        return VisionMetrics()

    logger.info(f"Analyzing vision on {total_frames} frames...")

    face_detected_count = 0
    
    # We can add quality analysis too
    brightness_sum = 0
    blur_score_sum = 0

    for path in frame_paths:
        image = cv2.imread(path)
        if image is None:
            continue
            
        # 1. Quality (Brightness / Blur)
        # Brightness (HSV Value channel avg)
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        brightness = hsv[:,:,2].mean()
        brightness_sum += brightness
        
        # Blur (Laplacian variance)
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        blur_score_sum += laplacian_var

        # 2. Face Detection (MediaPipe)
        # MediaPipe expects RGB
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = FACE_MESH.process(rgb_image)
        
        if results.multi_face_landmarks:
            face_detected_count += 1
            # Here we could extract head pose, eye contact, etc. (Sprint 4)

    # Metrics computation
    face_presence_ratio = face_detected_count / total_frames
    avg_brightness = brightness_sum / total_frames
    avg_blur = blur_score_sum / total_frames
    
    logger.info(f"Vision Analysis - Face Presence: {face_presence_ratio:.2%}, Avg Brightness: {avg_brightness:.1f}")

    return VisionMetrics(
        face_presence_ratio=round(face_presence_ratio, 2),
        eye_contact_ratio=0.0, # Next Sprint
        hands_activity_score=0.0 # Next Sprint
    )
