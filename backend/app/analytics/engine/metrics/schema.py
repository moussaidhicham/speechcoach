from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any

@dataclass 
class VideoMetadata:
    filename: str
    duration_seconds: float
    fps: float
    resolution: tuple[int, int]
    detected_language: str = "unknown"

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
    total_duration: float = 0.0
    # Add prosody metrics later (pitch_mean, volume_mean)

@dataclass
class VisionMetrics:
    face_presence_ratio: float = 0.0
    eye_contact_ratio: float = 0.0
    hands_visibility_ratio: float = 0.0
    hands_activity_score: float = 0.0 # 0.0 (static) to 1.0 (very active)
    avg_brightness: float = 0.0
    avg_blur: float = 0.0

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
    
    def to_dict(self) -> Dict[str, Any]:
        import dataclasses
        return dataclasses.asdict(self)
