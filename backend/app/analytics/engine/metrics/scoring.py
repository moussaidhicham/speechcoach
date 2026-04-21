from typing import List, Tuple

from app.analytics.engine.metrics.schema import AudioMetrics, Recommendation, Scores, VisionMetrics


def _estimated_minutes(audio: AudioMetrics) -> float:
    if audio.total_duration and audio.total_duration > 0:
        return max(audio.total_duration / 60.0, 1.0 / 6.0)
    return 1.0


def calculate_scores(audio: AudioMetrics, vision: VisionMetrics) -> Scores:
    """
    Calculates pedagogical scores (out of 10) based on raw metrics.
    Overall score is out of 100.
    """
    scores = Scores()

    wpm_score = 10.0
    if audio.wpm < 0.1:
        wpm_score = 0.0
    elif audio.wpm < 110:
        wpm_score -= (110 - audio.wpm) * 0.15
    elif audio.wpm > 160:
        wpm_score -= (audio.wpm - 160) * 0.15

    estimated_mins = _estimated_minutes(audio)
    fillers_per_min = audio.filler_count / estimated_mins

    filler_penalty = 0.0
    if fillers_per_min > 2:
        filler_penalty = min((fillers_per_min - 2) * 0.5, 3.0)

    pauses_per_min = audio.pause_count / estimated_mins
    pause_penalty = 0.0
    if pauses_per_min > 4:
        pause_penalty = min((pauses_per_min - 4) * 0.4, 2.5)

    stutters_per_min = audio.stutter_count / estimated_mins
    stutter_penalty = 0.0
    if stutters_per_min > 1:
        stutter_penalty = min((stutters_per_min - 1) * 0.4, 2.0)

    voice_score = max(0.0, min(10.0, wpm_score - filler_penalty - pause_penalty - stutter_penalty))
    scores.voice_score = round(voice_score, 1)

    eye_score = (vision.eye_contact_ratio / 0.9) * 10.0
    if vision.eye_contact_ratio >= 0.92:
        eye_score = 10.0

    presence = min(10.0, eye_score * vision.face_presence_ratio)
    scores.presence_score = round(presence, 1)

    # hands_activity_score is a pedagogical agitation score on a 0-10 scale.
    body_score = 4.0
    if vision.hands_visibility_ratio > 0.6:
        body_score += 3.0
    elif vision.hands_visibility_ratio > 0.3:
        body_score += 1.5

    if 2.5 <= vision.hands_activity_score <= 6.5:
        body_score += 3.0
    elif vision.hands_activity_score > 6.5:
        body_score += max(0, 3.0 - (vision.hands_activity_score - 6.5))
    elif 0.5 < vision.hands_activity_score < 2.5:
        body_score += 1.0

    scores.body_language_score = max(0.0, min(10.0, round(body_score, 1)))

    scene_score = 10.0
    if vision.avg_brightness < 70 or vision.avg_brightness > 210:
        scene_score -= 2.0

    if vision.avg_blur < 20:
        scene_score -= 1.5
    elif vision.avg_blur < 40:
        scene_score -= 0.5

    scores.scene_score = max(0.0, min(10.0, round(scene_score, 1)))

    overall = (
        (scores.voice_score * 3.0)
        + (scores.presence_score * 3.5)
        + (scores.body_language_score * 2.5)
        + (scores.scene_score * 1.0)
    )
    scores.overall_score = round(overall, 1)

    return scores


def _recommendation_axis(category: str) -> str:
    category_lower = (category or "").lower()
    if "voix" in category_lower:
        return "voice"
    if "presence" in category_lower or "regard" in category_lower:
        return "presence"
    if "gestuelle" in category_lower or "posture" in category_lower:
        return "body"
    if "image" in category_lower or "lumiere" in category_lower or "nettete" in category_lower or "cadre" in category_lower:
        return "scene"
    return "general"


def _recommendation_key(recommendation: Recommendation) -> str:
    category = (recommendation.category or "").lower()
    message = (recommendation.message or "").lower()
    exercise_key = (recommendation.exercise_key or "").lower()

    if "voix" in category and "debit" in category:
        if "lent" in message:
            return "voice_pace_slow"
        return "voice_pace_fast"
    if "voix" in category and "fluidite" in category:
        return "voice_fillers"
    if "presence" in category or "regard" in category:
        return "presence_eye"
    if "cadre" in category or "posture" in category:
        return "presence_frame"
    if "gestuelle" in category:
        if "agite" in message:
            return "body_hands_activity"
        return "body_hands_visibility"
    if "lumiere" in category:
        return "scene_light"
    if "nettete" in category or exercise_key == "fiche-environnement-001":
        return "scene_blur"
    return "general"


