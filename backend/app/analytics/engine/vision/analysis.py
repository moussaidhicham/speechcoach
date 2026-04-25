import glob
import os
import logging
import sys
import subprocess
import json
from typing import Tuple, List, Dict, Any, Optional

from app.analytics.engine.metrics.schema import VisionMetrics

logger = logging.getLogger(__name__)

# Heuristic calibration for wrist movement:
# - movement is measured from normalized wrist deltas between consecutive analyzed frames
# - we map that average movement to a pedagogical 0-10 agitation scale
# - 0 = very static hands, 10 = very agitated hands
HAND_ACTIVITY_NORMALIZATION_FACTOR = 100.0

DEVICE_GAZE_PROFILES = {
    "unknown": {"pitch_min": -30.0, "pitch_max": 10.0, "yaw_abs": 15.0},
    "laptop_desktop": {"pitch_min": -32.0, "pitch_max": 8.0, "yaw_abs": 15.0},
    "tablet": {"pitch_min": -25.0, "pitch_max": 12.0, "yaw_abs": 25.0},
    "smartphone": {"pitch_min": -18.0, "pitch_max": 18.0, "yaw_abs": 18.0},
}

EYE_CLOSED_THRESHOLDS = {
    "unknown": 0.22,
    "laptop_desktop": 0.22,
    "tablet": 0.2,
    "smartphone": 0.18,
}


def _distance(landmarks, idx_a: int, idx_b: int) -> float:
    """Calculate distance between two landmarks. Moved to subprocess for isolation."""
    import numpy as np
    a = landmarks[idx_a]
    b = landmarks[idx_b]
    return float(np.hypot(a.x - b.x, a.y - b.y))


def _safe_ratio(num: float, den: float, default: float = 0.0) -> float:
    if den <= 1e-6:
        return default
    return float(num / den)


