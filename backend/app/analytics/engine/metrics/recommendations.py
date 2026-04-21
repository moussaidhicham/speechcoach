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


def _normalize_sentence(text: str) -> str:
    cleaned = re.sub(r"\s+", " ", (text or "")).strip()
    return cleaned.rstrip(". ")


def _token_overlap(a: str, b: str) -> float:
    tokens_a = {token for token in re.sub(r"[^a-z0-9\s]", " ", _normalize_sentence(a).lower()).split() if len(token) > 3}
    tokens_b = {token for token in re.sub(r"[^a-z0-9\s]", " ", _normalize_sentence(b).lower()).split() if len(token) > 3}
    if not tokens_a or not tokens_b:
        return 0.0
    return len(tokens_a & tokens_b) / max(len(tokens_a), 1)


def _action_title_from_category(category: str) -> str:
    category_lower = (category or "").lower()
    if "regard" in category_lower or "presence" in category_lower:
        return "Exercice regard camera"
    if "voix" in category_lower and "debit" in category_lower:
        return "Exercice rythme de parole"
    if "voix" in category_lower and "fluidite" in category_lower:
        return "Exercice fluidite"
    if "gestuelle" in category_lower:
        return "Exercice gestuelle"
    if "cadre" in category_lower or "posture" in category_lower:
        return "Exercice cadre et posture"
    if "image" in category_lower or "lumiere" in category_lower or "nettete" in category_lower:
        return "Verification video"
    return "Exercice cible"


def _practice_summary_from_category(category: str, actionable_tip: str) -> str:
    category_lower = (category or "").lower()
    if "regard" in category_lower or "presence" in category_lower:
        return "Refaites une prise de parole courte en revenant a la camera sur chaque idee importante."
    if "voix" in category_lower and "debit" in category_lower:
        return "Refaites une prise de parole courte en ralentissant legerement et en marquant la fin de chaque phrase."
    if "voix" in category_lower and "fluidite" in category_lower:
        return "Refaites une prise de parole courte en remplacant les hesitations par un silence bref."
    if "gestuelle" in category_lower:
        return "Refaites une prise de parole courte avec une gestuelle plus visible et plus simple."
    if "cadre" in category_lower or "posture" in category_lower:
        return "Reprenez une video courte apres avoir stabilise le cadre et la posture."
    if "image" in category_lower or "lumiere" in category_lower or "nettete" in category_lower:
        return "Verifiez l'installation video puis refaites un essai court dans de meilleures conditions."
    return actionable_tip or "Refaites une prise de parole courte en vous concentrant sur un seul point."


def _practice_self_check_from_category(category: str) -> str:
    category_lower = (category or "").lower()
    if "regard" in category_lower or "presence" in category_lower:
        return "Votre regard revient-il plus regulierement vers la camera ?"
    if "voix" in category_lower and "debit" in category_lower:
        return "Votre rythme parait-il plus pose sans perdre en clarte ?"
    if "voix" in category_lower and "fluidite" in category_lower:
        return "Avez-vous reduit les hesitations sur cette nouvelle repetition ?"
    if "gestuelle" in category_lower:
        return "Vos gestes accompagnent-ils mieux le message sans distraire ?"
    if "cadre" in category_lower or "posture" in category_lower:
        return "Le visage et les epaules restent-ils bien visibles du debut a la fin ?"
    if "image" in category_lower or "lumiere" in category_lower or "nettete" in category_lower:
        return "L'image parait-elle plus lisible et plus propre sur le nouvel essai ?"
    return "Le point prioritaire est-il plus net sur le nouvel essai ?"


def _build_light_tip(category: str, actionable_tip: str) -> str:
    category_lower = (category or "").lower()
    normalized_tip = _normalize_sentence(actionable_tip)
    if "regard" in category_lower or "presence" in category_lower:
        return "Refaites 45 secondes en revenant a la camera a chaque idee cle."
    if "voix" in category_lower and "debit" in category_lower:
        return "Refaites 45 secondes en marquant une pause nette a la fin de chaque phrase."
    if "voix" in category_lower and "fluidite" in category_lower:
        return "Refaites 45 secondes en remplacant chaque hesitation par un silence bref."
    if "gestuelle" in category_lower:
        return "Refaites 45 secondes en laissant apparaitre les mains sur vos idees importantes."
    if "cadre" in category_lower or "posture" in category_lower:
        return "Refaites une courte prise apres avoir stabilise le cadre du debut a la fin."
    if "image" in category_lower or "lumiere" in category_lower or "nettete" in category_lower:
        return "Refaites une courte prise apres avoir verifie la lumiere et la nettete."
    return f"Refaites une courte prise en appliquant ce point: {normalized_tip.lower()}."


