from __future__ import annotations

from typing import Any, Dict, List, Tuple

from app.analytics.engine.metrics.schema import AudioMetrics, VisionMetrics


EQ_DEVICE_PROFILES: Dict[str, Dict[str, float]] = {
    "unknown": {
        "eye_contact_good": 0.62,
        "head_std_high": 9.0,
        "blink_proxy_high": 26.0,
        "hands_agitation_high": 7.2,
    },
    "laptop_desktop": {
        "eye_contact_good": 0.65,
        "head_std_high": 8.5,
        "blink_proxy_high": 24.0,
        "hands_agitation_high": 7.0,
    },
    "tablet": {
        "eye_contact_good": 0.60,
        "head_std_high": 9.5,
        "blink_proxy_high": 26.0,
        "hands_agitation_high": 7.4,
    },
    "smartphone": {
        "eye_contact_good": 0.55,
        "head_std_high": 11.0,
        "blink_proxy_high": 28.0,
        "hands_agitation_high": 7.6,
    },
}


def _clamp01(value: float) -> float:
    return float(min(1.0, max(0.0, value)))


def _safe_rate(count: float, duration_seconds: float) -> float:
    minutes = max(duration_seconds / 60.0, 1.0 / 6.0)
    return float(count / minutes)


def _wpm_balance(wpm: float, low: float = 120.0, high: float = 160.0) -> float:
    if low <= wpm <= high:
        return 1.0
    if wpm < low:
        return _clamp01(1.0 - ((low - wpm) / 60.0))
    return _clamp01(1.0 - ((wpm - high) / 60.0))


def _range_balance(value: float, low: float, high: float, tolerance: float = 6.0) -> float:
    if low <= value <= high:
        return 1.0
    if value < low:
        return _clamp01(1.0 - ((low - value) / max(tolerance, 1e-6)))
    return _clamp01(1.0 - ((value - high) / max(tolerance, 1e-6)))


def _top_messages(items: List[Tuple[float, str]], limit: int = 3) -> List[str]:
    ranked = sorted(items, key=lambda item: item[0], reverse=True)
    return [message for score, message in ranked if score > 0.02][:limit]


def _quality_reliability(vision: VisionMetrics, audio: AudioMetrics, device_confidence: float) -> Dict[str, float]:
    face_track = _clamp01(vision.face_presence_ratio)
    image_clarity = _clamp01((vision.avg_blur - 10.0) / 45.0)
    audio_duration = _clamp01(audio.total_duration / 45.0)
    device_certainty = _clamp01(device_confidence)

    prosody_coverage = _clamp01(audio.voiced_ratio / 0.45) if audio.voiced_ratio > 0 else 0.0
    prosody_dynamics = _clamp01(audio.rms_dynamic_range_db / 16.0) if audio.rms_dynamic_range_db > 0 else 0.0
    prosody_quality = round((0.6 * prosody_coverage) + (0.4 * prosody_dynamics), 3)

    overall = round(
        (0.30 * face_track)
        + (0.15 * image_clarity)
        + (0.15 * audio_duration)
        + (0.15 * device_certainty)
        + (0.25 * prosody_quality),
        3,
    )
    return {
        "overall": overall,
        "face_track": round(face_track, 3),
        "image_clarity": round(image_clarity, 3),
        "audio_duration": round(audio_duration, 3),
        "device_certainty": round(device_certainty, 3),
        "prosody_quality": prosody_quality,
    }


