from typing import Tuple, List
from metrics.schema import AudioMetrics, VisionMetrics, Scores

def calculate_scores(audio: AudioMetrics, vision: VisionMetrics) -> Scores:
    """
    Calculates pedagogical scores (out of 10) based on raw metrics.
    Overall score is out of 100.
    """
    scores = Scores()

    # 1. Voice Score (0-10)
    # Target WPM: 130-150 (More specific)
    wpm_score = 10.0
    if audio.wpm < 110:
        wpm_score -= (110 - audio.wpm) * 0.15
    elif audio.wpm > 160:
        wpm_score -= (audio.wpm - 160) * 0.15
    
    # Penalize for fillers (> 2 per minute is bad)
    estimated_mins = audio.wpm / 140.0 if audio.wpm > 0 else 1.0
    fillers_per_min = audio.filler_count / estimated_mins
    
    filler_penalty = 0.0
    if fillers_per_min > 2:
        filler_penalty = min((fillers_per_min - 2) * 0.5, 3.0)
    
    # Penalize too many pauses
    pauses_per_min = audio.pause_count / estimated_mins
    pause_penalty = 0.0
    if pauses_per_min > 4:
        pause_penalty = min((pauses_per_min - 4) * 0.4, 2.5)

    voice_score = max(0.0, min(10.0, wpm_score - filler_penalty - pause_penalty))
    scores.voice_score = round(voice_score, 1)

    # 2. Presence Score (Eye Contact & Face) (0-10)
    # Target: >90% for a 10/10. 
    # Current heuristic: Linear scale up to 0.9
    eye_score = (vision.eye_contact_ratio / 0.9) * 10.0
    if vision.eye_contact_ratio >= 0.92:
        eye_score = 10.0 
    
    # Face presence must be almost 100% for top score
    presence = min(10.0, eye_score * vision.face_presence_ratio)
    scores.presence_score = round(presence, 1)

    # 3. Body Language Score (Hands & Posture) (0-10)
    # Baseline lowered to 4.0 (Need to EARN points by moving)
    body_score = 4.0 
    
    # Points for hand visibility
    if vision.hands_visibility_ratio > 0.6:
        body_score += 3.0
    elif vision.hands_visibility_ratio > 0.3:
        body_score += 1.5
        
    # Activity score (Not static, but not frantic)
    if 2.5 <= vision.hands_activity_score <= 6.5:
        body_score += 3.0
    elif vision.hands_activity_score > 6.5:
        body_score += max(0, 3.0 - (vision.hands_activity_score - 6.5)) # Diminishing returns/penalty
    elif 0.5 < vision.hands_activity_score < 2.5:
        body_score += 1.0 # Slight movement
        
    scores.body_language_score = max(0.0, min(10.0, round(body_score, 1)))

    # 4. Scene Score (Light, Framing) (0-10)
    scene_score = 10.0
    if vision.avg_brightness < 70 or vision.avg_brightness > 210:
        scene_score -= 2.0 
    
    # More realistic on blur (Laplacian variance)
    if vision.avg_blur < 20:
        scene_score -= 1.5 # Blurry
    elif vision.avg_blur < 40:
        scene_score -= 0.5 # Soft focus
        
    scores.scene_score = max(0.0, min(10.0, round(scene_score, 1)))



    # Overall Score (0-100)
    # Weights: Voice (30%), Presence (35%), Body (25%), Scene (10%)
    overall = (
        (scores.voice_score * 3.0) +
        (scores.presence_score * 3.5) +
        (scores.body_language_score * 2.5) +
        (scores.scene_score * 1.0)
    )
    scores.overall_score = round(overall, 1)

    return scores

def generate_feedback_summary(scores: Scores, audio: AudioMetrics, vision: VisionMetrics) -> Tuple[List[str], List[str]]:
    """
    Generates rule-based deterministic Strengths and Weaknesses lists.
    """
    strengths = []
    weaknesses = []

    # Voice feedback
    if audio.wpm >= 120 and audio.wpm <= 160:
        strengths.append(f"Excellent rythme vocal ({round(audio.wpm)} mots/minute).")
    elif audio.wpm < 110:
        weaknesses.append(f"Rythme d'élocution trop lent ({round(audio.wpm)} mots/minute).")
    elif audio.wpm > 160:
        weaknesses.append(f"Vous parlez trop vite ({round(audio.wpm)} mots/minute).")

    # Fillers feedback (using normalized rate)
    estimated_mins = audio.wpm / 140.0 if audio.wpm > 0 else 1.0
    fillers_per_min = audio.filler_count / estimated_mins
    
    if audio.filler_count == 0:
        strengths.append("Discours clair, sans tics de langage ('euh', 'hum').")
    elif fillers_per_min > 3:
        weaknesses.append(f"Attention aux mots parasites ({audio.filler_count} détectés).")

    # Presence feedback
    if vision.eye_contact_ratio >= 0.7:
        strengths.append(f"Très bon contact visuel ({round(vision.eye_contact_ratio*100)}% du temps).")
    else:
        weaknesses.append(f"Le regard est parfois fuyant ({round(vision.eye_contact_ratio*100)}%). Regardez plus la caméra.")

    if vision.face_presence_ratio < 0.8:
        weaknesses.append("Votre visage disparaît parfois du cadre. Restez bien centré.")

    # Gestures
    if vision.hands_visibility_ratio >= 0.3:
        if 2.0 <= vision.hands_activity_score <= 8.0:
            strengths.append("Gestuelle naturelle et équilibrée, appuyant bien les propos.")
        elif vision.hands_activity_score > 8:
            weaknesses.append("Mouvements des mains un peu trop agités, ce qui peut distraire l'attention.")
    else:
        weaknesses.append("Corps un peu figé. N'hésitez pas à utiliser vos mains pour illustrer vos points clés.")

    # Scene
    if vision.avg_brightness < 70:
        weaknesses.append("L'éclairage est trop faible (vidéo sombre).")
    elif vision.avg_brightness > 210:
        weaknesses.append("L'image est trop exposée (trop de lumière).")

    if vision.avg_blur < 20:
        weaknesses.append("L'image manque de netteté. Nettoyez l'objectif ou améliorez le focus.")

    # Fallbacks in case nothing was triggered
    if not strengths:
        strengths.append("Bases de présentation correctes.")
    if not weaknesses:
        weaknesses.append("Pas de défaut majeur identifié à ce stade.")

    return strengths, weaknesses
