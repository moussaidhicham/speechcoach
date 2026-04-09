import cv2
import glob
import os
import logging
import numpy as np
import mediapipe as mp
from app.analytics.engine.metrics.schema import VisionMetrics
from typing import Tuple, List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# MediaPipe solutions aliases
mp_face_mesh = mp.solutions.face_mesh
mp_hands = mp.solutions.hands

DEVICE_GAZE_PROFILES = {
    "unknown": {"pitch_min": -30.0, "pitch_max": 10.0, "yaw_abs": 15.0},
    "laptop_desktop": {"pitch_min": -32.0, "pitch_max": 8.0, "yaw_abs": 15.0},
    "tablet": {"pitch_min": -25.0, "pitch_max": 12.0, "yaw_abs": 25.0},
    "smartphone": {"pitch_min": -18.0, "pitch_max": 18.0, "yaw_abs": 18.0},
}


def normalize_device_type(device_type: Optional[str]) -> str:
    if not device_type:
        return "unknown"
    value = str(device_type).strip().lower()
    aliases = {
        "laptop": "laptop_desktop",
        "desktop": "laptop_desktop",
        "pc": "laptop_desktop",
        "tablet_landscape": "tablet",
        "phone": "smartphone",
        "mobile": "smartphone",
    }
    return aliases.get(value, value if value in DEVICE_GAZE_PROFILES else "unknown")


def is_eye_contact(pitch: float, yaw: float, device_type: str) -> bool:
    profile = DEVICE_GAZE_PROFILES.get(device_type, DEVICE_GAZE_PROFILES["unknown"])
    return (
        profile["pitch_min"] < pitch < profile["pitch_max"]
        and -profile["yaw_abs"] < yaw < profile["yaw_abs"]
    )


def get_head_pose(landmarks, image_shape):
    """
    Estimates Head Pose (Yaw, Pitch, Roll) from MediaPipe Landmarks.
    """
    img_h, img_w, _ = image_shape
    face_3d = []
    face_2d = []

    # Indicies for PnP
    # Nose tip, Chin, Left Eye Left, Right Eye Right, Left Mouth, Right Mouth
    idx_list = [1, 152, 33, 263, 61, 291]

    for idx in idx_list:
        lm = landmarks[idx]
        x, y = int(lm.x * img_w), int(lm.y * img_h)
        face_2d.append([x, y]) 
        face_3d.append([x, y, lm.z * img_w]) # MP gives normalized Z, scaling by width approximates real depth

    face_2d = np.array(face_2d, dtype=np.float64)
    face_3d = np.array(face_3d, dtype=np.float64)

    # Generic 3D model (approximation)
    # We can use the 3D landmarks from MP directly for "pseudo-3D"
    # Or use a standard model. Let's use the MP 3D landmarks relative to the nose or just PnP on 2D
    
    # Standard 6-point Generic 3D Face Model (in arbitrary units)
    # Nose tip, Chin, Left Eye Left, Right Eye Right, Left Mouth, Right Mouth
    # (Approximated values commonly used in CV)
    # Aligning with OpenCV Coordinate System: X Right, Y Down, Z Forward
    # Nose is at (0,0,0).
    # Chin is BELOW nose -> Positive Y (+330)
    # Eyes are ABOVE nose -> Negative Y (-170)
    # Mouth is BELOW nose -> Positive Y (+150)
    model_points = np.array([
        (0.0, 0.0, 0.0),             # Nose tip
        (0.0, 330.0, -65.0),         # Chin
        (-225.0, -170.0, -135.0),    # Left eye left corner
        (225.0, -170.0, -135.0),     # Right eye right corner
        (-150.0, 150.0, -125.0),     # Left Mouth corner
        (150.0, 150.0, -125.0)       # Right mouth corner
    ])

    focal_length = 1 * img_w
    cam_matrix = np.array([ [focal_length, 0, img_h / 2],
                            [0, focal_length, img_w / 2],
                            [0, 0, 1]])

    dist_matrix = np.zeros((4, 1), dtype=np.float64)

    success, rot_vec, trans_vec = cv2.solvePnP(model_points, face_2d, cam_matrix, dist_matrix, flags=cv2.SOLVEPNP_ITERATIVE)

    if not success:
        return 0, 0, 0

    rmat, jac = cv2.Rodrigues(rot_vec)
    
    # cv2.RQDecomp3x3 usually returns 6 values: (mtxR, mtxQ, Qx, Qy, Qz, euler_angles) 
    # OR (euler_angles, mtxR, mtxQ, Qx, Qy, Qz).
    # From debug output: ((0,0,0), mtxR, mtxQ, Qx, Qy, Qz) -> Angles is first.
    angles, mtxR, mtxQ, Qx, Qy, Qz = cv2.RQDecomp3x3(rmat)

    # Adjust angles
    # PnP returns Euler angles in DEGREES directly for RQDecomp3x3
    pitch = angles[0] 
    yaw = angles[1] 
    roll = angles[2] 

    return pitch, yaw, roll