def compute_eq_metrics(
    audio: AudioMetrics,
    vision: VisionMetrics,
    device_type: str,
    device_source: str,
    device_confidence: float,
) -> Dict[str, Any]:
    profile = EQ_DEVICE_PROFILES.get(device_type, EQ_DEVICE_PROFILES["unknown"])
    fillers_per_min = _safe_rate(audio.filler_count, audio.total_duration)
    pauses_per_min = _safe_rate(audio.pause_count, audio.total_duration)
    stutters_per_min = _safe_rate(audio.stutter_count, audio.total_duration)

    disfluency_risk = _clamp01(
        (
            _clamp01(fillers_per_min / 4.0)
            + _clamp01(pauses_per_min / 10.0)
            + _clamp01(stutters_per_min / 2.0)
        )
        / 3.0
    )
    eye_contact_conf = _clamp01(vision.eye_contact_ratio / max(profile["eye_contact_good"], 1e-6))
    low_eye_contact_risk = _clamp01((profile["eye_contact_good"] - vision.eye_contact_ratio) / profile["eye_contact_good"])
    head_instability_risk = _clamp01(((vision.pitch_std + vision.yaw_std) / 2.0) / max(profile["head_std_high"], 1.0))
    hand_agitation_risk = _clamp01((vision.hands_activity_score - 4.5) / (profile["hands_agitation_high"] - 4.5))
    blink_risk = _clamp01(vision.blink_rate_proxy_per_min / max(profile["blink_proxy_high"], 1.0))
    brow_risk = _clamp01(vision.brow_tension_mean)
    pitch_instability_risk = _clamp01(audio.pitch_std_semitones / 5.0) if audio.pitch_std_semitones > 0 else 0.0
    energy_instability_risk = 1.0 - _range_balance(audio.rms_dynamic_range_db, 8.0, 18.0, tolerance=8.0)
    hand_weight_factor = 0.7 if eye_contact_conf >= 0.95 and disfluency_risk <= 0.35 else 1.0

    stress_components = {
        "disfluency": 0.22 * disfluency_risk,
        "eye_contact": 0.25 * low_eye_contact_risk,
        "head": 0.14 * head_instability_risk,
        "hands": 0.05 * hand_agitation_risk * hand_weight_factor,
        "blink": 0.08 * blink_risk,
        "brow": 0.08 * brow_risk,
        "pitch": 0.09 * pitch_instability_risk,
        "energy": 0.09 * energy_instability_risk,
    }
    stress_index = sum(stress_components.values())
    stress_score = int(round(_clamp01(stress_index) * 100))

    pace_balance = _wpm_balance(
        audio.wpm,
        low=115.0 if device_type == "smartphone" else 120.0,
        high=165.0 if device_type == "smartphone" else 160.0,
    )
    head_stability = 1.0 - head_instability_risk
    fluency = 1.0 - disfluency_risk
    smile_presence = _clamp01(vision.smile_intensity_mean / 0.36)
    voice_stability = 1.0 - pitch_instability_risk
    voice_support = _clamp01((audio.voiced_ratio * 0.6) + (0.4 * _range_balance(audio.rms_dynamic_range_db, 8.0, 18.0, 8.0)))

    confidence_components = {
        "eye_contact": 0.40 * eye_contact_conf,
        "pace": 0.18 * pace_balance,
        "head_stability": 0.15 * head_stability,
        "fluency": 0.20 * fluency,
        "smile": 0.03 * smile_presence,
        "voice_stability": 0.02 * voice_stability,
        "voice_support": 0.02 * voice_support,
    }
    confidence_index = sum(confidence_components.values())
    confidence_score = int(round(_clamp01(confidence_index) * 100))

    articulation_components = {
        "fluency": 0.45 * fluency,
        "pace": 0.18 * _wpm_balance(audio.wpm),
        "pause_rate": 0.10 * max(0.0, 1.0 - (pauses_per_min / 15.0)),
        "pause_duration": 0.10 * _clamp01(1.0 - _clamp01(audio.pause_duration_total / max(audio.total_duration, 1.0))),
        "voice_support": 0.10 * voice_support,
        "pitch_stability": 0.07 * voice_stability,
    }
    articulation_index = sum(articulation_components.values())
    articulation_score = int(round(_clamp01(articulation_index) * 100))

    reliability = _quality_reliability(vision, audio, device_confidence)
    reliability_score = reliability["overall"]
    should_interpret = reliability_score >= 0.55
    if reliability_score >= 0.60:
        interpretation = "strong"
    elif reliability_score >= 0.45:
        interpretation = "cautious"
    else:
        interpretation = "weak"

    flags: List[str] = []
    if stress_score >= 70:
        flags.append("high_stress_proxy")
    if confidence_score >= 70:
        flags.append("confident_delivery_proxy")
    if articulation_score < 55:
        flags.append("articulation_to_reinforce")
    if vision.face_presence_ratio < 0.65:
        flags.append("low_face_track_reliability")
    if reliability_score < 0.55:
        flags.append("low_signal_reliability")
    if device_confidence < 0.5:
        flags.append("uncertain_device_profile")

    stress_drivers = _top_messages(
        [
            (stress_components["eye_contact"], f"Contact visuel faible ({round(vision.eye_contact_ratio * 100)}%)."),
            (stress_components["disfluency"], f"Disfluences vocales (pauses/fillers/stutters) au-dessus du confort."),
            (stress_components["head"], f"Stabilite de tete a renforcer (pitch/yaw variables)."),
            (stress_components["pitch"], f"Variabilite de pitch elevee ({audio.pitch_std_semitones:.2f} st)."),
            (stress_components["energy"], f"Dynamique vocale hors zone stable ({audio.rms_dynamic_range_db:.1f} dB)."),
            (stress_components["brow"], f"Tension sourcils perceptible."),
        ]
    )

    confidence_limiters = _top_messages(
        [
            (0.30 * (1.0 - eye_contact_conf), f"Le regard camera reste faible ({round(vision.eye_contact_ratio * 100)}%)."),
            (0.18 * (1.0 - pace_balance), f"Le rythme sort de la zone cible ({audio.wpm:.1f} mots/min)."),
            (0.20 * (1.0 - head_stability), f"La stabilite de posture tete peut etre amelioree."),
            (0.10 * (1.0 - fluency), f"Les disfluences diminuent la perception de maitrise."),
            (0.09 * (1.0 - voice_stability), f"La stabilite de voix (pitch) reste a consolider."),
            (0.05 * (1.0 - voice_support), f"La couverture vocale utile est limitee ({round(audio.voiced_ratio * 100)}%)."),
        ]
    )
    confidence_boosters = _top_messages(
        [
            (confidence_components["head_stability"], "Posture tete globalement stable."),
            (confidence_components["pace"], "Rythme proche de la zone cible."),
            (confidence_components["fluency"], "Peu de disfluences detectees."),
            (confidence_components["voice_support"], "Bonne assise vocale (voiced ratio + dynamique)."),
        ]
    )

    articulation_limiters = _top_messages(
        [
            (0.35 * (1.0 - fluency), "Fluidite verbale a renforcer (fillers/pauses/stutters)."),
            (0.19 * (1.0 - _wpm_balance(audio.wpm)), f"Rythme verbal hors zone optimale ({audio.wpm:.1f} mots/min)."),
            (0.16 * _clamp01(pauses_per_min / 8.0), f"Frequence des pauses elevee ({pauses_per_min:.1f}/min)."),
            (
                0.10 * _clamp01(audio.pause_duration_total / max(audio.total_duration, 1.0)),
                f"Part du temps en silence notable ({audio.pause_duration_total:.1f}s).",
            ),
            (0.10 * (1.0 - voice_stability), "Stabilite de pitch perfectible pour l'articulation percue."),
        ]
    )

    return {
        "version": "v2",
        "device_profile": device_type or "unknown",
        "device_source": device_source or "fallback",
        "device_confidence": round(_clamp01(device_confidence), 3),
        "reliability": reliability,
        "interpretation": {
            "label": interpretation,
            "should_interpret": should_interpret,
            "threshold": 0.55,
        },
        "scores": {
            "stress": stress_score,
            "confidence": confidence_score,
            "articulation": articulation_score,
        },
        "objectives": {
            "stress": {
                "direction": "lower_better",
                "aspects": [
                    "pauses/fillers/stutters",
                    "stabilite tete",
                    "stabilite voix (pitch/energie)",
                    "contact visuel",
                    "agitation gestuelle",
                ],
            },
            "confidence": {
                "direction": "higher_better",
                "aspects": [
                    "contact visuel",
                    "stabilite tete",
                    "stabilite voix",
                    "rythme de parole",
                    "fluidite verbale",
                ],
            },
            "articulation": {
                "direction": "higher_better",
                "aspects": [
                    "fillers/stutters",
                    "frequence des pauses",
                    "duree des silences",
                    "rythme (wpm)",
                    "support vocal (voiced ratio)",
                ],
            },
        },
        "vision": {
            "smile_intensity_mean": round(float(vision.smile_intensity_mean), 3),
            "brow_tension_mean": round(float(vision.brow_tension_mean), 3),
            "eye_open_ratio_mean": round(float(vision.eye_open_ratio_mean), 3),
            "blink_rate_proxy_per_min": round(float(vision.blink_rate_proxy_per_min), 2),
            "pitch_std": round(float(vision.pitch_std), 3),
            "yaw_std": round(float(vision.yaw_std), 3),
        },
        "audio": {
            "wpm": round(float(audio.wpm), 1),
            "fillers_per_min": round(fillers_per_min, 2),
            "pauses_per_min": round(pauses_per_min, 2),
            "stutters_per_min": round(stutters_per_min, 2),
            "pause_duration_total": round(float(audio.pause_duration_total), 2),
            "pitch_mean_hz": round(float(audio.pitch_mean_hz), 2),
            "pitch_std_semitones": round(float(audio.pitch_std_semitones), 3),
            "voiced_ratio": round(float(audio.voiced_ratio), 3),
            "rms_dynamic_range_db": round(float(audio.rms_dynamic_range_db), 2),
        },
        "components": {
            "stress": {k: round(v, 4) for k, v in stress_components.items()},
            "confidence": {k: round(v, 4) for k, v in confidence_components.items()},
            "articulation": {k: round(v, 4) for k, v in articulation_components.items()},
        },
        "explanations": {
            "stress_drivers": stress_drivers,
            "confidence_limiters": confidence_limiters,
            "confidence_boosters": confidence_boosters,
            "articulation_limiters": articulation_limiters,
        },
        "flags": flags,
    }