def generate_feedback_summary(
    scores: Scores,
    audio: AudioMetrics,
    vision: VisionMetrics,
    recommendations: List[Recommendation] | None = None,
) -> Tuple[List[str], List[str]]:
    """Generate professional deterministic strengths and weaknesses for the report."""
    strengths: List[str] = []
    weakness_entries: List[Tuple[int, str, str, str]] = []
    
    # Priority weighting
    presence_priority_bonus = 10 if scores.presence_score + 1.0 < scores.voice_score else 0
    voice_priority_penalty = 10 if scores.presence_score + 1.0 < scores.voice_score else 0

    def add_weakness(priority: int, text: str, key: str, axis: str) -> None:
        weakness_entries.append((priority, text, key, axis))

    # --- VOICE & PACE ---
    if 120 <= audio.wpm <= 160:
        strengths.append(f"Rythme vocal parfaitement maîtrisé ({round(audio.wpm)} mots/minute).")
    elif audio.wpm < 110:
        add_weakness(
            82,
            f"Débit de parole un peu lent ({round(audio.wpm)} mots/minute). Dynamisez vos phrases.",
            "voice_pace_slow",
            "voice",
        )
    elif audio.wpm > 160:
        voice_priority = 85 if audio.wpm > 175 else 70
        voice_priority -= voice_priority_penalty
        add_weakness(
            voice_priority,
            f"Débit de parole élevé ({round(audio.wpm)} mots/minute). Pensez à respirer entre vos idées.",
            "voice_pace_fast",
            "voice",
        )

    estimated_mins = _estimated_minutes(audio)
    fillers_per_min = audio.filler_count / estimated_mins

    if audio.filler_count == 0 and audio.stutter_count == 0:
        strengths.append("Élocution très fluide : aucune hésitation ni répétition détectée.")
    
    if fillers_per_min > 3:
        add_weakness(
            70,
            f"Présence de mots parasites ({audio.filler_count} 'euh', 'donc', etc.). Acceptez le silence.",
            "voice_fillers",
            "voice",
        )
    
    stutters_per_min = audio.stutter_count / estimated_mins
    if stutters_per_min > 2:
        add_weakness(
            65,
            f"Répétitions de mots détectées ({audio.stutter_count}). Travaillez la fluidité des transitions.",
            "voice_stutter",
            "voice",
        )

    # --- VISION & PRESENCE ---
    eye_contact_percent = round(vision.eye_contact_ratio * 100)
    # Only praise eye contact as a strong point when the face stays sufficiently in frame.
    if vision.eye_contact_ratio >= 0.7 and vision.face_presence_ratio >= 0.8:
        strengths.append(f"Excellent contact visuel : vous regardez la caméra {eye_contact_percent}% du temps.")
    elif vision.eye_contact_ratio < 0.4:
        add_weakness(
            92 + presence_priority_bonus,
            f"Le regard quitte trop souvent la caméra ({eye_contact_percent}%). Regardez directement la caméra pour engager votre public.",
            "presence_eye",
            "presence",
        )
    elif vision.eye_contact_ratio < 0.6:
        add_weakness(
            78 + presence_priority_bonus,
            f"Contact caméra irrégulier ({eye_contact_percent}%). Revenez plus souvent à la caméra pour ponctuer vos propos.",
            "presence_eye",
            "presence",
        )

    if vision.face_presence_ratio < 0.8:
        add_weakness(95, "Cadrage instable : votre visage sort parfois du champ. Restez bien au centre.", "presence_frame", "presence")

    # --- BODY LANGUAGE ---
    if vision.hands_visibility_ratio >= 0.3:
        if 2.0 <= vision.hands_activity_score <= 8.0:
            strengths.append("Gestuelle naturelle et équilibrée, appuyant efficacement vos arguments.")
        elif vision.hands_activity_score > 8:
            add_weakness(68, "Gestuelle un peu trop agitée : vos mouvements peuvent distraire l'auditoire.", "body_hands_activity", "body")
    else:
        add_weakness(72, "Posture un peu figée. Libérez vos mains pour illustrer vos points clés.", "body_hands_visibility", "body")

    # --- ENVIRONMENT ---
    if vision.avg_brightness < 70:
        add_weakness(52, "Éclairage insuffisant (image trop sombre).", "scene_light", "scene")
    elif vision.avg_brightness > 210:
        add_weakness(52, "Image surexposée (trop de lumière).", "scene_light", "scene")

    if vision.avg_blur < 20:
        add_weakness(58, "Image floue. Nettoyez la lentille de la caméra ou améliorez la mise au point.", "scene_blur", "scene")

    # FALLBACKS
    if not strengths:
        strengths.append("Les fondamentaux de votre présentation sont bien en place.")
    if not weakness_entries:
        weakness_entries.append((0, "Aucun défaut majeur identifié. Continuez ainsi !", "general", "general"))

    if recommendations:
        rec_key_order: dict[str, int] = {}
        axis_order: dict[str, int] = {}
        for idx, rec in enumerate(recommendations):
            rec_key = _recommendation_key(rec)
            if rec_key not in rec_key_order:
                rec_key_order[rec_key] = idx
            axis = _recommendation_axis(rec.category)
            if axis not in axis_order:
                axis_order[axis] = idx
        weakness_entries.sort(
            key=lambda item: (
                rec_key_order.get(item[2], 100 + axis_order.get(item[3], 99)),
                -item[0],
            )
        )
    else:
        weakness_entries.sort(key=lambda item: item[0], reverse=True)

    weaknesses = [text for _, text, _, _ in weakness_entries]
    return strengths, weaknesses
