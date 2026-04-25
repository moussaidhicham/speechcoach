from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any

@dataclass 
class VideoMetadata:
    filename: str
    duration_seconds: float
    fps: float
    resolution: tuple[int, int]
    detected_language: str = "unknown"
    device_type: str = "unknown"
    device_source: str = "fallback"
    device_confidence: float = 0.0
    experience_level: Optional[str] = None
    current_goal: Optional[str] = None
    weak_points: Optional[str] = None
    processing_time: float = 0.0

@dataclass
class Scores:
    voice_score: float = 0.0          # /10
    presence_score: float = 0.0       # /10
    body_language_score: float = 0.0  # /10
    scene_score: float = 0.0          # /10
    overall_score: float = 0.0        # /100

@dataclass
class AudioMetrics:
    wpm: float = 0.0  
    pause_count: int = 0
    pause_duration_total: float = 0.0
    filler_count: int = 0
    stutter_count: int = 0
    total_duration: float = 0.0
    pitch_mean_hz: float = 0.0
    pitch_std_semitones: float = 0.0
    voiced_ratio: float = 0.0
    rms_dynamic_range_db: float = 0.0

@dataclass
class VisionMetrics:
    face_presence_ratio: float = 0.0
    eye_contact_ratio: float = 0.0
    hands_visibility_ratio: float = 0.0
    hands_activity_score: float = 0.0  # /10, where 0 = very static and 10 = very agitated
    avg_brightness: float = 0.0
    avg_blur: float = 0.0
    smile_intensity_mean: float = 0.0
    brow_tension_mean: float = 0.0
    eye_open_ratio_mean: float = 0.0
    blink_rate_proxy_per_min: float = 0.0
    pitch_std: float = 0.0
    yaw_std: float = 0.0

@dataclass
class TranscriptionSegment:
    start: float
    end: float
    text: str

@dataclass
class Recommendation:
    category: str  # Voice, Posture, Content
    severity: str  # Critical, Warning, Info
    message: str
    actionable_tip: str
    exercise_key: str = ""

@dataclass
class SpeechCoachReport:
    metadata: VideoMetadata
    transcript: List[TranscriptionSegment] = field(default_factory=list)
    audio_metrics: AudioMetrics = field(default_factory=AudioMetrics)
    vision_metrics: VisionMetrics = field(default_factory=VisionMetrics)
    scores: Scores = field(default_factory=Scores)
    strengths: List[str] = field(default_factory=list)
    weaknesses: List[str] = field(default_factory=list)
    recommendations: List[Recommendation] = field(default_factory=list)
    retrieved_documents: List[Dict[str, Any]] = field(default_factory=list)
    eq_metrics: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        import dataclasses
        return dataclasses.asdict(self)


# Emotion Scores Schema (for documentation)
# eq_metrics["emotion_scores"] structure:
# {
#     "rule_based": {
#         "emotions": {"neutral": float, "happy": float, ...},
#         "eq_scores": {"stress": int, "confidence": int, "articulation": int},
#         "method": "rule_based"
#     },
#     "model_based": {
#         "audio_emotions": {"neutral": float, "happy": float, ...},
#         "vision_emotions": {"neutral": float, "happy": float, ...},
#         "fused_emotions": {"neutral": float, "happy": float, ...},
#         "eq_scores": {"stress": int, "confidence": int, "articulation": int},
#         "method": "model_based"
#     }
# }