def analyze_frames(frames_dir: str, device_type: Optional[str] = None) -> Tuple[VisionMetrics, List[Dict[str, Any]]]:
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

    normalized_device_type = normalize_device_type(device_type)
    logger.info(f"Analyzing vision on {total_frames} frames (device_type={normalized_device_type})...")

    # Initialize MediaPipe in the worker thread scope
    with mp_face_mesh.FaceMesh(
        static_image_mode=True,
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.5
    ) as FACE_MESH, \
    mp_hands.Hands(
        static_image_mode=True,
        max_num_hands=2,
        min_detection_confidence=0.5
    ) as HANDS:
        
        face_detected_count = 0
        eye_contact_count = 0
        pitch_sum = 0
        yaw_sum = 0
        
        # Hand metrics
        hands_detected_count = 0
        prev_wrist_pos = None # To track movement
        total_movement = 0.0
        
        # We can add quality analysis too
        brightness_sum = 0
        blur_score_sum = 0
        
        # Store time-series data
        frame_data_list = []

        for i, path in enumerate(frame_paths):
            image = cv2.imread(path)
            if image is None:
                continue
                
            img_h, img_w, _ = image.shape
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Per-frame stats
            frame_stats = {
                "frame_idx": i,
                "face_present": False,
                "eye_contact": False,
                "hands_visible": False,
                "pitch": 0.0,
                "yaw": 0.0,
                "hand_intensity": 0.0
            }

            # 1. Quality (Brightness / Blur) =========================================
            # Brightness (HSV Value channel avg)
            hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
            brightness = hsv[:,:,2].mean()
            brightness_sum += brightness
            
            # Blur (Laplacian variance)
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            blur_score_sum += laplacian_var

            # 2. Face Detection (MediaPipe) ==========================================
            results_face = FACE_MESH.process(rgb_image)
            
            if results_face.multi_face_landmarks:
                landmarks = results_face.multi_face_landmarks[0].landmark
                
                # Calculate bounding box area to ignore background faces
                x_coords = [lm.x for lm in landmarks]
                y_coords = [lm.y for lm in landmarks]
                face_area = (max(x_coords) - min(x_coords)) * (max(y_coords) - min(y_coords))
                
                if face_area > 0.03:  # Face must occupy at least 3% of the image area
                    face_detected_count += 1
                    frame_stats["face_present"] = True
                    
                    # Sprint 4: Head Pose & Eye Contact
                    pitch, yaw, roll = get_head_pose(landmarks, (img_h, img_w, 3))
                    
                    pitch_sum += pitch
                    yaw_sum += yaw
                    frame_stats["pitch"] = pitch
                    frame_stats["yaw"] = yaw
                    
                    if is_eye_contact(pitch, yaw, normalized_device_type):
                        eye_contact_count += 1
                        frame_stats["eye_contact"] = True

                    
            # 3. Hand Detection (MediaPipe) ==========================================
            results_hands = HANDS.process(rgb_image)
            
            current_wrist_pos = []
            if results_hands.multi_hand_landmarks:
                hands_detected_count += 1
                frame_stats["hands_visible"] = True
                
                # Calculate movement (intensity)
                # We track wrist landmarks (index 0)
                for hand_landmarks in results_hands.multi_hand_landmarks:
                    wrist = hand_landmarks.landmark[0]
                    current_wrist_pos.append((wrist.x, wrist.y))
            
            # Calculate speed between frames if hands were present in both
            if prev_wrist_pos and current_wrist_pos:
                # Simple heuristic: averaged distance moved by wrists
                # Match closest wrists if multiple (simple greedy)
                move_dist = 0
                count = 0
                for curr_w in current_wrist_pos:
                    # Find closest prev wrist
                    dists = [np.sqrt((curr_w[0]-pw[0])**2 + (curr_w[1]-pw[1])**2) for pw in prev_wrist_pos]
                    if dists:
                        min_dist = min(dists)
                        move_dist += min_dist
                        count += 1
                
                if count > 0:
                    avg_move = (move_dist / count)
                    total_movement += avg_move
                    frame_stats["hand_intensity"] = avg_move
                    
            prev_wrist_pos = current_wrist_pos if current_wrist_pos else None
                    
            # Append frame data
            frame_data_list.append(frame_stats)

    # Metrics computation
    face_presence_ratio = face_detected_count / total_frames if total_frames > 0 else 0
    avg_brightness = brightness_sum / total_frames if total_frames > 0 else 0
    avg_blur = blur_score_sum / total_frames if total_frames > 0 else 0
    
    avg_pitch = pitch_sum / face_detected_count if face_detected_count > 0 else 0
    avg_yaw = yaw_sum / face_detected_count if face_detected_count > 0 else 0
    
    # Eye contact is ratio of time looking at camera WHEN face is present
    eye_contact_ratio = eye_contact_count / face_detected_count if face_detected_count > 0 else 0.0
    
    # Hand metrics
    hands_visibility_ratio = hands_detected_count / total_frames if total_frames > 0 else 0.0
    # Normalize movement score (heuristic normalization)
    # A distinct movement is usually > 0.05 units per frame. 
    # Let's say avg movement of 0.05 is "High Intensity" (10/10).
    # total_movement is sum of deltas. Average delta per frame with hands:
    avg_movement_per_frame = total_movement / hands_detected_count if hands_detected_count > 0 else 0
    # Tuned factor: 100 instead of 200 to avoid saturation
    hands_activity_score = min(avg_movement_per_frame * 100, 10.0) # Scale to 0-10 roughly
    
    logger.info(
        f"Vision Analysis - Face: {face_presence_ratio:.0%}, Eye Contact: {eye_contact_ratio:.0%} "
        f"(Device={normalized_device_type}, Avg Pitch={avg_pitch:.1f}, Avg Yaw={avg_yaw:.1f})"
    )
    logger.info(f"Hand Analysis - Visibility: {hands_visibility_ratio:.0%}, Activity Score: {hands_activity_score:.1f}/10")

    metrics = VisionMetrics(
        face_presence_ratio=round(face_presence_ratio, 2),
        eye_contact_ratio=round(eye_contact_ratio, 2),
        hands_visibility_ratio=round(hands_visibility_ratio, 2),
        hands_activity_score=round(hands_activity_score, 1),
        avg_brightness=round(avg_brightness, 1),
        avg_blur=round(avg_blur, 1)
    )
    
    return metrics, frame_data_list
