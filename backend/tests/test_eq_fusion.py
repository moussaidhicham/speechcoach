import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.analytics.engine.metrics.eq_fusion import compute_eq_metrics
from app.analytics.engine.metrics.schema import AudioMetrics, VisionMetrics


def test_compute_eq_metrics_returns_expected_shape():
    audio = AudioMetrics(
        wpm=142.0,
        pause_count=6,
        pause_duration_total=9.5,
        filler_count=3,
        stutter_count=1,
        total_duration=120.0,
    )
    vision = VisionMetrics(
        face_presence_ratio=0.88,
        eye_contact_ratio=0.66,
        hands_visibility_ratio=0.51,
        hands_activity_score=4.9,
        avg_brightness=120.0,
        avg_blur=45.0,
        smile_intensity_mean=0.34,
        brow_tension_mean=0.31,
        eye_open_ratio_mean=0.28,
        blink_rate_proxy_per_min=18.0,
        pitch_std=4.8,
        yaw_std=5.1,
    )

    eq = compute_eq_metrics(
        audio,
        vision,
        device_type="laptop_desktop",
        device_source="metadata",
        device_confidence=0.92,
    )

    assert eq["version"] == "v2"
    assert 0 <= eq["scores"]["stress"] <= 100
    assert 0 <= eq["scores"]["confidence"] <= 100
    assert 0 <= eq["scores"]["articulation"] <= 100
    assert 0.0 <= eq["reliability"]["overall"] <= 1.0
    assert isinstance(eq["objectives"]["stress"]["aspects"], list)
    assert isinstance(eq["interpretation"]["should_interpret"], bool)
    assert isinstance(eq["explanations"]["stress_drivers"], list)
    assert isinstance(eq["explanations"]["confidence_limiters"], list)
    assert isinstance(eq["flags"], list)
