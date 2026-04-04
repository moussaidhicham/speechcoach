import json
import os
import re
from typing import Any, Dict, List, Tuple

from app.analytics.engine.metrics.schema import AudioMetrics, Recommendation, Scores, VisionMetrics


def _clean_mojibake(text: str) -> str:
    replacements = {
        "Ã©": "e",
        "Ã¨": "e",
        "Ãª": "e",
        "Ã«": "e",
        "Ã ": "a",
        "Ã¢": "a",
        "Ã®": "i",
        "Ã¯": "i",
        "Ã´": "o",
        "Ã¶": "o",
        "Ã¹": "u",
        "Ã»": "u",
        "Ã¼": "u",
        "Ã§": "c",
        "Ã‰": "E",
        "Ã€": "A",
        "â€™": "'",
        "â€œ": '"',
        "â€": '"',
        "â€”": "-",
    }
    cleaned = text
    for source, target in replacements.items():
        cleaned = cleaned.replace(source, target)
    return cleaned


def _load_knowledge_base() -> List[Dict[str, Any]]:
    kb_path = os.path.join(os.path.dirname(__file__), "..", "rag", "knowledge_base.json")
    kb_path = os.path.abspath(kb_path)
    if not os.path.exists(kb_path):
        return []

    with open(kb_path, "r", encoding="utf-8") as handle:
        docs = json.load(handle)

    normalized_docs: List[Dict[str, Any]] = []
    for doc in docs:
        normalized_docs.append(
            {
                "id": str(doc.get("id", "")),
                "category": _clean_mojibake(str(doc.get("category", ""))),
                "title": _clean_mojibake(str(doc.get("title", ""))),
                "content": _clean_mojibake(str(doc.get("content", ""))),
            }
        )
    return normalized_docs


def _find_fiche(exercise_key: str) -> Dict[str, Any] | None:
    for doc in _load_knowledge_base():
        if doc.get("id") == exercise_key:
            return doc
    return None


def _extract_exercise_name(content: str) -> str:
    match = re.search(r"Exercice Pratique\s*:\s*(.+)", content, flags=re.IGNORECASE)
    if match:
        return match.group(1).strip().strip("*").strip()
    return "Exercice cible"


def _extract_steps(content: str) -> List[str]:
    steps: List[str] = []
    for match in re.finditer(r"\n?\s*(\d+)\.\s*(.+?)(?=(?:\n\s*\d+\.|\Z))", content, flags=re.DOTALL):
        step = re.sub(r"\s+", " ", match.group(2)).strip()
        step = step.replace("**", "").strip()
        if step:
            steps.append(step)
    return steps


def _extract_summary(content: str) -> str:
    intro = content.split("**Exercice Pratique", 1)[0].strip()
    intro = re.sub(r"\s+", " ", intro)
    return intro


def _recommendation_axis(category: str) -> str:
    category_lower = (category or "").lower()
    if "voix" in category_lower:
        return "voice"
    if "presence" in category_lower or "regard" in category_lower or "cadre" in category_lower or "posture" in category_lower:
        return "presence"
    if "gestuelle" in category_lower:
        return "body"
    if "image" in category_lower or "lumiere" in category_lower or "nettete" in category_lower:
        return "scene"
    return "general"


def _axis_priority_boost(scores: Scores, axis: str) -> int:
    axis_scores = {
        "voice": scores.voice_score,
        "presence": scores.presence_score,
        "body": scores.body_language_score,
        "scene": scores.scene_score,
    }
    axis_score = axis_scores.get(axis, 10.0)
    # The weaker the axis, the stronger the ranking boost.
    return int(round((10.0 - axis_score) * 3.0))


def _presence_tie_break_priority(
    vision: VisionMetrics,
    base_priority: int,
    recommendation_kind: str,
) -> int:
    """
    Resolve severe mixed cases between eye-contact and framing.

    Professional rule:
    - If eye contact is very weak and the face is still visible often enough, prioritize
      `Presence & Regard` because it is usually the pedagogically dominant issue.
    - If face presence is catastrophically low, keep `Cadre & Posture` first because the
      speaker is literally disappearing from the frame.
    """
    eye_ratio = vision.eye_contact_ratio
    face_ratio = vision.face_presence_ratio

    if recommendation_kind == "presence":
        if eye_ratio < 0.4 and face_ratio >= 0.3:
            return base_priority + 8
        if eye_ratio < 0.6 and face_ratio >= 0.45:
            return base_priority + 4
        return base_priority

    if recommendation_kind == "frame":
        if face_ratio < 0.25:
            return base_priority + 10
        if eye_ratio < 0.4 and face_ratio >= 0.3:
            return base_priority - 6
        if eye_ratio < 0.6 and face_ratio >= 0.45:
            return base_priority - 3
        return base_priority

    return base_priority