def _practice_steps_from_category(category: str, actionable_tip: str, mode: str) -> List[str]:
    category_lower = (category or "").lower()

    if "regard" in category_lower or "presence" in category_lower:
        steps = [
            "Faites une prise de parole de 45 a 60 secondes en revenant a la camera sur chaque idee importante.",
            "Refaites un second essai en gardant le meme message mais avec un regard plus regulier vers l'objectif.",
            "Verifiez si les retours vers la camera sont plus frequents et plus naturels.",
        ]
    elif "voix" in category_lower and "debit" in category_lower:
        steps = [
            "Refaites une prise de parole courte en ralentissant legerement et en marquant la fin de chaque phrase.",
            "Refaites un second essai de 45 a 60 secondes avec des pauses nettes sur les idees importantes.",
            "Verifiez si le rythme parait plus pose et plus facile a suivre.",
        ]
    elif "voix" in category_lower and "fluidite" in category_lower:
        steps = [
            "Refaites une prise de parole courte en remplacant chaque hesitation par un silence bref.",
            "Refaites un second essai en gardant un rythme simple et continu.",
            "Verifiez si les hesitations sont moins presentes sur la nouvelle prise.",
        ]
    elif "gestuelle" in category_lower:
        steps = [
            "Refaites 45 secondes en simplifiant vos gestes et en laissant vos mains se poser entre deux idees.",
            "Refaites un second essai avec un seul geste simple par idee importante.",
            "Verifiez si la gestuelle accompagne mieux le message sans distraire.",
        ]
    elif "cadre" in category_lower or "posture" in category_lower:
        steps = [
            "Replacez la camera puis refaites une video courte avec le visage et les epaules bien visibles.",
            "Refaites un second essai sans changer votre position pendant la prise.",
            "Verifiez si le cadre reste stable du debut a la fin.",
        ]
    elif "image" in category_lower or "lumiere" in category_lower or "nettete" in category_lower:
        steps = [
            "Verifiez la lumiere et la mise au point puis refaites une prise courte.",
            "Refaites un second essai dans les memes conditions pour confirmer l'amelioration.",
            "Verifiez si l'image est plus nette et plus lisible.",
        ]
    else:
        steps = [
            f"{_normalize_sentence(actionable_tip)}.",
            "Refaites une prise de parole courte en vous concentrant uniquement sur ce point.",
            "Verifiez si ce point devient plus naturel sur le nouvel essai.",
        ]

    if mode == "single_exercise":
        return steps[:2]
    return steps[:3]


def _dedupe_steps(steps: List[str], fallback: str) -> List[str]:
    cleaned_steps: List[str] = []
    seen: set[str] = set()
    for step in steps:
        normalized = _normalize_sentence(step)
        if not normalized:
            continue
        key = normalized.lower()
        if key in seen:
            continue
        seen.add(key)
        cleaned_steps.append(f"{normalized}.")
    if not cleaned_steps and fallback:
        cleaned_steps.append(f"{_normalize_sentence(fallback)}.")
    return cleaned_steps


def _append_plan_line(lines: List[str], candidate: str) -> None:
    normalized = _normalize_sentence(candidate)
    if not normalized:
        return
    if any(_normalize_sentence(existing).lower() == normalized.lower() for existing in lines):
        return
    lines.append(f"{normalized}.")


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


def _axis_score(scores: Scores, axis: str) -> float:
    axis_scores = {
        "voice": scores.voice_score,
        "presence": scores.presence_score,
        "body": scores.body_language_score,
        "scene": scores.scene_score,
    }
    return float(axis_scores.get(axis, 10.0))


def _axis_from_category(category: str) -> str:
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


def _estimated_minutes(audio: AudioMetrics) -> float:
    # Use true audio duration; keep a 10s floor to avoid inflated rates on very short clips.
    if audio.total_duration and audio.total_duration > 0:
        return max(audio.total_duration / 60.0, 1.0 / 6.0)
    return 1.0


def _gap_above(value: float, target_max: float, span: float) -> float:
    if value <= target_max:
        return 0.0
    return min((value - target_max) / max(span, 1e-6), 1.5)


