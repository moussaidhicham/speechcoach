from typing import List, Tuple

from app.analytics.engine.metrics.schema import AudioMetrics, Scores, VisionMetrics


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

    estimated_mins = audio.wpm / 140.0 if audio.wpm > 0.1 else 1.0
    fillers_per_min = audio.filler_count / estimated_mins

    filler_penalty = 0.0
    if fillers_per_min > 2:
        filler_penalty = min((fillers_per_min - 2) * 0.5, 3.0)

    pauses_per_min = audio.pause_count / estimated_mins
    pause_penalty = 0.0
    if pauses_per_min > 4:
        pause_penalty = min((pauses_per_min - 4) * 0.4, 2.5)

    voice_score = max(0.0, min(10.0, wpm_score - filler_penalty - pause_penalty))
    scores.voice_score = round(voice_score, 1)

    eye_score = (vision.eye_contact_ratio / 0.9) * 10.0
    if vision.eye_contact_ratio >= 0.92:
        eye_score = 10.0

    presence = min(10.0, eye_score * vision.face_presence_ratio)
    scores.presence_score = round(presence, 1)

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


def generate_feedback_summary(scores: Scores, audio: AudioMetrics, vision: VisionMetrics) -> Tuple[List[str], List[str]]:
    """Generate deterministic strengths and weaknesses for the report."""
    strengths: List[str] = []
    weakness_entries: List[Tuple[int, str]] = []
    presence_priority_bonus = 10 if scores.presence_score + 1.0 < scores.voice_score else 0
    voice_priority_penalty = 10 if scores.presence_score + 1.0 < scores.voice_score else 0

    def add_weakness(priority: int, text: str) -> None:
        weakness_entries.append((priority, text))

    if 120 <= audio.wpm <= 160:
        strengths.append(f"Excellent rythme vocal ({round(audio.wpm)} mots/minute).")
    elif audio.wpm < 110:
        add_weakness(82, f"Rythme d'elocution trop lent ({round(audio.wpm)} mots/minute).")
    elif audio.wpm > 160:
        voice_priority = 82 if audio.wpm > 175 else 65
        voice_priority -= voice_priority_penalty
        add_weakness(voice_priority, f"Vous parlez trop vite ({round(audio.wpm)} mots/minute).")

    estimated_mins = audio.wpm / 140.0 if audio.wpm > 0.1 else 1.0
    fillers_per_min = audio.filler_count / estimated_mins

    if audio.filler_count == 0:
        strengths.append("Discours clair, sans tics de langage ('euh', 'hum').")
    elif fillers_per_min > 3:
        add_weakness(70, f"Attention aux mots parasites ({audio.filler_count} detectes).")

    eye_contact_percent = round(vision.eye_contact_ratio * 100)
    if vision.eye_contact_ratio >= 0.7:
        strengths.append(f"Tres bon contact visuel ({eye_contact_percent}% du temps).")
    elif vision.eye_contact_ratio < 0.4:
        add_weakness(
            92 + presence_priority_bonus,
            f"Le regard quitte trop souvent la camera ({eye_contact_percent}%). Cherchez un contact plus direct sur vos phrases cles."
        )
    elif vision.eye_contact_ratio < 0.6:
        add_weakness(
            78 + presence_priority_bonus,
            f"Le contact camera peut etre plus regulier ({eye_contact_percent}%). Essayez de revenir plus souvent a l'objectif."
        )

    if vision.face_presence_ratio < 0.8:
        add_weakness(95, "Votre visage disparait parfois du cadre. Restez bien centre.")

    if vision.hands_visibility_ratio >= 0.3:
        if 2.0 <= vision.hands_activity_score <= 8.0:
            strengths.append("Gestuelle naturelle et equilibree, appuyant bien les propos.")
        elif vision.hands_activity_score > 8:
            add_weakness(68, "Mouvements des mains un peu trop agites, ce qui peut distraire l'attention.")
    else:
        add_weakness(72, "Corps un peu fige. N'hesitez pas a utiliser vos mains pour illustrer vos points cles.")

    if vision.avg_brightness < 70:
        add_weakness(52, "L'eclairage est trop faible (video sombre).")
    elif vision.avg_brightness > 210:
        add_weakness(52, "L'image est trop exposee (trop de lumiere).")

    if vision.avg_blur < 20:
        add_weakness(58, "L'image manque de nettete. Nettoyez l'objectif ou ameliorez le focus.")

    if not strengths:
        strengths.append("Bases de presentation correctes.")
    if not weakness_entries:
        weakness_entries.append((0, "Pas de defaut majeur identifie a ce stade."))

    weakness_entries.sort(key=lambda item: item[0], reverse=True)
    weaknesses = [text for _, text in weakness_entries]
    return strengths, weaknesses