def build_exercise_payload(recommendations: List[Recommendation]) -> Dict[str, Any]:
    primary = recommendations[0] if recommendations else None
    secondary = recommendations[1] if len(recommendations) > 1 else None

    if not primary:
        return {
            "title": "Exercice cible",
            "summary": "Reprenez le point principal de la session avec un essai court et concentre.",
            "steps": [
                "Relisez la priorite de travail.",
                "Refaites une prise de parole de 1 minute sur ce seul point.",
                "Visionnez-la pour verifier si ce point progresse.",
            ],
            "goal": "Stabiliser le point principal avant d'elargir le travail.",
            "self_check": "Est-ce que le point prioritaire est plus net sur ce nouvel essai ?",
            "focus_primary": "Progression generale",
            "focus_secondary": "Consolidation",
        }

    primary_doc = _find_fiche(primary.exercise_key)
    secondary_doc = _find_fiche(secondary.exercise_key) if secondary and secondary.exercise_key else None

    primary_steps = _extract_steps(primary_doc["content"]) if primary_doc else []
    primary_summary = _extract_summary(primary_doc["content"]) if primary_doc else primary.message
    primary_title = _extract_exercise_name(primary_doc["content"]) if primary_doc else primary.category

    secondary_title = _extract_exercise_name(secondary_doc["content"]) if secondary_doc else (secondary.category if secondary else "Consolidation")

    return {
        "title": primary_title,
        "summary": primary_summary or primary.message,
        "steps": primary_steps or [primary.actionable_tip],
        "goal": primary.actionable_tip,
        "self_check": "Est-ce que ce point devient plus naturel et plus regulier sur la repetition suivante ?",
        "focus_primary": primary.category.split(" & ")[0] if primary.category else "Progression generale",
        "focus_secondary": secondary.category.split(" & ")[0] if secondary else "Consolidation",
        "secondary_title": secondary_title,
    }


def generate_recommendations(audio: AudioMetrics, vision: VisionMetrics, scores: Scores) -> List[Recommendation]:
    """
    Generate a prioritized list of actionable recommendations.
    Returns the top 3 recommendations sorted by importance.
    """
    all_recs: List[Tuple[int, Recommendation]] = []

    voice_priority_bonus = _axis_priority_boost(scores, "voice")
    presence_priority_bonus = _axis_priority_boost(scores, "presence")
    body_priority_bonus = _axis_priority_boost(scores, "body")
    scene_priority_bonus = _axis_priority_boost(scores, "scene")

    if audio.wpm < 110:
        all_recs.append(
            (
                80 + voice_priority_bonus,
                Recommendation(
                    category="Voix & Debit",
                    severity="Critical",
                    message=f"Votre debit de parole est trop lent ({round(audio.wpm)} mots/minute).",
                    actionable_tip="Visez un rythme plus regulier, entre 130 et 150 mots par minute, pour garder une parole vivante.",
                    exercise_key="fiche-voix-001",
                ),
            )
        )
    elif audio.wpm > 175:
        all_recs.append(
            (
                85 + voice_priority_bonus,
                Recommendation(
                    category="Voix & Debit",
                    severity="Critical",
                    message=f"Votre debit de parole est trop rapide ({round(audio.wpm)} mots/minute).",
                    actionable_tip="Marquez une vraie pause en fin de phrase pour ralentir legerement et laisser le temps au message d'etre compris.",
                    exercise_key="fiche-voix-002",
                ),
            )
        )
    elif audio.wpm > 160:
        all_recs.append(
            (
                65 + voice_priority_bonus,
                Recommendation(
                    category="Voix & Debit",
                    severity="Warning",
                    message=f"Votre debit de parole est un peu trop rapide ({round(audio.wpm)} mots/minute).",
                    actionable_tip="Marquez une vraie pause en fin de phrase pour ralentir legerement et laisser le temps au message d'etre compris.",
                    exercise_key="fiche-voix-002",
                ),
            )
        )

    estimated_mins = audio.wpm / 140.0 if audio.wpm > 0.1 else 1.0
    fillers_per_min = audio.filler_count / estimated_mins
    if fillers_per_min >= 3:
        all_recs.append(
            (
                75 + voice_priority_bonus,
                Recommendation(
                    category="Voix & Fluidite",
                    severity="Warning",
                    message=f"Trop de mots parasites detectes ({audio.filler_count} 'euh', 'hum').",
                    actionable_tip="Remplacez les hesitations par un silence bref et assume lorsque vous cherchez votre idee suivante.",
                    exercise_key="fiche-voix-003",
                ),
            )
        )

    if vision.face_presence_ratio < 0.8:
        frame_priority = _presence_tie_break_priority(
            vision,
            88 + presence_priority_bonus,
            "frame",
        )
        all_recs.append(
            (
                frame_priority,
                Recommendation(
                    category="Cadre & Posture",
                    severity="Critical",
                    message="Votre visage sort parfois du cadre.",
                    actionable_tip="Ajustez la camera avant de commencer pour garder le visage et les epaules visibles du debut a la fin.",
                    exercise_key="fiche-posture-002",
                ),
            )
        )

    if vision.eye_contact_ratio < 0.4:
        eye_priority = _presence_tie_break_priority(
            vision,
            92 + presence_priority_bonus,
            "presence",
        )
        all_recs.append(
            (
                eye_priority,
                Recommendation(
                    category="Presence & Regard",
                    severity="Critical",
                    message="Votre contact visuel est trop faible (moins de 40% du temps).",
                    actionable_tip="Revenez plus souvent a l'objectif sur vos phrases importantes pour renforcer la connexion avec votre audience.",
                    exercise_key="fiche-regard-001",
                ),
            )
        )
    elif vision.eye_contact_ratio < 0.6:
        eye_priority = _presence_tie_break_priority(
            vision,
            76 + presence_priority_bonus,
            "presence",
        )
        all_recs.append(
            (
                eye_priority,
                Recommendation(
                    category="Presence & Regard",
                    severity="Warning",
                    message="Le regard camera reste inconstant.",
                    actionable_tip="Regardez la camera a chaque idee cle pour rendre votre presence plus stable et plus engageante.",
                    exercise_key="fiche-regard-001",
                ),
            )
        )

    if vision.hands_visibility_ratio < 0.2:
        all_recs.append(
            (
                70 + body_priority_bonus,
                Recommendation(
                    category="Gestuelle",
                    severity="Warning",
                    message="Vos mains restent peu visibles, ce qui fige un peu la presentation.",
                    actionable_tip="Reculez legerement la camera ou votre siege pour laisser apparaitre les mains dans le cadre.",
                    exercise_key="fiche-posture-001",
                ),
            )
        )
    elif vision.hands_activity_score > 8.0:
        all_recs.append(
            (
                65 + body_priority_bonus,
                Recommendation(
                    category="Gestuelle",
                    severity="Warning",
                    message="Vos mouvements de mains sont tres agites et peuvent distraire.",
                    actionable_tip="Simplifiez vos gestes et laissez vos mains se poser entre deux idees pour calmer le mouvement.",
                    exercise_key="fiche-gestuelle-002",
                ),
            )
        )

    if vision.avg_brightness < 70:
        all_recs.append(
            (
                50 + scene_priority_bonus,
                Recommendation(
                    category="Image & Lumiere",
                    severity="Info",
                    message="La piece semble trop sombre.",
                    actionable_tip="Ajoutez une source de lumiere devant vous pour mieux eclairer le visage.",
                    exercise_key="fiche-environnement-001",
                ),
            )
        )

    if vision.avg_blur < 20:
        all_recs.append(
            (
                55 + scene_priority_bonus,
                Recommendation(
                    category="Image & Nettete",
                    severity="Info",
                    message="L'image est assez floue.",
                    actionable_tip="Nettoyez l'objectif et verifiez la mise au point avant l'enregistrement.",
                    exercise_key="fiche-environnement-001",
                ),
            )
        )

    all_recs.sort(key=lambda item: item[0], reverse=True)
    top_3 = [recommendation for _, recommendation in all_recs[:3]]

    if not top_3:
        top_3.append(
            Recommendation(
                category="Maintien",
                severity="Info",
                message="Excellente prestation globale. Peu de points majeurs a corriger.",
                actionable_tip="Continuez a pratiquer regulierement pour maintenir cette aisance.",
            )
        )

    return top_3