def _gap_below(value: float, target_min: float, span: float) -> float:
    if value >= target_min:
        return 0.0
    return min((target_min - value) / max(span, 1e-6), 1.5)


def _ranked_priority(base: int, gap: float, axis_bonus: int) -> int:
    # Smoothly scale urgency by deviation while keeping deterministic ordering.
    return int(round(base + axis_bonus + (gap * 14.0)))


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


def _severity_rank(severity: str) -> int:
    normalized = (severity or "").strip().lower()
    if normalized == "critical":
        return 3
    if normalized == "warning":
        return 2
    if normalized == "info":
        return 1
    return 0


def _is_setup_category(category: str) -> bool:
    category_lower = (category or "").lower()
    return (
        "image" in category_lower
        or "lumiere" in category_lower
        or "nettete" in category_lower
        or "cadre" in category_lower
    )


def select_practice_mode(recommendations: List[Recommendation], scores: Scores) -> str:
    primary = recommendations[0] if recommendations else None
    if not primary or primary.category == "Maintien":
        return "none"

    overall_score = float(scores.overall_score or 0)
    severity_rank = _severity_rank(primary.severity)
    critical_count = sum(1 for recommendation in recommendations if _severity_rank(recommendation.severity) >= 3)
    warning_count = sum(1 for recommendation in recommendations if _severity_rank(recommendation.severity) >= 2)

    if overall_score >= 85 and critical_count == 0:
        return "none"

    if _is_setup_category(primary.category):
        return "setup_action"

    if overall_score >= 75 and severity_rank <= 2 and critical_count == 0:
        return "light_tip"

    if overall_score < 60 or severity_rank >= 3 or critical_count >= 2 or warning_count >= 2:
        return "mini_plan_3_days"

    return "single_exercise"