def _compute_face_eq_proxies(landmarks) -> Dict[str, float]:
    """Compute facial emotion proxies from landmarks. Moved to subprocess for isolation."""
    import numpy as np
    # Distances in normalized image coordinates, then ratio-normalized.
    face_width = _distance(landmarks, 234, 454)
    mouth_width = _distance(landmarks, 61, 291)
    lip_opening = _distance(landmarks, 13, 14)

    # Smile proxy: lip spread normalized by face width.
    smile_intensity = _safe_ratio(mouth_width, face_width)

    left_eye_width = _distance(landmarks, 33, 133)
    right_eye_width = _distance(landmarks, 263, 362)
    eye_width = max((left_eye_width + right_eye_width) / 2.0, 1e-6)

    left_eye_open = _safe_ratio(_distance(landmarks, 159, 145), left_eye_width)
    right_eye_open = _safe_ratio(_distance(landmarks, 386, 374), right_eye_width)
    eye_open_ratio = (left_eye_open + right_eye_open) / 2.0

    # Brows closer to upper eyelid generally indicate tension/frown.
    brow_eye_left = _safe_ratio(_distance(landmarks, 105, 159), eye_width)
    brow_eye_right = _safe_ratio(_distance(landmarks, 334, 386), eye_width)
    brow_eye_mean = (brow_eye_left + brow_eye_right) / 2.0
    brow_tension = float(np.clip(1.0 - (brow_eye_mean / 1.25), 0.0, 1.0))

    lip_compression = float(np.clip(1.0 - _safe_ratio(lip_opening, mouth_width), 0.0, 1.0))

    return {
        "smile_intensity": smile_intensity,
        "brow_tension": brow_tension,
        "eye_open_ratio": eye_open_ratio,
        "lip_compression": lip_compression,
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
    Moved to subprocess for isolation.
    """
    import numpy as np
    import cv2
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

def _vision_subprocess_worker(frames_dir: str, device_type: str, frame_sampling_fps: float) -> Dict[str, Any]:
    """
    Subprocess worker that performs vision analysis with isolated imports.
    This prevents Protobuf conflicts with MediaPipe on Windows.
    """
    import cv2
    import numpy as np
    import mediapipe as mp
    import glob
    import os
    
    # MediaPipe solutions aliases (imported inside subprocess)
    mp_face_mesh = mp.solutions.face_mesh
    mp_hands = mp.solutions.hands
    
    # Re-import helper functions with their isolated imports
    def _distance(landmarks, idx_a: int, idx_b: int) -> float:
        a = landmarks[idx_a]
        b = landmarks[idx_b]
        return float(np.hypot(a.x - b.x, a.y - b.y))
    
    def _safe_ratio(num: float, den: float, default: float = 0.0) -> float:
        if den <= 1e-6:
            return default
        return float(num / den)
    
    def _compute_face_eq_proxies(landmarks) -> Dict[str, float]:
        face_width = _distance(landmarks, 234, 454)
        mouth_width = _distance(landmarks, 61, 291)
        lip_opening = _distance(landmarks, 13, 14)
        smile_intensity = _safe_ratio(mouth_width, face_width)
        left_eye_width = _distance(landmarks, 33, 133)
        right_eye_width = _distance(landmarks, 263, 362)
        eye_width = max((left_eye_width + right_eye_width) / 2.0, 1e-6)
        left_eye_open = _safe_ratio(_distance(landmarks, 159, 145), left_eye_width)
        right_eye_open = _safe_ratio(_distance(landmarks, 386, 374), right_eye_width)
        eye_open_ratio = (left_eye_open + right_eye_open) / 2.0
        brow_eye_left = _safe_ratio(_distance(landmarks, 105, 159), eye_width)
        brow_eye_right = _safe_ratio(_distance(landmarks, 334, 386), eye_width)
        brow_eye_mean = (brow_eye_left + brow_eye_right) / 2.0
        brow_tension = float(np.clip(1.0 - (brow_eye_mean / 1.25), 0.0, 1.0))
        lip_compression = float(np.clip(1.0 - _safe_ratio(lip_opening, mouth_width), 0.0, 1.0))
        return {
            "smile_intensity": smile_intensity,
            "brow_tension": brow_tension,
            "eye_open_ratio": eye_open_ratio,
            "lip_compression": lip_compression,
        }
    
    def get_head_pose(landmarks, image_shape):
        img_h, img_w, _ = image_shape
        face_3d = []
        face_2d = []
        idx_list = [1, 152, 33, 263, 61, 291]
        for idx in idx_list:
            lm = landmarks[idx]
            x, y = int(lm.x * img_w), int(lm.y * img_h)
            face_2d.append([x, y])
            face_3d.append([x, y, lm.z * img_w])
        face_2d = np.array(face_2d, dtype=np.float64)
        face_3d = np.array(face_3d, dtype=np.float64)
        model_points = np.array([
            (0.0, 0.0, 0.0),
            (0.0, 330.0, -65.0),
            (-225.0, -170.0, -135.0),
            (225.0, -170.0, -135.0),
            (-150.0, 150.0, -125.0),
            (150.0, 150.0, -125.0)
        ])
        focal_length = 1 * img_w
        cam_matrix = np.array([[focal_length, 0, img_h / 2],
                              [0, focal_length, img_w / 2],
                              [0, 0, 1]])
        dist_matrix = np.zeros((4, 1), dtype=np.float64)
        success, rot_vec, trans_vec = cv2.solvePnP(model_points, face_2d, cam_matrix, dist_matrix, flags=cv2.SOLVEPNP_ITERATIVE)
        if not success:
            return 0, 0, 0
        rmat, jac = cv2.Rodrigues(rot_vec)
        angles, mtxR, mtxQ, Qx, Qy, Qz = cv2.RQDecomp3x3(rmat)
        return angles[0], angles[1], angles[2]
    
    # Device profiles (re-imported for subprocess)
    DEVICE_GAZE_PROFILES = {
        "unknown": {"pitch_min": -30.0, "pitch_max": 10.0, "yaw_abs": 15.0},
        "laptop_desktop": {"pitch_min": -32.0, "pitch_max": 8.0, "yaw_abs": 15.0},
        "tablet": {"pitch_min": -25.0, "pitch_max": 12.0, "yaw_abs": 25.0},
        "smartphone": {"pitch_min": -18.0, "pitch_max": 18.0, "yaw_abs": 18.0},
    }
    
    EYE_CLOSED_THRESHOLDS = {
        "unknown": 0.22,
        "laptop_desktop": 0.22,
        "tablet": 0.2,
        "smartphone": 0.18,
    }
    
    def is_eye_contact(pitch: float, yaw: float, device_type: str) -> bool:
        profile = DEVICE_GAZE_PROFILES.get(device_type, DEVICE_GAZE_PROFILES["unknown"])
        return (
            profile["pitch_min"] < pitch < profile["pitch_max"]
            and -profile["yaw_abs"] < yaw < profile["yaw_abs"]
        )
    
    # Main analysis logic
    frame_paths = sorted(glob.glob(os.path.join(frames_dir, "*.jpg")))
    total_frames = len(frame_paths)
    
    if total_frames == 0:
        return {"metrics": {}, "frame_data": []}
    
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
        pitch_values = []
        yaw_values = []
        hands_detected_count = 0
        prev_wrist_pos = None
        total_movement = 0.0
        smile_values = []
        brow_tension_values = []
        eye_open_values = []
        eye_closed_events = 0
        prev_eye_closed = False
        brightness_sum = 0
        blur_score_sum = 0
        frame_data_list = []
        
        for i, path in enumerate(frame_paths):
            image = cv2.imread(path)
            if image is None:
                continue
                
            img_h, img_w, _ = image.shape
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            frame_stats = {
                "frame_idx": i,
                "face_present": False,
                "eye_contact": False,
                "hands_visible": False,
                "pitch": 0.0,
                "yaw": 0.0,
                "hand_intensity": 0.0,
                "smile_intensity": 0.0,
                "brow_tension": 0.0,
                "eye_open_ratio": 0.0,
                "lip_compression": 0.0,
            }
            
            # Quality analysis
            hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
            brightness = hsv[:,:,2].mean()
            brightness_sum += brightness
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            blur_score_sum += laplacian_var
            
            # Face detection
            results_face = FACE_MESH.process(rgb_image)
            if results_face.multi_face_landmarks:
                landmarks = results_face.multi_face_landmarks[0].landmark
                x_coords = [lm.x for lm in landmarks]
                y_coords = [lm.y for lm in landmarks]
                face_area = (max(x_coords) - min(x_coords)) * (max(y_coords) - min(y_coords))
                
                if face_area > 0.03:
                    face_detected_count += 1
                    frame_stats["face_present"] = True
                    
                    pitch, yaw, roll = get_head_pose(landmarks, (img_h, img_w, 3))
                    pitch_sum += pitch
                    yaw_sum += yaw
                    pitch_values.append(float(pitch))
                    yaw_values.append(float(yaw))
                    frame_stats["pitch"] = pitch
                    frame_stats["yaw"] = yaw
                    
                    eq_proxies = _compute_face_eq_proxies(landmarks)
                    frame_stats["smile_intensity"] = eq_proxies["smile_intensity"]
                    frame_stats["brow_tension"] = eq_proxies["brow_tension"]
                    frame_stats["eye_open_ratio"] = eq_proxies["eye_open_ratio"]
                    frame_stats["lip_compression"] = eq_proxies["lip_compression"]
                    smile_values.append(eq_proxies["smile_intensity"])
                    brow_tension_values.append(eq_proxies["brow_tension"])
                    eye_open_values.append(eq_proxies["eye_open_ratio"])
                    
                    eye_closed_threshold = EYE_CLOSED_THRESHOLDS.get(device_type, EYE_CLOSED_THRESHOLDS["unknown"])
                    is_eye_closed = eq_proxies["eye_open_ratio"] < eye_closed_threshold
                    if is_eye_closed and not prev_eye_closed:
                        eye_closed_events += 1
                    prev_eye_closed = is_eye_closed
                    
                    if is_eye_contact(pitch, yaw, device_type):
                        eye_contact_count += 1
                        frame_stats["eye_contact"] = True
            
            # Hand detection
            results_hands = HANDS.process(rgb_image)
            current_wrist_pos = []
            if results_hands.multi_hand_landmarks:
                hands_detected_count += 1
                frame_stats["hands_visible"] = True
                for hand_landmarks in results_hands.multi_hand_landmarks:
                    wrist = hand_landmarks.landmark[0]
                    current_wrist_pos.append((wrist.x, wrist.y))
            
            if prev_wrist_pos and current_wrist_pos:
                move_dist = 0
                count = 0
                for curr_w in current_wrist_pos:
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
            frame_data_list.append(frame_stats)
    
    # Compute metrics
    face_presence_ratio = face_detected_count / total_frames if total_frames > 0 else 0
    avg_brightness = brightness_sum / total_frames if total_frames > 0 else 0
    avg_blur = blur_score_sum / total_frames if total_frames > 0 else 0
    avg_pitch = pitch_sum / face_detected_count if face_detected_count > 0 else 0
    avg_yaw = yaw_sum / face_detected_count if face_detected_count > 0 else 0
    pitch_std = float(np.std(pitch_values)) if pitch_values else 0.0
    yaw_std = float(np.std(yaw_values)) if yaw_values else 0.0
    eye_contact_ratio = eye_contact_count / face_detected_count if face_detected_count > 0 else 0.0
    hands_visibility_ratio = hands_detected_count / total_frames if total_frames > 0 else 0.0
    avg_movement_per_frame = total_movement / hands_detected_count if hands_detected_count > 0 else 0
    hands_activity_score = min(avg_movement_per_frame * 100.0, 10.0)
    smile_intensity_mean = float(np.mean(smile_values)) if smile_values else 0.0
    brow_tension_mean = float(np.mean(brow_tension_values)) if brow_tension_values else 0.0
    eye_open_ratio_mean = float(np.mean(eye_open_values)) if eye_open_values else 0.0
    analyzed_minutes = (face_detected_count / frame_sampling_fps) / 60.0 if face_detected_count > 0 else 0.0
    blink_rate_proxy_per_min = (eye_closed_events / analyzed_minutes) if analyzed_minutes > 0 else 0.0
    
    metrics = {
        "face_presence_ratio": round(face_presence_ratio, 2),
        "eye_contact_ratio": round(eye_contact_ratio, 2),
        "hands_visibility_ratio": round(hands_visibility_ratio, 2),
        "hands_activity_score": round(hands_activity_score, 1),
        "avg_brightness": round(avg_brightness, 1),
        "avg_blur": round(avg_blur, 1),
        "smile_intensity_mean": round(smile_intensity_mean, 3),
        "brow_tension_mean": round(brow_tension_mean, 3),
        "eye_open_ratio_mean": round(eye_open_ratio_mean, 3),
        "blink_rate_proxy_per_min": round(blink_rate_proxy_per_min, 2),
        "pitch_std": round(pitch_std, 3),
        "yaw_std": round(yaw_std, 3),
    }
    
    return {"metrics": metrics, "frame_data": frame_data_list}


def analyze_frames(
    frames_dir: str,
    device_type: Optional[str] = None,
    frame_sampling_fps: float = 1.0,
) -> Tuple[VisionMetrics, List[Dict[str, Any]]]:
    """
    Analyzes all images in the frames directory using Nuclear Isolation pattern.
    All heavy ML imports happen in a subprocess to prevent Protobuf conflicts.
    """
    if not os.path.exists(frames_dir):
        logger.error(f"Frames directory not found: {frames_dir}")
        return VisionMetrics(), []

    frame_paths = sorted(glob.glob(os.path.join(frames_dir, "*.jpg")))
    total_frames = len(frame_paths)
    
    if total_frames == 0:
        logger.warning("No frames found to analyze.")
        return VisionMetrics(), []

    normalized_device_type = normalize_device_type(device_type)
    logger.info(f"Analyzing vision on {total_frames} frames (device_type={normalized_device_type})...")

    # Create subprocess script content
    worker_script = f"""
import sys
import json
import os

# Add the app directory to path
sys.path.insert(0, r'{os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))}')

from app.analytics.engine.vision.analysis import _vision_subprocess_worker

if __name__ == "__main__":
    frames_dir = r'{frames_dir}'
    device_type = '{normalized_device_type}'
    frame_sampling_fps = {frame_sampling_fps}
    
    result = _vision_subprocess_worker(frames_dir, device_type, frame_sampling_fps)
    print(json.dumps(result))
"""

    # Run subprocess with isolated environment
    env = os.environ.copy()
    env['SPEECHCOACH_ISOLATED_VISION'] = '1'
    env['TF_USE_LEGACY_KERAS'] = '1'
    
    try:
        result = subprocess.run(
            [sys.executable, '-c', worker_script],
            capture_output=True,
            text=True,
            env=env,
            timeout=300  # 5 minute timeout
        )
        
        if result.returncode != 0:
            logger.error(f"Vision subprocess failed: {result.stderr}")
            return VisionMetrics(), []
        
        output = json.loads(result.stdout)
        metrics_dict = output.get('metrics', {})
        frame_data = output.get('frame_data', [])
        
        metrics = VisionMetrics(**metrics_dict)
        
        logger.info(
            f"Vision Analysis - Face: {metrics.face_presence_ratio:.0%}, Eye Contact: {metrics.eye_contact_ratio:.0%} "
            f"(Device={normalized_device_type})"
        )
        logger.info(f"Hand Analysis - Visibility: {metrics.hands_visibility_ratio:.0%}, Activity Score: {metrics.hands_activity_score:.1f}/10")
        
        return metrics, frame_data
        
    except subprocess.TimeoutExpired:
        logger.error("Vision subprocess timed out after 5 minutes")
        return VisionMetrics(), []
    except Exception as e:
        logger.error(f"Vision subprocess error: {e}")
        return VisionMetrics(), []