def generate_training_plan(recommendations: List[Recommendation]) -> str:
    """Generate a more grounded practice schedule from the top recommendation fiche."""
    exercise = build_exercise_payload(recommendations)
    steps = exercise.get("steps") or []
    primary_step = steps[0] if len(steps) > 0 else "Relisez la priorite de travail."
    second_step = steps[1] if len(steps) > 1 else exercise.get("goal", "Refaites une courte prise de parole.")
    third_step = steps[2] if len(steps) > 2 else "Refaites un essai en conservant seulement l'essentiel."

    return f"""### Plan d'Entrainement sur 7 Jours

**Focus Principal :** {exercise.get('focus_primary', 'Progression generale')}
**Focus Secondaire :** {exercise.get('focus_secondary', 'Consolidation')}

* **Jour 1-2 : Exercice principal - {exercise.get('title', 'Exercice cible')}**
  - {exercise.get('summary', 'Reprenez le point principal de la session avec un essai court et concentre.')}
  - {primary_step}

* **Jour 3-4 : Mise en pratique**
  - {second_step}
  - Refaites 2 prises de parole courtes en gardant ce seul objectif.

* **Jour 5 : Consolidation**
  - {third_step}
  - Cherchez un rendu plus naturel sans perdre la clarte du message.

* **Jour 6 : Verification**
  - {exercise.get('self_check', 'Verifiez si le point prioritaire progresse sur le nouvel essai.')}
  - Visionnez l'enregistrement et notez un seul point encore a corriger.

* **Jour 7 : Repetition complete**
  - Refaites une prise de parole plus longue en integrant le focus principal et le focus secondaire.
  - Gardez en tete cet objectif : {exercise.get('goal', 'Stabiliser le point principal avant d elargir le travail.')}
"""