def build_exercise_payload(recommendations: List[Recommendation], scores: Scores | None = None) -> Dict[str, Any]:
    primary = recommendations[0] if recommendations else None
    secondary = recommendations[1] if len(recommendations) > 1 else None
    practice_mode = select_practice_mode(recommendations, scores or Scores())

    if not primary:
        return {
            "mode": "none",
            "should_display": False,
            "title": "Exercice cible",
            "summary": "Reprenez le point principal de la session avec un essai court et concentre.",
            "steps": [],
            "goal": "Stabiliser le point principal avant d'elargir le travail.",
            "self_check": "Est-ce que le point prioritaire est plus net sur ce nouvel essai ?",
            "focus_primary": "Progression generale",
            "focus_secondary": "Consolidation",
        }

    primary_doc = _find_fiche(primary.exercise_key)
    primary_steps = _extract_steps(primary_doc["content"]) if primary_doc else []
    primary_summary = _extract_summary(primary_doc["content"]) if primary_doc else primary.message
    primary_title = _extract_exercise_name(primary_doc["content"]) if primary_doc else primary.category

    actionable_summary = _practice_summary_from_category(primary.category, primary.actionable_tip)
    cleaned_steps = _dedupe_steps(primary_steps, primary.actionable_tip)
    custom_steps = _practice_steps_from_category(primary.category, primary.actionable_tip, practice_mode)
    if len(cleaned_steps) > 3:
        cleaned_steps = cleaned_steps[:3]

    payload = {
        "mode": practice_mode,
        "should_display": practice_mode != "none",
        "title": _action_title_from_category(primary.category) or primary_title,
        "summary": actionable_summary or primary_summary or primary.message,
        "steps": custom_steps or cleaned_steps,
        "goal": primary.actionable_tip,
        "self_check": _practice_self_check_from_category(primary.category),
        "focus_primary": primary.category.split(" & ")[0] if primary.category else "Progression generale",
        "focus_secondary": secondary.category.split(" & ")[0] if secondary else "Consolidation",
    }

    if practice_mode == "none":
        payload.update(
            {
                "title": "Aucun exercice prioritaire",
                "summary": "La session est deja solide. Continuez a garder ce niveau sur vos prochaines repetitions.",
                "steps": [],
                "goal": "Conserver la regularite deja installee.",
                "focus_primary": "Consolidation",
                "focus_secondary": "Maintien",
            }
        )
        return payload

    if practice_mode == "light_tip":
        payload.update(
            {
                "title": "Conseil de repetition",
                "summary": _build_light_tip(primary.category, primary.actionable_tip),
                "steps": [],
                "goal": "Verifier ce point sur une repetition courte sans alourdir la preparation.",
            }
        )
        return payload

    if practice_mode == "setup_action":
        payload.update(
            {
                "title": "A verifier avant la prochaine prise",
                "summary": _normalize_sentence(primary.actionable_tip) + ".",
                "steps": _practice_steps_from_category(primary.category, primary.actionable_tip, practice_mode)[:2],
                "goal": "Corriger l'installation avant d'enregistrer une nouvelle session.",
            }
        )
        return payload

    if practice_mode == "single_exercise":
        payload.update(
            {
                "summary": actionable_summary,
                "steps": custom_steps or [
                    f"{_normalize_sentence(primary.actionable_tip)}.",
                    "Refaites une prise de parole de 60 a 90 secondes pour verifier si ce point progresse.",
                ],
            }
        )
        return payload

    return payload


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
        gap = _gap_below(audio.wpm, 110, 30)
        all_recs.append(
            (
                _ranked_priority(74, gap, voice_priority_bonus),
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
        gap = _gap_above(audio.wpm, 175, 35)
        all_recs.append(
            (
                _ranked_priority(78, gap, voice_priority_bonus),
                Recommendation(
                    category="Voix & Debit",
                    severity="Critical",
                    message=f"Votre debit de parole est trop rapide ({round(audio.wpm)} mots/minute).",
                    actionable_tip="Marquez une vraie pause en fin de phrase pour ralentir legerement et laisser le temps au message d'etre compris.",
                    exercise_key="fiche-voix-002",
                ),
            )
        )
    elif audio.wpm > 168:
        gap = _gap_above(audio.wpm, 168, 22)
        all_recs.append(
            (
                _ranked_priority(58, gap, voice_priority_bonus),
                Recommendation(
                    category="Voix & Debit",
                    severity="Warning",
                    message=f"Votre debit de parole est un peu trop rapide ({round(audio.wpm)} mots/minute).",
                    actionable_tip="Marquez une vraie pause en fin de phrase pour ralentir legerement et laisser le temps au message d'etre compris.",
                    exercise_key="fiche-voix-002",
                ),
            )
        )
    elif audio.wpm > 160:
        gap = _gap_above(audio.wpm, 160, 8)
        all_recs.append(
            (
                _ranked_priority(46, gap, voice_priority_bonus),
                Recommendation(
                    category="Voix & Debit",
                    severity="Warning",
                    message=f"Votre debit de parole est un peu trop rapide ({round(audio.wpm)} mots/minute).",
                    actionable_tip="Marquez une vraie pause en fin de phrase pour ralentir legerement et laisser le temps au message d'etre compris.",
                    exercise_key="fiche-voix-002",
                ),
            )
        )

    estimated_mins = _estimated_minutes(audio)
    fillers_per_min = audio.filler_count / estimated_mins
    if fillers_per_min >= 3:
        gap = _gap_above(fillers_per_min, 3, 4)
        all_recs.append(
            (
                _ranked_priority(66, gap, voice_priority_bonus),
                Recommendation(
                    category="Voix & Fluidite",
                    severity="Warning",
                    message=f"Trop de mots parasites detectes ({audio.filler_count} 'euh', 'hum').",
                    actionable_tip="Remplacez les hesitations par un silence bref et assumez ce temps de recherche avant l'idee suivante.",
                    exercise_key="fiche-voix-003",
                ),
            )
        )

    if vision.face_presence_ratio < 0.8:
        gap = _gap_below(vision.face_presence_ratio, 0.8, 0.8)
        frame_priority = _presence_tie_break_priority(
            vision,
            _ranked_priority(76, gap, presence_priority_bonus),
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
        gap = _gap_below(vision.eye_contact_ratio, 0.7, 0.7)
        eye_priority = _presence_tie_break_priority(
            vision,
            _ranked_priority(82, gap, presence_priority_bonus),
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
        gap = _gap_below(vision.eye_contact_ratio, 0.7, 0.7)
        eye_priority = _presence_tie_break_priority(
            vision,
            _ranked_priority(64, gap, presence_priority_bonus),
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
        gap = _gap_below(vision.hands_visibility_ratio, 0.2, 0.5)
        all_recs.append(
            (
                _ranked_priority(62, gap, body_priority_bonus),
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
        gap = _gap_above(vision.hands_activity_score, 8.0, 4.0)
        all_recs.append(
            (
                _ranked_priority(58, gap, body_priority_bonus),
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
        gap = _gap_below(vision.avg_brightness, 70, 70)
        all_recs.append(
            (
                _ranked_priority(44, gap, scene_priority_bonus),
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
        gap = _gap_below(vision.avg_blur, 20, 20)
        all_recs.append(
            (
                _ranked_priority(48, gap, scene_priority_bonus),
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
    if len(all_recs) >= 2:
        first_priority, first_rec = all_recs[0]
        second_priority, second_rec = all_recs[1]
        if abs(first_priority - second_priority) < 5:
            first_axis = _axis_from_category(first_rec.category)
            second_axis = _axis_from_category(second_rec.category)
            first_axis_score = _axis_score(scores, first_axis)
            second_axis_score = _axis_score(scores, second_axis)
            # For close priorities, lead with the weaker pedagogical axis.
            if second_axis_score + 0.2 < first_axis_score:
                all_recs[0], all_recs[1] = all_recs[1], all_recs[0]
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


def generate_training_plan(recommendations: List[Recommendation], scores: Scores | None = None) -> str:
    """Generate a practice block adapted to the current session level."""
    exercise = build_exercise_payload(recommendations, scores=scores)
    mode = exercise.get("mode", "single_exercise")

    if mode == "none":
        return ""

    steps = exercise.get("steps") or []
    primary_step = steps[0] if len(steps) > 0 else "Relisez la priorite de travail."
    second_step = steps[1] if len(steps) > 1 else "Refaites une prise de parole de 60 a 90 secondes pour verifier ce point."
    third_step = steps[2] if len(steps) > 2 else exercise.get("self_check", "Verifiez si le point prioritaire progresse sur le nouvel essai.")

    if mode == "light_tip":
        return ""

    if mode == "setup_action":
        setup_lines: List[str] = []
        _append_plan_line(setup_lines, exercise.get('summary', exercise.get('goal', 'Verifiez votre installation avant la prochaine prise.')))
        for step in steps[:2]:
            _append_plan_line(setup_lines, step)
        setup_block = '\n'.join(f"  - {line}" for line in setup_lines)
        return f"""### Verification avant la prochaine prise

**Focus Principal :** {exercise.get('focus_primary', 'Progression generale')}
**Focus Secondaire :** {exercise.get('focus_secondary', 'Consolidation')}

* **Action de preparation**
{setup_block}
"""

    if mode == "single_exercise":
        single_lines: List[str] = []
        _append_plan_line(single_lines, exercise.get('summary', 'Reprenez le point principal de la session avec un essai court et concentre.'))
        _append_plan_line(single_lines, primary_step)
        _append_plan_line(single_lines, second_step)
        _append_plan_line(single_lines, exercise.get('self_check', 'Verifiez si le point prioritaire progresse sur le nouvel essai.'))
        single_block = '\n'.join(f"  - {line}" for line in single_lines)
        return f"""### Exercice prioritaire

**Focus Principal :** {exercise.get('focus_primary', 'Progression generale')}
**Focus Secondaire :** {exercise.get('focus_secondary', 'Consolidation')}

* **Exercice principal - {exercise.get('title', 'Exercice cible')}**
{single_block}
"""

    day_1_lines: List[str] = []
    summary_text = exercise.get('summary', 'Reprenez le point principal de la session avec un essai court et concentre.')
    primary_text = primary_step
    if (
        _normalize_sentence(summary_text).lower() != _normalize_sentence(primary_text).lower()
        and _token_overlap(summary_text, primary_text) < 0.55
    ):
        _append_plan_line(day_1_lines, summary_text)
    _append_plan_line(day_1_lines, primary_text)

    day_2_lines: List[str] = []
    _append_plan_line(day_2_lines, second_step)

    day_3_lines: List[str] = []
    _append_plan_line(day_3_lines, third_step)
    _append_plan_line(day_3_lines, exercise.get('goal', 'Stabiliser le point principal avant d elargir le travail.'))

    day_1_block = '\n'.join(f"  - {line}" for line in day_1_lines)
    day_2_block = '\n'.join(f"  - {line}" for line in day_2_lines)
    day_3_block = '\n'.join(f"  - {line}" for line in day_3_lines)

    return f"""### Séquence d'entraînement recommandée

**Focus Principal :** {exercise.get('focus_primary', 'Progression generale')}
**Focus Secondaire :** {exercise.get('focus_secondary', 'Consolidation')}

* **Bloc 1 : Exercice principal - {exercise.get('title', 'Exercice cible')}**
{day_1_block}

* **Bloc 2 : Mise en pratique**
{day_2_block}

* **Bloc 3 : Consolidation**
{day_3_block}
"""
