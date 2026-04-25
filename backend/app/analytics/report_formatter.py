from __future__ import annotations

from datetime import datetime
from html import escape
import re
import unicodedata
from typing import Any, Dict, List, Tuple

from app.analytics.models import AnalysisResult, VideoSession


LANGUAGE_LABELS = {
    'fr': 'Francais',
    'en': 'English',
    'ar': 'Arabic',
    'unknown': 'Non renseignee',
}


def _safe_float(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _safe_int(value: Any) -> int:
    return int(round(_safe_float(value)))


def _normalize_resolution(value: Any) -> Tuple[int, int]:
    if isinstance(value, (list, tuple)) and len(value) == 2:
        return (_safe_int(value[0]), _safe_int(value[1]))
    return (0, 0)


def _format_resolution(value: Any) -> str:
    width, height = _normalize_resolution(value)
    if width <= 0 or height <= 0:
        return 'Non renseignee'
    return f'{width}x{height}'


def _format_fps(value: Any) -> str:
    fps = _safe_float(value)
    if fps <= 1 or fps > 240:
        return 'Non renseigne'
    return str(round(fps, 2)).rstrip('0').rstrip('.')


def _format_sharpness_label(value: Any) -> str:
    blur = _safe_int(value)
    if blur < 20:
        return 'Floue (Inexploitable)'
    if blur < 40:
        return 'Passable (Limite)'
    return 'Nette (Optimale)'


def _format_axis_score(value: Any) -> str:
    return f"{_safe_float(value):.1f}/10"


def _format_intensity_label(value: Any) -> str:
    score = _safe_float(value)
    if score >= 7.5:
        return 'Agitée'
    if score >= 3.5:
        return 'Naturelle'
    return 'Statique'


def _format_pace_label(value: Any) -> str:
    wpm = _safe_int(value)
    if wpm > 180:
        return 'Trop rapide'
    if wpm > 150:
        return 'Rapide'
    if wpm >= 120:
        return 'Idéal'
    if wpm > 0:
        return 'Lent'
    return 'N/A'


def _format_eye_contact_label(value: Any) -> str:
    ratio = _safe_int(value)
    if ratio >= 70:
        return 'Bon'
    if ratio >= 40:
        return 'Moyen'
    return 'Faible'


def _format_hands_label(value: Any) -> str:
    ratio = _safe_int(value)
    if ratio >= 60:
        return 'Visibles'
    if ratio >= 30:
        return 'Parfois visibles'
    return 'Peu visibles'


def _format_lighting_label(value: Any) -> str:
    brightness = _safe_int(value)
    if brightness < 70:
        return 'Trop sombre'
    if brightness > 210:
        return 'Surexposée'
    return 'Optimale'


def _score_headline(score: int) -> str:
    if score >= 85:
        return 'Presentation solide et professionnelle.'
    if score >= 70:
        return 'Base convaincante avec quelques ajustements prioritaires.'
    if score >= 55:
        return 'Bon potentiel, mais certains fondamentaux doivent etre stabilises.'
    return 'Une repetition ciblee peut produire un gain rapide.'


def _fallback_narrative(strengths: List[str], weaknesses: List[str]) -> str:
    if strengths and weaknesses:
        return f'Point fort: {strengths[0]} Point a travailler: {weaknesses[0]}'
    if strengths:
        return f'La presentation montre deja un point fort clair: {strengths[0]}'
    if weaknesses:
        return f'La priorite actuelle est la suivante: {weaknesses[0]}'
    return 'Rapport genere avec succes. Consultez les sections ci-dessous pour preparer votre prochaine repetition.'


def _normalize_recommendations(items: Any) -> List[Dict[str, str]]:
    if not isinstance(items, list):
        return []

    normalized: List[Dict[str, str]] = []
    for item in items[:5]:
        if not isinstance(item, dict):
            continue
        normalized.append(
            {
                'category': str(item.get('category', 'General')).strip() or 'General',
                'severity': str(item.get('severity', 'Info')).strip() or 'Info',
                'message': str(item.get('message', '')).strip(),
                'tip': str(item.get('actionable_tip', item.get('tip', ''))).strip(),
            }
        )
    return normalized


def _normalize_transcript(items: Any) -> List[Dict[str, Any]]:
    if not isinstance(items, list):
        return []

    transcript: List[Dict[str, Any]] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        text = str(item.get('text', '')).strip()
        if not text:
            continue
        transcript.append(
            {
                'start': round(_safe_float(item.get('start', 0)), 2),
                'end': round(_safe_float(item.get('end', 0)), 2),
                'text': text,
            }
        )
    return transcript


def _parse_focus_line(prefix: str, line: str) -> str:
    if prefix not in line:
        return ''
    return line.split(prefix, 1)[1].strip().strip('*').strip()


def _parse_training_plan(markdown: Any) -> Dict[str, Any]:
    if not isinstance(markdown, str) or not markdown.strip():
        return {
            'focus_primary': '',
            'focus_secondary': '',
            'days': [],
        }

    focus_primary = ''
    focus_secondary = ''
    days: List[Dict[str, Any]] = []
    current_day: Dict[str, Any] | None = None

    for raw_line in markdown.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        if line.startswith('**Focus Principal'):
            focus_primary = _parse_focus_line('**Focus Principal :**', line)
            continue

        if line.startswith('**Focus Secondaire'):
            focus_secondary = _parse_focus_line('**Focus Secondaire :**', line)
            continue

        if line.startswith('* **') and line.endswith('**'):
            title = line[2:].strip().strip('*').strip()
            current_day = {'title': title, 'items': []}
            days.append(current_day)
            continue

        if line.startswith('-') and current_day is not None:
            current_day['items'].append(line[1:].strip())

    return {
        'focus_primary': focus_primary,
        'focus_secondary': focus_secondary,
        'days': days,
    }


def _format_date(value: str) -> str:
    try:
        return datetime.fromisoformat(value).strftime('%d/%m/%Y')
    except Exception:
        return value or 'Non renseignee'


def _format_duration(seconds: Any) -> str:
    total_seconds = _safe_int(seconds)
    if total_seconds <= 0:
        return 'Non renseignee'
    minutes, remaining_seconds = divmod(total_seconds, 60)
    if minutes == 0:
        return f'{remaining_seconds}s'
    if remaining_seconds == 0:
        return f'{minutes} min'
    return f'{minutes} min {remaining_seconds}s'


def _format_language(code: str) -> str:
    normalized = str(code or 'unknown').strip().lower()
    return LANGUAGE_LABELS.get(normalized, normalized.upper())


def _sanitize_filename(title: str) -> str:
    normalized = re.sub(r'[^A-Za-z0-9]+', '-', title.strip().lower()).strip('-')
    return normalized or 'speechcoach-report'


def _normalize_overlap_text(value: str) -> List[str]:
    return [
        token
        for token in re.sub(r'[^a-z0-9\s]', ' ', (value or '').lower())
        .split()
        if len(token) > 3
    ]


def _has_strong_overlap(candidate: str, references: List[str]) -> bool:
    candidate_tokens = set(_normalize_overlap_text(candidate))
    if len(candidate_tokens) < 4:
        return False

    for reference in references:
        reference_tokens = set(_normalize_overlap_text(reference))
        if not reference_tokens:
            continue
        shared = candidate_tokens & reference_tokens
        if len(shared) / max(len(candidate_tokens), 1) >= 0.55:
            return True
    return False


def _sanitize_exercise_recommendation(
    exercise_recommendation: Dict[str, Any],
    summary: Dict[str, Any],
    recommendations: List[Dict[str, str]],
) -> Dict[str, Any]:
    if not isinstance(exercise_recommendation, dict):
        return {}

    cleaned = dict(exercise_recommendation)
    if str(cleaned.get('mode') or '').strip().lower() == 'setup_action':
        # Setup actions are short by design (usually 1-2 steps); keep deterministic steps as-is.
        setup_steps = [str(step).strip() for step in (cleaned.get('steps') or []) if str(step).strip()]
        cleaned['steps'] = setup_steps[:2]
        return cleaned

    references = [
        str(summary.get('narrative') or ''),
        str(summary.get('priority_focus') or ''),
        str(summary.get('encouragement') or ''),
    ]
    if recommendations:
        references.append(str(recommendations[0].get('message') or ''))
        references.append(str(recommendations[0].get('tip') or ''))

    summary_text = str(cleaned.get('summary') or '').strip()
    if _has_strong_overlap(summary_text, references):
        cleaned['summary'] = ''

    filtered_steps: List[str] = []
    for step in cleaned.get('steps') or []:
        step_text = str(step).strip()
        if not step_text:
            continue
        if _has_strong_overlap(step_text, references):
            continue
        filtered_steps.append(step_text)
    cleaned['steps'] = filtered_steps[:3]

    if not cleaned.get('summary') and cleaned['steps']:
        cleaned['summary'] = cleaned['steps'][0]
        cleaned['steps'] = cleaned['steps'][1:]

    return cleaned


def _sanitize_encouragement(
    encouragement: Any,
    weaknesses: List[str],
    recommendations: List[Dict[str, str]],
) -> str | None:
    text = str(encouragement or '').strip()
    if not text:
        return None
    # We disabled the overlap check to ensure the LLM's conclusion is always visible
    return text


def _sanitize_training_plan(
    training_plan: Dict[str, Any],
    summary: Dict[str, Any],
    recommendations: List[Dict[str, str]],
) -> Dict[str, Any]:
    if not isinstance(training_plan, dict):
        return {'focus_primary': '', 'focus_secondary': '', 'days': []}

    references = [
        str(summary.get('narrative') or ''),
        str(summary.get('priority_focus') or ''),
        str(summary.get('encouragement') or ''),
    ]
    if recommendations:
        references.append(str(recommendations[0].get('message') or ''))
        references.append(str(recommendations[0].get('tip') or ''))

    cleaned_days: List[Dict[str, Any]] = []
    for day in training_plan.get('days', []):
        title = str(day.get('title') or '').strip() or 'Bloc de pratique'
        items = []
        for item in day.get('items', []):
            text = str(item).strip()
            if not text:
                continue
            if _has_strong_overlap(text, references):
                continue
            items.append(text)
        if items:
            cleaned_days.append({'title': title, 'items': items[:3]})

    return {
        'focus_primary': training_plan.get('focus_primary', ''),
        'focus_secondary': training_plan.get('focus_secondary', ''),
        'days': cleaned_days,
    }


def _is_multi_focus_text(value: str) -> bool:
    families = _families_in_text(str(value or ''))
    return len(families) >= 2


def _normalize_text(value: str) -> str:
    raw = str(value or '')
    normalized = unicodedata.normalize('NFD', raw)
    normalized = ''.join(ch for ch in normalized if unicodedata.category(ch) != 'Mn')
    return normalized


def _families_in_text(value: str) -> set[str]:
    text = _normalize_text(str(value or '')).lower()
    families: set[str] = set()
    if any(token in text for token in ['image', 'nettete', 'flou', 'mise au point', 'focus', 'lumiere', 'eclairage', 'cadre', 'cadrage', 'hors champ', 'champ', 'plan', 'camera', 'cam']):
        families.add('scene')
    if any(token in text for token in ['voix', 'debit', 'rythme', 'vitesse', 'parole', 'articulation', 'fluidite', 'hesitation', 'mots parasites', 'repetition']):
        families.add('voice')
    # "objectif/camera" are ambiguous here (lens vs eye-contact): only explicit
    # gaze/presence words should classify to presence to avoid false multi-axis.
    if any(token in text for token in ['regard', 'presence', 'contact visuel']):
        families.add('presence')
    if any(token in text for token in ['gestuelle', 'mains', 'posture', 'epaules', 'corps']):
        families.add('body')
    families.discard('scene') if 'scene' in families and 'presence' in families and any(token in text for token in ['regard', 'contact visuel']) else None
    return families


def _focus_family_labels(value: str) -> str:
    text = _normalize_text(str(value or '')).strip().lower()
    if any(token in text for token in ['image', 'nettete', 'flou', 'mise au point', 'focus', 'lumiere', 'eclairage', 'cadre', 'cadrage', 'scene', 'hors champ', 'champ', 'plan']):
        return 'scene'
    if any(token in text for token in ['voix', 'debit', 'rythme', 'vitesse', 'parole', 'articulation', 'fluidite', 'hesitation', 'mots parasites', 'repetition']):
        return 'voice'
    if any(token in text for token in ['regard', 'presence', 'contact visuel']):
        return 'presence'
    if any(token in text for token in ['gestuelle', 'mains', 'posture', 'epaules', 'corps']):
        return 'body'
    return 'general'


def _normalize_focus_tag(value: Any) -> str:
    raw = _normalize_text(str(value or '')).strip().lower().replace('-', '_')
    aliases = {
        'voix': 'voice',
        'debit': 'voice',
        'rythme': 'voice',
        'presence': 'presence',
        'regard': 'presence',
        'gestes': 'body',
        'gestuelle': 'body',
        'posture': 'body',
        'cadrage': 'scene',
        'image': 'scene',
        'nettet': 'scene',
    }
    if raw in {'voice', 'presence', 'body', 'scene', 'general'}:
        return raw
    for key, mapped in aliases.items():
        if key in raw:
            return mapped
    return ''


def _llm_exercise_conflicts_with_primary(
    primary_focus: str,
    title: str,
    consigne: str,
    llm_focus_family: str = '',
) -> bool:
    primary_family = _focus_family_labels(primary_focus)
    if primary_family == 'general':
        return False

    normalized_llm_focus = _normalize_focus_tag(llm_focus_family)
    if normalized_llm_focus and normalized_llm_focus != primary_family:
        return True

    llm_text = f"{title} {consigne}"
    mentioned_families = _families_in_text(llm_text)
    if not mentioned_families:
        return False

    if normalized_llm_focus == primary_family:
        # Canonical focus tag is trusted when coherent; only reject explicit multi-axis mix.
        return any(family != primary_family for family in mentioned_families)

    if primary_family not in mentioned_families:
        return True
    return any(family != primary_family for family in mentioned_families)


def _is_frame_critical(vision_metrics: Dict[str, Any]) -> bool:
    face_presence = _safe_int(_safe_float(vision_metrics.get('face_presence_ratio')) * 100)
    return face_presence < 80


def _deterministic_priority_sentence(recommendations: List[Dict[str, str]], fallback_focus: str) -> str:
    if recommendations:
        top = recommendations[0]
        message = str(top.get('message') or '').strip()
        tip = str(top.get('tip') or '').strip()
        if message and tip:
            return f"{message} {tip}"
        if message:
            return message
        if tip:
            return tip
    return fallback_focus or 'Progression generale'


def build_report_response(session: VideoSession, analysis: AnalysisResult) -> Dict[str, Any]:
    metrics = analysis.metrics_json or {}
    scores = metrics.get('scores') or {}
    audio = metrics.get('audio_metrics') or {}
    vision = metrics.get('vision_metrics') or {}
    metadata = metrics.get('metadata') or {}
    eq_metrics = metrics.get('eq_metrics') or {}
    llm_coaching = metrics.get('llm_coaching') or {}
    enrichment_status = str(metrics.get('enrichment_status') or 'completed')

    strengths = [str(item).strip() for item in (metrics.get('strengths') or []) if str(item).strip()]
    weaknesses = [str(item).strip() for item in (metrics.get('weaknesses') or []) if str(item).strip()]
    recommendations = _normalize_recommendations(metrics.get('recommendations') or [])
    deterministic_primary_focus = (
        recommendations[0]['category']
        if recommendations and recommendations[0].get('category')
        else 'Progression generale'
    )
    deterministic_priority_text = _deterministic_priority_sentence(recommendations, deterministic_primary_focus)
    deterministic_secondary_focus = (
        recommendations[1]['category']
        if len(recommendations) > 1 and recommendations[1].get('category')
        else 'Consolidation'
    )
    deterministic_primary_family = _focus_family_labels(deterministic_primary_focus)
    llm_focus_primary = _normalize_focus_tag(llm_coaching.get('focus_primary'))

    transcript = _normalize_transcript(metrics.get('transcript') or [])
    training_plan_markdown = str(metrics.get('training_plan') or '')
    training_plan = _parse_training_plan(training_plan_markdown)
    exercise_recommendation = metrics.get('exercise_recommendation') or {}

    duration_seconds = _safe_float(session.duration_seconds)
    if duration_seconds <= 0:
        duration_seconds = _safe_float(metadata.get('duration_seconds')) or _safe_float(audio.get('total_duration'))

    fps = _safe_float(metadata.get('fps'))
    resolution = _normalize_resolution(metadata.get('resolution'))
    language = str(metadata.get('detected_language') or 'unknown').strip() or 'unknown'

    overall_score = _safe_int(getattr(analysis, 'overall_score', 0))
    llm_bilan = str(llm_coaching.get('bilan_global') or '').strip()
    summary_narrative = llm_bilan or _fallback_narrative(strengths, weaknesses)
    priority_focus = str(llm_coaching.get('point_prioritaire') or '').strip()
    priority_origin = 'llm'
    priority_reason = ''
    if not priority_focus:
        priority_origin = 'fallback'
        priority_reason = 'llm_missing'
        if recommendations:
            priority_focus = recommendations[0]['category']
        elif weaknesses:
            priority_focus = weaknesses[0]
        else:
            priority_focus = 'Progression generale'
    elif llm_focus_primary and deterministic_primary_family != 'general' and llm_focus_primary != deterministic_primary_family:
        priority_origin = 'fallback'
        priority_reason = 'llm_focus_tag_mismatch'
        priority_focus = deterministic_priority_text
    elif not llm_focus_primary and _is_multi_focus_text(priority_focus):
        # Keep one coherent focus sentence rather than raw category labels.
        priority_origin = 'fallback'
        priority_reason = 'llm_multi_axis'
        priority_focus = deterministic_priority_text

    encouragement = _sanitize_encouragement(llm_coaching.get('encouragement'), weaknesses, recommendations)
    encouragement_origin = 'llm' if encouragement else 'fallback'
    encouragement_reason = '' if encouragement else 'llm_missing'

    bilan_origin = 'llm' if llm_bilan else 'fallback'
    bilan_reason = '' if llm_bilan else 'llm_missing'

    summary_payload = {
        'overall_score': overall_score,
        'headline': _score_headline(overall_score),
        'narrative': summary_narrative,
        'priority_focus': priority_focus,
        'encouragement': encouragement,
        'exercice_titre': llm_coaching.get('exercice_titre'),
        'exercice_consigne': llm_coaching.get('exercice_consigne'),
        'focus_primary': llm_focus_primary,
    }
    exercise_recommendation = _sanitize_exercise_recommendation(exercise_recommendation, summary_payload, recommendations)
    training_plan = _sanitize_training_plan(training_plan, summary_payload, recommendations)

    if llm_coaching and 'exercice_titre' in llm_coaching and 'exercice_consigne' in llm_coaching:
        llm_title = str(llm_coaching.get('exercice_titre', 'Pratique Ciblée'))
        consigne = str(llm_coaching.get('exercice_consigne', ''))
        llm_conflict = _llm_exercise_conflicts_with_primary(
            deterministic_primary_focus,
            llm_title,
            consigne,
            llm_focus_primary,
        )
        exercise_origin = 'llm'
        exercise_reason = ''
        # Hard guard: when frame presence is critical, keep a strict mono-axis exercise.
        if _is_frame_critical(vision) and _focus_family_labels(deterministic_primary_focus) == 'presence':
            llm_conflict = True
            exercise_origin = 'fallback'
            exercise_reason = 'frame_critical'
        elif llm_conflict:
            exercise_origin = 'fallback'
            exercise_reason = 'llm_focus_mismatch_or_multi_axis'

        exercise_recommendation['focus_primary'] = deterministic_primary_focus
        exercise_recommendation['focus_secondary'] = deterministic_secondary_focus
        exercise_recommendation['mode'] = 'single_exercise'
        exercise_recommendation['should_display'] = True

        if not llm_conflict:
            steps = [s.strip() for s in consigne.split(' | ') if s.strip()]
            if len(steps) < 2:
                 steps = [s.strip() for s in consigne.split('\n') if s.strip()]
            exercise_recommendation['title'] = llm_title
            exercise_recommendation['summary'] = 'Une action concrète à tester dès la prochaine répétition.'
            exercise_recommendation['steps'] = steps if steps else [consigne]
            # Override legacy 3-day plan so the UI prioritizes the AI mission
            training_plan['days'] = []
    else:
        exercise_origin = 'fallback'
        exercise_reason = 'llm_missing'

    if exercise_recommendation.get('should_display') and not training_plan.get('days') and not exercise_recommendation.get('summary') and not exercise_recommendation.get('steps'):
        exercise_recommendation['should_display'] = False
        exercise_origin = 'fallback'
        exercise_reason = 'empty_exercise_payload'

    return {
        'session': {
            'id': str(session.id),
            'title': session.title or f'Analyse #{str(session.id)[:8]}',
            'created_at': session.created_at.isoformat() if session.created_at else '',
            'video_url': session.video_url,
            'duration_seconds': round(duration_seconds, 2),
            'language': language,
            'fps': round(fps, 2),
            'resolution': [resolution[0], resolution[1]],
            'device_type': str(metadata.get('device_type') or 'unknown'),
            'device_source': str(metadata.get('device_source') or 'fallback'),
            'device_confidence': round(_safe_float(metadata.get('device_confidence')), 3),
            'processing_time': round(_safe_float(metadata.get('processing_time')), 2),
        },
        'summary': summary_payload,
        'fallbacks': {
            'bilan': {'origin': bilan_origin, 'reason': bilan_reason},
            'priorite': {'origin': priority_origin, 'reason': priority_reason},
            'encouragement': {'origin': encouragement_origin, 'reason': encouragement_reason},
            'exercice': {'origin': exercise_origin, 'reason': exercise_reason},
        },
        'scores': {
            'overall': overall_score,
            'voice': _safe_int(_safe_float(scores.get('voice_score')) * 10),
            'body_language': _safe_int(_safe_float(scores.get('body_language_score')) * 10),
            'scene': _safe_int(_safe_float(scores.get('scene_score')) * 10),
            'presence': _safe_int(_safe_float(scores.get('presence_score')) * 10),
            'eye_contact': _safe_int(_safe_float(vision.get('eye_contact_ratio')) * 100),
        },
        'metrics': {
            'wpm': _safe_int(audio.get('wpm')),
            'pause_count': _safe_int(audio.get('pause_count')),
            'filler_count': _safe_int(audio.get('filler_count')),
            'stutter_count': _safe_int(audio.get('stutter_count')),
            'pause_duration_total': round(_safe_float(audio.get('pause_duration_total')), 2),
            'face_presence_ratio': _safe_int(_safe_float(vision.get('face_presence_ratio')) * 100),
            'eye_contact_ratio': _safe_int(_safe_float(vision.get('eye_contact_ratio')) * 100),
            'hands_visibility_ratio': _safe_int(_safe_float(vision.get('hands_visibility_ratio')) * 100),
            'hands_activity_score': round(_safe_float(vision.get('hands_activity_score')), 2),
            'hands_intensity_label': _format_intensity_label(vision.get('hands_activity_score')),
            'brightness': _safe_int(vision.get('avg_brightness')),
            'blur': _safe_int(vision.get('avg_blur')),
        },
        'strengths': strengths[:4],
        'weaknesses': weaknesses[:4],
        'recommendations': recommendations,
        'training_plan': training_plan,
        'exercise_recommendation': exercise_recommendation,
        'training_plan_markdown': training_plan_markdown,
        'transcript': transcript,
        'eq_metrics': eq_metrics if isinstance(eq_metrics, dict) else {},
        'enrichment_status': enrichment_status,
        'visuals': {
            'audio_energy': f"/storage/processing/{str(session.id)}/audio_energy.png",
            'vision_timeline': f"/storage/processing/{str(session.id)}/vision_timeline.png",
        }
    }


def build_report_markdown(report: Dict[str, Any]) -> str:
    session = report.get('session') or {}
    summary = report.get('summary') or {}
    scores = report.get('scores') or {}
    metrics = report.get('metrics') or {}
    strengths = report.get('strengths') or []
    weaknesses = report.get('weaknesses') or []
    exercise_recommendation = report.get('exercise_recommendation') or {}
    training_plan = report.get('training_plan') or {}
    transcript = report.get('transcript') or []

    lines: List[str] = [
        '# Rapport SpeechCoach',
        '',
        '## Resume executif',
        str(summary.get('headline', '')).strip() or 'Synthese du coach',
        '',
        str(summary.get('narrative', '')).strip() or 'Resume indisponible.',
        '',
        f"**Priorite :** {summary.get('priority_focus', '') or 'Progression generale'}",
        '',
        '## Session',
        f"- Date de session : {_format_date(str(session.get('created_at', '')))}",
        f"- Duree video : {_format_duration(session.get('duration_seconds', 0))}",
        f"- Langue : {_format_language(str(session.get('language', 'unknown')))}",
        f"- Temps d'analyse : {_format_duration(session.get('processing_time', 0))}",
        '',
        '## Scores & bilan',
        f"- Score global : {summary.get('overall_score', scores.get('overall', 0))}/100",
        f"- Voix / Debit : {_format_axis_score(scores.get('voice', 0))}",
        f"- Posture / Gestes : {_format_axis_score(scores.get('body_language', 0))}",
        f"- Regard / Presence : {_format_axis_score(scores.get('presence', 0))}",
        f"- Qualite / Cadrage : {_format_axis_score(scores.get('scene', 0))}",
        '',
    ]

    encouragement = str(summary.get('encouragement') or '').strip()
    if encouragement:
        lines.extend([f'> {encouragement}', ''])

    lines.extend([
        '## Points forts',
        '',
    ])

    if strengths:
        lines.extend([f'- {item}' for item in strengths])
    else:
        lines.append('- Aucun point fort detaille n a ete fourni.')

    lines.extend(['', '## Axes de progression', ''])
    if weaknesses:
        lines.extend([f'- {item}' for item in weaknesses])
    else:
        lines.append('- Aucun point de vigilance detaille n a ete fourni.')

    lines.extend([
        '## Details des mesures',
        '',
        '### Voix',
        f"- Rythme de parole : {metrics.get('wpm', 0)} mots/min ({_format_pace_label(metrics.get('wpm', 0))})",
        "- Objectif : Entre 120 et 160 mots/min (Maitrise)",
        f"- Pauses marquées (>0.5s) : {metrics.get('pause_count', 0)}",
        "- Objectif : Moins de 4 pauses longues par minute",
        f"- Hésitations détectées : {metrics.get('filler_count', 0)} ({'Excellent !' if metrics.get('filler_count', 0) == 0 else 'A réduire'})",
        "- Objectif : Moins de 2 mots parasites par minute",
        f"- Répétitions détectées : {metrics.get('stutter_count', 0)} ({'Excellent !' if metrics.get('stutter_count', 0) == 0 else 'A surveiller'})",
        "- Objectif : Aucune repetition pour un score optimal",
        '',
        '### Qualite video',
        f"- Luminosite : {metrics.get('brightness', 0)} ({_format_lighting_label(metrics.get('brightness', 0))})",
        "- Objectif : Entre 70 et 210 pour eviter l'eblouissement",
        f"- Nettete : {metrics.get('blur', 0)} ({_format_sharpness_label(metrics.get('blur', 0))})",
        "- Objectif : Score superieur a 40 pour une image nette",
        '',
        '### Presence a l ecran',
        f"- Visage visible dans le cadre : {metrics.get('face_presence_ratio', 0)}%",
        "- Objectif : Superieure a 80% dans le cadre",
        f"- Regard vers la caméra : {metrics.get('eye_contact_ratio', 0)}% ({_format_eye_contact_label(metrics.get('eye_contact_ratio', 0))})",
        "- Objectif : Soutenir la camera (> 70% du temps)",
        f"- Mains visibles : {metrics.get('hands_visibility_ratio', 0)}% ({_format_hands_label(metrics.get('hands_visibility_ratio', 0))})",
        "- Objectif : Mains dans le cadre (> 60% du temps)",
        f"- Intensité gestuelle : {metrics.get('hands_activity_score', 0)}/10 ({metrics.get('hands_intensity_label', 'N/A')})",
        "- Objectif : Mouvement equilibre (2.5 a 6.5/10)",
        '',
    ])

    eq_metrics = report.get('eq_metrics') or {}

    # Metriques vocales
    lines.extend([
        '### Metriques vocales',
        '',
    ])
    lines.extend([
        f"- **Debit (WPM)** : {metrics.get('wpm', 0)} mots/min ({_format_pace_label(metrics.get('wpm', 0))})",
        "  Objectif : Entre 120 et 160 mots/min (Maitrise)",
        '',
        f"- **Pauses (>0.5s)** : {metrics.get('pause_count', 0)} pause(s)",
        "  Objectif : Moins de 4 pauses longues par minute",
        '',
        f"- **Hesitations** : {metrics.get('filler_count', 0)} detectee(s)",
        "  Objectif : Moins de 2 mots parasites par minute",
        '',
        f"- **Repetitions** : {metrics.get('stutter_count', 0)} detectee(s)",
        "  Objectif : Aucune repetition pour un score optimal",
        '',
    ])

    # Qualite visuelle
    lines.extend([
        '### Qualite visuelle',
        '',
    ])
    lines.extend([
        f"- **Luminosite** : {metrics.get('brightness', 0)} ({_format_lighting_label(metrics.get('brightness', 0))})",
        "  Objectif : Entre 70 et 210 pour eviter l'eblouissement",
        '',
        f"- **Nettete** : {metrics.get('blur', 0)} ({_format_sharpness_label(metrics.get('blur', 0))})",
        "  Objectif : Score superieur a 40 pour une image nette",
        '',
    ])

    # Metriques visuelles
    lines.extend([
        '### Metriques visuelles',
        '',
    ])
    lines.extend([
        f"- **Presence visage** : {metrics.get('face_presence_ratio', 0)}%",
        "  Objectif : Superieure a 80% dans le cadre",
        '',
        f"- **Contact visuel** : {metrics.get('eye_contact_ratio', 0)}% ({_format_eye_contact_label(metrics.get('eye_contact_ratio', 0))})",
        "  Objectif : Soutenir la camera (> 70% du temps)",
        '',
        f"- **Mains visibles** : {metrics.get('hands_visibility_ratio', 0)}% ({_format_hands_label(metrics.get('hands_visibility_ratio', 0))})",
        "  Objectif : Mains dans le cadre (> 60% du temps)",
        '',
        f"- **Intensite gestuelle** : {metrics.get('hands_activity_score', 0)}/10 ({metrics.get('hands_intensity_label', 'N/A')})",
        "  Objectif : Mouvement equilibre (2.5 a 6.5/10)",
        '',
    ])

    # Indicateurs emotionnels (EQ metrics) - at the end since they're derived from other metrics
    if eq_metrics and isinstance(eq_metrics, dict):
        eq_scores = eq_metrics.get('scores') or {}
        eq_objectives = eq_metrics.get('objectives') or {}
        emotion_scores = eq_metrics.get('emotion_scores') or {}

        lines.extend([
            '### Indicateurs emotionnels',
            '',
        ])

        stress_score = _safe_int(eq_scores.get('stress', 0))
        stress_aspects = ', '.join(eq_objectives.get('stress', {}).get('aspects', []))
        lines.extend([
            f"- **Stress** : {stress_score}/100",
            f"  Indicateurs : {stress_aspects}" if stress_aspects else "",
            '',
        ])

        confidence_score = _safe_int(eq_scores.get('confidence', 0))
        confidence_aspects = ', '.join(eq_objectives.get('confidence', {}).get('aspects', []))
        lines.extend([
            f"- **Confiance** : {confidence_score}/100",
            f"  Indicateurs : {confidence_aspects}" if confidence_aspects else "",
            '',
        ])

        articulation_score = _safe_int(eq_scores.get('articulation', 0))
        articulation_aspects = ', '.join(eq_objectives.get('articulation', {}).get('aspects', []))
        lines.extend([
            f"- **Articulation** : {articulation_score}/100",
            f"  Indicateurs : {articulation_aspects}" if articulation_aspects else "",
            '',
        ])

        # Comparison: Rule-Based vs Model-Based
        if emotion_scores and isinstance(emotion_scores, dict):
            rule_based = emotion_scores.get('rule_based') or {}
            model_based = emotion_scores.get('model_based') or {}

            rule_eq = rule_based.get('eq_scores') or {}
            model_eq = model_based.get('eq_scores') or {}
            vision_available = model_based.get('vision_available', True)

            if rule_eq and model_eq:
                lines.extend([
                    '#### Comparaison des méthodes d\'analyse',
                    '',
                    '| Méthode | Stress | Confiance | Articulation |',
                    '|---------|--------|-----------|--------------|',
                    f"| Règles (Librosa/MediaPipe) | {_safe_int(rule_eq.get('stress', 0))}/100 | {_safe_int(rule_eq.get('confidence', 0))}/100 | {_safe_int(rule_eq.get('articulation', 0))}/100 |",
                ])

                # Adjust label based on vision availability
                method_label = "IA (Wav2Vec2)" if not vision_available else "IA (Wav2Vec2/HSEmotion)"
                lines.append(f"| {method_label} | {_safe_int(model_eq.get('stress', 0))}/100 | {_safe_int(model_eq.get('confidence', 0))}/100 | {_safe_int(model_eq.get('articulation', 0))}/100 |")
                lines.append('')

                if not vision_available:
                    lines.extend([
                        '*Note : Analyse visuelle non disponible (problème de compatibilité), basée sur l\'audio uniquement.*',
                        '',
                    ])

                # Show top emotions from model-based approach
                fused_emotions = model_based.get('fused_emotions') or {}
                if fused_emotions:
                    top_emotions = sorted(fused_emotions.items(), key=lambda x: x[1], reverse=True)[:3]
                    emotion_labels = ', '.join([f"{label} ({int(prob*100)}%)" for label, prob in top_emotions])
                    lines.extend([
                        '#### Émotions détectées (IA)',
                        '',
                        f"- Émotions dominantes : {emotion_labels}",
                        '',
                    ])

    lines.extend([
        '## Prochain exercice',
        '',
    ])
    focus_primary = (
        exercise_recommendation.get('focus_primary')
        or training_plan.get('focus_primary')
        or summary.get('priority_focus')
        or 'Progression generale'
    )
    lines.append(f"- Focus : {focus_primary}")

    if summary.get('exercice_titre'):
        lines.append(f"- Exercice : {summary.get('exercice_titre')}")

    exercise_summary = str(exercise_recommendation.get('summary') or '').strip()
    if exercise_summary:
        lines.append(f"- Objectif : {exercise_summary}")

    lines.append('')
    if summary.get('exercice_consigne'):
        consigne = str(summary.get('exercice_consigne') or '')
        steps = [step.strip() for step in consigne.split(' | ') if step.strip()]
        if not steps:
            steps = [step.strip() for step in consigne.split('\n') if step.strip()]
        for idx, step in enumerate(steps, start=1):
            lines.append(f"{idx}. {step}")
        lines.append('')
    elif exercise_recommendation.get('steps'):
        for idx, step in enumerate(exercise_recommendation.get('steps', []), start=1):
            lines.append(f"{idx}. {step}")
        lines.append('')
    elif training_plan.get('days'):
        for day in training_plan.get('days', []):
            lines.append(f"### {day.get('title', 'Bloc de pratique')}")
            for item in day.get('items', []):
                lines.append(f'- {item}')
            lines.append('')
    else:
        lines.append('- Reprenez votre discours en appliquant le conseil prioritaire.')
        lines.append('')

    lines.extend([
        '## Transcription automatique',
        '',
    ])
    if transcript:
        for segment in transcript:
            lines.append(
                f"- [{_safe_float(segment.get('start', 0)):.1f}s - {_safe_float(segment.get('end', 0)):.1f}s] {segment.get('text', '')}"
            )
    else:
        lines.append('- Aucune transcription disponible.')

    return '\n'.join(lines)


def _render_bullet_cards(items: List[str], empty_message: str) -> str:
    if not items:
        return f'<div class="note">{escape(empty_message)}</div>'
    return ''.join(f'<div class="bullet-card">{escape(item)}</div>' for item in items)


def _render_coaching_block(summary: Dict[str, Any], training_plan: Dict[str, Any], enrichment_status: str) -> str:
    if enrichment_status == 'pending':
        return '<div class="note">Le coaching enrichi est encore en préparation. Revenez dans quelques instants pour une formulation plus fine.</div>'

    if enrichment_status == 'failed':
        return '<div class="note">Le coaching enrichi n\'a pas pu être chargé cette fois-ci. Le plan de pratique reste disponible ci-dessous.</div>'

    ex_titre = summary.get('exercice_titre')
    ex_consigne = summary.get('exercice_consigne')

    if ex_titre and ex_consigne:
        return f"""
        <div class="mission-block">
            <h3 style="margin-top: 0; color: var(--primary-color);">Mission : {escape(ex_titre)}</h3>
            <div style="font-size: 1.1em; line-height: 1.6;">{escape(ex_consigne)}</div>
        </div>
        """
    
    # Fallback to legacy
    next_up = training_plan.get('focus_primary', 'Général')
    return f"""
    <div class="note">
        <strong>Focus recommandé :</strong> {escape(next_up)}<br/>
        Suivez les étapes du plan détaillé ci-dessous.
    </div>
    """

    priority_focus = str(summary.get('priority_focus', '') or training_plan.get('focus_primary', '') or 'Progression generale')
    encouragement = str(summary.get('encouragement') or '').strip()

    encouragement_block = (
        f'<div class="tip"><strong>Encouragement:</strong> {escape(encouragement)}</div>'
        if encouragement
        else ''
    )
    return f"""
        <article class=\"recommendation\">
          <div class=\"recommendation-top\">
            <h4>Focus prioritaire</h4>
            <span class=\"severity severity-info\">Coach IA</span>
          </div>
          <p>{escape(priority_focus)}</p>
          {encouragement_block}
        </article>
    """


def _render_transcript(transcript: List[Dict[str, Any]]) -> str:
    if not transcript:
        return '<div class="note">Aucune transcription disponible pour cette session.</div>'

    rows = []
    for segment in transcript:
        rows.append(
            f"""
            <div class=\"transcript-row\">
              <div class=\"time\">{_safe_float(segment.get('start', 0)):.1f}s - {_safe_float(segment.get('end', 0)):.1f}s</div>
              <div class=\"text\">{escape(str(segment.get('text', '')))}</div>
            </div>
            """
        )
    return ''.join(rows)


def build_report_print_html(report: Dict[str, Any]) -> str:
    session = report.get('session') or {}
    summary = report.get('summary') or {}
    scores = report.get('scores') or {}
    metrics = report.get('metrics') or {}
    strengths = report.get('strengths') or []
    weaknesses = report.get('weaknesses') or []
    training_plan = report.get('training_plan') or {}
    exercise_recommendation = report.get('exercise_recommendation') or {}
    transcript = report.get('transcript') or []
    enrichment_status = str(report.get('enrichment_status') or 'completed')
    eq_metrics = report.get('eq_metrics') or {}

    title = escape(str(session.get('title', 'Rapport SpeechCoach')))
    created_at = _format_date(str(session.get('created_at', '')))
    duration = _format_duration(session.get('duration_seconds', 0))
    language = _format_language(str(session.get('language', 'unknown')))
    encouragement = str(summary.get('encouragement') or '').strip()
    practice_title = "Plan d'action"
    practice_section = ''
    
    # Priority to AI Mission
    ex_titre = summary.get('exercice_titre')
    ex_consigne = summary.get('exercice_consigne')

    if ex_titre and ex_consigne:
        practice_section = f"""
        <article class=\"card\">
          <div class=\"section-title\"><h2>{escape(practice_title)} : {escape(ex_titre)}</h2></div>
          <div class=\"note\" style=\"font-size: 1.1em; line-height: 1.6; border-left: 4px solid var(--primary);\">
            {escape(ex_consigne)}
          </div>
        </article>
        """
    elif exercise_recommendation.get('should_display', True):
        steps = [escape(str(step)) for step in (exercise_recommendation.get('steps') or []) if str(step).strip()]
        exercise_summary = escape(str(exercise_recommendation.get('summary') or 'Reprenez votre discours en appliquant le conseil prioritaire.'))
        if steps:
            numbered_steps = ''.join(f'<li>{step}</li>' for step in steps)
            practice_body = f'<div class="note">{exercise_summary}</div><ol style="margin: 12px 0 0; padding-left: 20px;">{numbered_steps}</ol>'
        else:
            practice_body = f'<div class="note">{exercise_summary}</div>'

        practice_section = f"""
        <article class=\"card\">
          <div class=\"section-title\"><h2>{escape(practice_title)}</h2></div>
          {practice_body}
        </article>
        """

    html = f"""
<!DOCTYPE html>
<html lang=\"fr\">
  <head>
    <meta charset=\"utf-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
    <title>{title} - SpeechCoach</title>
    <style>
      :root {{
        --canvas: #f6f1e8;
        --surface: #ffffff;
        --ink: #15212b;
        --muted: #5e6b76;
        --border: #d9e1e5;
        --primary: #0e6b66;
        --primary-soft: #e6f3f1;
        --accent: #f2e2cd;
        --success: #2d7a55;
        --warning: #c8873c;
        --danger: #b6453d;
      }}
      * {{ box-sizing: border-box; }}
      body {{
        margin: 0;
        font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
        background: var(--canvas);
        color: var(--ink);
      }}
      .page {{
        max-width: 1080px;
        margin: 0 auto;
        padding: 40px 28px 60px;
      }}
      .hero {{
        display: grid;
        gap: 24px;
        grid-template-columns: 1.15fr 0.85fr;
        margin-bottom: 24px;
      }}
      .card {{
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 24px;
        padding: 24px;
        box-shadow: 0 18px 40px rgba(21, 33, 43, 0.06);
        break-inside: avoid;
      }}
      .score-card {{
        background: linear-gradient(135deg, #0e6b66, #0b5552);
        color: white;
      }}
      .eyebrow {{
        display: inline-block;
        font-size: 11px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--muted);
        margin-bottom: 12px;
      }}
      .score-card .eyebrow {{ color: rgba(255,255,255,0.7); }}
      h1, h2, h3, h4, p {{ margin: 0; }}
      h1 {{ font-size: 40px; line-height: 1.05; margin-bottom: 12px; }}
      h2 {{ font-size: 24px; margin-bottom: 12px; }}
      h3 {{ font-size: 18px; margin-bottom: 10px; }}
      h4 {{ font-size: 16px; margin-bottom: 8px; }}
      .lead {{ color: var(--muted); line-height: 1.7; font-size: 15px; }}
      .meta-grid, .score-grid, .two-col, .metrics-grid, .training-grid {{
        display: grid;
        gap: 16px;
      }}
      .meta-grid {{ grid-template-columns: repeat(3, 1fr); margin-top: 18px; }}
      .score-grid {{ grid-template-columns: repeat(2, 1fr); }}
      .two-col {{ grid-template-columns: repeat(2, 1fr); }}
      .metrics-grid {{ grid-template-columns: repeat(4, 1fr); }}
      .training-grid {{ grid-template-columns: repeat(2, 1fr); }}
      .stack {{ display: grid; gap: 24px; }}
      .meta-item, .score-item, .metric-item, .bullet-card, .note, .transcript-row, .context-row {{
        border: 1px solid var(--border);
        border-radius: 18px;
        background: #fbfcfc;
        padding: 16px;
      }}
      .meta-item strong, .metric-item strong, .context-row strong {{ display: block; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }}
      .meta-item span, .metric-item span, .context-row span {{ font-size: 15px; font-weight: 600; }}
      .big-score {{ font-size: 72px; line-height: 0.95; margin: 16px 0 6px; font-weight: 700; }}
      .verdict {{ display: inline-block; border-radius: 999px; background: rgba(255,255,255,0.14); padding: 8px 12px; font-size: 12px; margin-top: 14px; }}
      .summary-chip {{ border: 1px solid var(--border); border-radius: 18px; padding: 16px; background: var(--primary-soft); margin-top: 18px; }}
      .summary-chip strong {{ display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 0.14em; color: var(--muted); margin-bottom: 8px; }}
      .score-item .value {{ font-size: 28px; font-weight: 700; margin-top: 8px; }}
      .score-item .helper {{ color: var(--muted); font-size: 13px; line-height: 1.5; margin-top: 6px; }}
      .section-title {{ display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 14px; }}
      .badge {{ display: inline-block; border-radius: 999px; padding: 6px 10px; font-size: 11px; border: 1px solid var(--border); background: #fff; color: var(--ink); }}
      .recommendation {{ border: 1px solid var(--border); border-radius: 18px; padding: 18px; background: #fbfcfc; margin-bottom: 14px; }}
      .recommendation-top {{ display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; }}
      .recommendation p {{ color: var(--muted); line-height: 1.7; font-size: 14px; }}
      .severity {{ border-radius: 999px; padding: 6px 10px; font-size: 11px; border: 1px solid var(--border); }}
      .severity-critical {{ background: rgba(182, 69, 61, 0.10); color: var(--danger); }}
      .severity-warning {{ background: rgba(200, 135, 60, 0.12); color: #8a5c1f; }}
      .severity-info {{ background: rgba(14, 107, 102, 0.10); color: var(--primary); }}
      .tip {{ margin-top: 14px; border-radius: 16px; background: #eef3f4; padding: 14px; font-size: 14px; line-height: 1.7; }}
      .training-day {{ border: 1px solid var(--border); border-radius: 18px; padding: 18px; background: #fbfcfc; }}
      .training-day ul {{ margin: 12px 0 0; padding-left: 18px; color: var(--muted); line-height: 1.7; }}
      .transcript-row {{ display: grid; gap: 10px; grid-template-columns: 150px 1fr; }}
      .time {{ font-family: 'Consolas', 'Courier New', monospace; font-size: 12px; color: var(--muted); }}
      .text {{ font-size: 14px; line-height: 1.7; }}
      .footer-note {{ text-align: center; color: var(--muted); font-size: 12px; margin-top: 24px; }}
      .encouragement {{ margin-top: 16px; border-radius: 16px; background: #eef7f6; padding: 14px 16px; font-size: 14px; line-height: 1.7; }}
      @page {{ size: A4; margin: 18mm; }}
      @media print {{
        body {{ background: white; }}
        .page {{ max-width: none; padding: 0; }}
        .card {{ box-shadow: none; }}
      }}
    </style>
  </head>
  <body>
    <main class=\"page\">
      <section class=\"hero\">
        <article class=\"card\">
          <div class=\"eyebrow\">Rapport SpeechCoach</div>
          <h1>{title}</h1>
          <p class=\"lead\">{escape(str(summary.get('narrative', '') or 'Resume indisponible.'))}</p>
          <div class=\"meta-grid\">
            <div class=\"meta-item\"><strong>Date</strong><span>{escape(created_at)}</span></div>
            <div class=\"meta-item\"><strong>Duree</strong><span>{escape(duration)}</span></div>
            <div class=\"meta-item\"><strong>Langue</strong><span>{escape(language)}</span></div>
          </div>
          <div class=\"summary-chip\">
            <strong>Priorite de travail</strong>
            <span>{escape(str(summary.get('priority_focus', 'Progression generale')))}</span>
          </div>
          {f'<div class="encouragement">{escape(encouragement)}</div>' if encouragement else ''}
        </article>

        <article class=\"card score-card\">
          <div class=\"eyebrow\">Score global</div>
          <div class=\"big-score\">{summary.get('overall_score', scores.get('overall', 0))}</div>
          <div>/100</div>
          <div class=\"verdict\">{escape(_score_headline(_safe_int(summary.get('overall_score', scores.get('overall', 0)))))}</div>
          <div class=\"meta-grid\" style=\"margin-top: 24px;\">
            <div class=\"meta-item\"><strong>Resolution</strong><span>{escape(_format_resolution(session.get('resolution', [0, 0])))}</span></div>
            <div class=\"meta-item\"><strong>FPS</strong><span>{escape(_format_fps(session.get('fps', 0)))}</span></div>
            <div class=\"meta-item\"><strong>Session ID</strong><span>{escape(str(session.get('id', ''))[:8])}</span></div>
          </div>
        </article>
      </section>

      <section class=\"stack\">
        <article class=\"card\">
          <div class=\"section-title\">
            <h2>Vos reperes essentiels</h2>
            <span class=\"badge\">Lecture rapide avant les details</span>
          </div>
          <div class=\"summary-chip\" style=\"margin-bottom: 18px;\">
            <strong>Evaluation generale</strong>
            <span>{summary.get('overall_score', scores.get('overall', 0))}/100</span>
          </div>
          <div class=\"score-grid\">
            <div class=\"score-item\"><strong>Voix et rythme</strong><div class=\"value\">{_format_axis_score(scores.get('voice', 0))}</div><div class=\"helper\">Debit, pauses et fluidite de parole</div></div>
            <div class=\"score-item\"><strong>Gestes et posture</strong><div class=\"value\">{_format_axis_score(scores.get('body_language', 0))}</div><div class=\"helper\">Aisance corporelle et visibilite des mains</div></div>
            <div class=\"score-item\"><strong>Regard camera</strong><div class=\"value\">{_format_axis_score(scores.get('presence', 0))}</div><div class=\"helper\">Connexion visuelle et stabilite dans le cadre</div></div>
            <div class=\"score-item\"><strong>Qualite video</strong><div class=\"value\">{_format_axis_score(scores.get('scene', 0))}</div><div class=\"helper\">Nettete, lumiere et lisibilite generale</div></div>
          </div>
        </article>

        <div class=\"two-col\">
          <article class=\"card\">
            <div class=\"section-title\"><h2>Ce qui fonctionne deja bien</h2></div>
            {_render_bullet_cards(strengths, 'Aucun point fort detaille n a ete fourni.')}
          </article>
          <article class=\"card\">
            <div class=\"section-title\"><h2>Ce que je vous conseille de corriger ensuite</h2></div>
            {_render_bullet_cards(weaknesses, 'Aucun point de vigilance detaille n a ete fourni.')}
          </article>
        </div>

        <article class=\"card\">
          <div class=\"section-title\"><h2>Details techniques</h2></div>
          <div class=\"metrics-grid\">
            <div class=\"metric-item\"><strong>Rythme de parole</strong><span>{metrics.get('wpm', 0)} mots/min</span></div>
            <div class=\"metric-item\"><strong>Hésitations / Répétitions</strong><span>{metrics.get('filler_count', 0)} / {metrics.get('stutter_count', 0)}</span></div>
            <div class=\"metric-item\"><strong>Éclairage</strong><span>{_format_lighting_label(metrics.get('brightness', 0))}</span></div>
            <div class=\"metric-item\"><strong>Netteté de l'image</strong><span>{_format_sharpness_label(metrics.get('blur', 0))}</span></div>
            <div class=\"metric-item\"><strong>Regard caméra</strong><span>{metrics.get('eye_contact_ratio', 0)}% ({_format_eye_contact_label(metrics.get('eye_contact_ratio', 0))})</span></div>
            <div class=\"metric-item\"><strong>Intensité gestuelle</strong><span>{metrics.get('hands_activity_score', 0)}/10 ({metrics.get('hands_intensity_label', 'N/A')})</span></div>
          </div>
        </article>"""

    # Add EQ metrics section if available
    if eq_metrics and isinstance(eq_metrics, dict):
        eq_scores = eq_metrics.get('scores') or {}
        eq_objectives = eq_metrics.get('objectives') or {}
        eq_version = eq_metrics.get('version', 'v2')
        eq_reliability = eq_metrics.get('reliability') or {}
        eq_reliability_pct = int(round(_safe_float(eq_reliability.get('overall', 0)) * 100))
        eq_should_interpret = eq_metrics.get('interpretation', {}).get('should_interpret', eq_reliability_pct >= 55)
        emotion_scores = eq_metrics.get('emotion_scores') or {}

        stress_score = _safe_int(eq_scores.get('stress', 0))
        stress_aspects = ', '.join(eq_objectives.get('stress', {}).get('aspects', []))
        confidence_score = _safe_int(eq_scores.get('confidence', 0))
        confidence_aspects = ', '.join(eq_objectives.get('confidence', {}).get('aspects', []))
        articulation_score = _safe_int(eq_scores.get('articulation', 0))
        articulation_aspects = ', '.join(eq_objectives.get('articulation', {}).get('aspects', []))

        reliability_warning = ''
        if not eq_should_interpret:
            reliability_warning = f'<div class="note" style="margin-bottom: 12px; border-color: #c8873c; background: rgba(200, 135, 60, 0.08);"><strong>Note :</strong> Signal EQ encore fragile. Interpretation prudente recommandee (fiabilite {eq_reliability_pct}%).</div>'

        html += f"""
        <article class=\"card\">
          <div class=\"section-title\">
            <h2>Indicateurs emotionnels</h2>
            <span class=\"badge\">{escape(eq_version)}</span>
          </div>
          <div class="note" style="margin-bottom: 12px; font-size: 12px; color: var(--muted);">Indicateurs comportementaux, pas émotions réelles</div>
          {reliability_warning}
          <div class="stack" style="gap: 12px;">
            <div class="context-row">
              <strong>Stress</strong>
              <span>{stress_score}/100</span>
            </div>
            <div class="note" style="margin-top: 8px; font-size: 13px;"><strong>Facteurs :</strong> {escape(stress_aspects)}</div>
            <div class="context-row">
              <strong>Confiance</strong>
              <span>{confidence_score}/100</span>
            </div>
            <div class="note" style="margin-top: 8px; font-size: 13px;"><strong>Facteurs :</strong> {escape(confidence_aspects)}</div>
            <div class="context-row">
              <strong>Articulation</strong>
              <span>{articulation_score}/100</span>
            </div>
            <div class="note" style="margin-top: 8px; font-size: 13px;"><strong>Facteurs :</strong> {escape(articulation_aspects)}</div>
          </div>
        </article>"""

        # Add comparison section if emotion_scores available
        if emotion_scores and isinstance(emotion_scores, dict):
            rule_based = emotion_scores.get('rule_based') or {}
            model_based = emotion_scores.get('model_based') or {}

            rule_eq = rule_based.get('eq_scores') or {}
            model_eq = model_based.get('eq_scores') or {}
            vision_available = model_based.get('vision_available', True)

            if rule_eq and model_eq:
                method_label = "IA (Wav2Vec2)" if not vision_available else "IA (Wav2Vec2/HSEmotion)"
                vision_note = '<div class="note" style="margin-bottom: 12px; border-color: #c8873c; background: rgba(200, 135, 60, 0.08);"><strong>Note :</strong> Analyse visuelle non disponible (problème de compatibilité), basée sur l\'audio uniquement.</div>' if not vision_available else ''

                html += f"""
        <article class=\"card\">
          <div class=\"section-title\">
            <h2>Comparaison des méthodes d'analyse</h2>
            <span class=\"badge\">Dual-Track</span>
          </div>
          <div class="note" style="margin-bottom: 12px; font-size: 12px; color: var(--muted);">Comparaison entre l'analyse par règles (math rigide) et l'analyse par IA (intuition)</div>
          {vision_note}
          <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
            <thead>
              <tr style="border-bottom: 2px solid var(--border);">
                <th style="text-align: left; padding: 8px; font-size: 13px;">Méthode</th>
                <th style="text-align: center; padding: 8px; font-size: 13px;">Stress</th>
                <th style="text-align: center; padding: 8px; font-size: 13px;">Confiance</th>
                <th style="text-align: center; padding: 8px; font-size: 13px;">Articulation</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 8px; font-size: 13px; font-weight: 500;">Règles (Librosa/MediaPipe)</td>
                <td style="text-align: center; padding: 8px; font-size: 13px;">{_safe_int(rule_eq.get('stress', 0))}/100</td>
                <td style="text-align: center; padding: 8px; font-size: 13px;">{_safe_int(rule_eq.get('confidence', 0))}/100</td>
                <td style="text-align: center; padding: 8px; font-size: 13px;">{_safe_int(rule_eq.get('articulation', 0))}/100</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-size: 13px; font-weight: 500;">{escape(method_label)}</td>
                <td style="text-align: center; padding: 8px; font-size: 13px;">{_safe_int(model_eq.get('stress', 0))}/100</td>
                <td style="text-align: center; padding: 8px; font-size: 13px;">{_safe_int(model_eq.get('confidence', 0))}/100</td>
                <td style="text-align: center; padding: 8px; font-size: 13px;">{_safe_int(model_eq.get('articulation', 0))}/100</td>
              </tr>
            </tbody>
          </table>"""

                # Show top emotions from model-based approach
                fused_emotions = model_based.get('fused_emotions') or {}
                if fused_emotions:
                    top_emotions = sorted(fused_emotions.items(), key=lambda x: x[1], reverse=True)[:3]
                    emotion_badges = ' '.join([f'<span class="badge" style="background: var(--primary-soft);">{label} ({int(prob*100)}%)</span>' for label, prob in top_emotions])
                    html += f"""
          <div style="margin-top: 16px;">
            <div style="font-size: 13px; font-weight: 500; margin-bottom: 8px;">Émotions détectées (IA) :</div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">{emotion_badges}</div>
          </div>"""

                html += """
        </article>"""

    html += f"""
        <article class=\"card\">
          <div class=\"section-title\">
            <h2>Votre prochaine action</h2>
            <span class=\"badge\">Focus principal: {escape(str(training_plan.get('focus_primary', '') or 'General'))}</span>
          </div>
          {_render_coaching_block(summary, training_plan, enrichment_status)}
        </article>

        {practice_section}

        <article class=\"card\">
          <div class=\"section-title\"><h2>Transcription automatique</h2></div>
          {_render_transcript(transcript)}
        </article>
      </section>

      <div class=\"footer-note\">SpeechCoach - rapport exportable pour partage academique ou professionnel</div>
    </main>
  </body>
</html>
    """

    return html
