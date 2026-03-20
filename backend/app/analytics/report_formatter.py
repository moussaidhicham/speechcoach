from __future__ import annotations

from datetime import datetime
from html import escape
import re
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
    if fps <= 1:
        return 'Non renseigne'
    return str(round(fps, 2)).rstrip('0').rstrip('.')


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


def build_report_response(session: VideoSession, analysis: AnalysisResult) -> Dict[str, Any]:
    metrics = analysis.metrics_json or {}
    scores = metrics.get('scores') or {}
    audio = metrics.get('audio_metrics') or {}
    vision = metrics.get('vision_metrics') or {}
    metadata = metrics.get('metadata') or {}
    llm_coaching = metrics.get('llm_coaching') or {}

    strengths = [str(item).strip() for item in (metrics.get('strengths') or []) if str(item).strip()]
    weaknesses = [str(item).strip() for item in (metrics.get('weaknesses') or []) if str(item).strip()]
    recommendations = _normalize_recommendations(metrics.get('recommendations') or [])
    transcript = _normalize_transcript(metrics.get('transcript') or [])
    training_plan_markdown = str(metrics.get('training_plan') or '')
    training_plan = _parse_training_plan(training_plan_markdown)

    duration_seconds = _safe_float(session.duration_seconds)
    if duration_seconds <= 0:
        duration_seconds = _safe_float(metadata.get('duration_seconds')) or _safe_float(audio.get('total_duration'))

    fps = _safe_float(metadata.get('fps'))
    resolution = _normalize_resolution(metadata.get('resolution'))
    language = str(metadata.get('detected_language') or 'unknown').strip() or 'unknown'

    overall_score = int(analysis.overall_score)
    summary_narrative = str(llm_coaching.get('bilan_global') or '').strip() or _fallback_narrative(strengths, weaknesses)
    priority_focus = str(llm_coaching.get('point_prioritaire') or '').strip()
    if not priority_focus:
        if recommendations:
            priority_focus = recommendations[0]['category']
        elif weaknesses:
            priority_focus = weaknesses[0]
        else:
            priority_focus = 'Progression generale'

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
        },
        'summary': {
            'overall_score': overall_score,
            'headline': _score_headline(overall_score),
            'narrative': summary_narrative,
            'priority_focus': priority_focus,
            'encouragement': str(llm_coaching.get('encouragement') or '').strip() or None,
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
            'pause_duration_total': round(_safe_float(audio.get('pause_duration_total')), 2),
            'face_presence_ratio': _safe_int(_safe_float(vision.get('face_presence_ratio')) * 100),
            'eye_contact_ratio': _safe_int(_safe_float(vision.get('eye_contact_ratio')) * 100),
            'hands_visibility_ratio': _safe_int(_safe_float(vision.get('hands_visibility_ratio')) * 100),
            'hands_activity_score': round(_safe_float(vision.get('hands_activity_score')), 2),
            'brightness': _safe_int(vision.get('avg_brightness')),
            'blur': _safe_int(vision.get('avg_blur')),
        },
        'strengths': strengths[:4],
        'weaknesses': weaknesses[:4],
        'recommendations': recommendations,
        'training_plan': training_plan,
        'training_plan_markdown': training_plan_markdown,
        'transcript': transcript,
    }


def build_report_markdown(report: Dict[str, Any]) -> str:
    session = report.get('session') or {}
    summary = report.get('summary') or {}
    scores = report.get('scores') or {}
    metrics = report.get('metrics') or {}
    strengths = report.get('strengths') or []
    weaknesses = report.get('weaknesses') or []
    recommendations = report.get('recommendations') or []
    training_plan = report.get('training_plan') or {}
    transcript = report.get('transcript') or []

    lines: List[str] = [
        '# Rapport SpeechCoach',
        '',
        '## Session',
        f"- Titre : {session.get('title', 'Rapport')}",
        f"- Date : {_format_date(str(session.get('created_at', '')))}",
        f"- Duree : {_format_duration(session.get('duration_seconds', 0))}",
        f"- Langue : {_format_language(str(session.get('language', 'unknown')))}",
        '',
        '## Resume executif',
        f"- Score global : {summary.get('overall_score', scores.get('overall', 0))}/100",
        f"- Positionnement : {summary.get('headline', '')}",
        f"- Priorite : {summary.get('priority_focus', '')}",
        '',
        str(summary.get('narrative', '')).strip() or 'Resume indisponible.',
        '',
    ]

    encouragement = str(summary.get('encouragement') or '').strip()
    if encouragement:
        lines.extend([f'> {encouragement}', ''])

    lines.extend([
        '## Scores',
        '',
        f"- Voix : {scores.get('voice', 0)}/100",
        f"- Langage corporel : {scores.get('body_language', 0)}/100",
        f"- Presence : {scores.get('presence', 0)}/100",
        f"- Scene : {scores.get('scene', 0)}/100",
        f"- Regard : {scores.get('eye_contact', 0)}/100",
        '',
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

    lines.extend(['', '## Recommandations', ''])
    if recommendations:
        for item in recommendations:
            lines.extend(
                [
                    f"### {item.get('category', 'General')}",
                    f"- Severite : {item.get('severity', 'Info')}",
                    f"- Diagnostic : {item.get('message', '')}",
                    f"- Action : {item.get('tip', '')}",
                    '',
                ]
            )
    else:
        lines.extend(['- Continuez vos repetitions avec le meme niveau d exigence.', ''])

    lines.extend([
        '## Plan de pratique',
        '',
        f"- Focus principal : {training_plan.get('focus_primary', '') or 'Progression generale'}",
        f"- Focus secondaire : {training_plan.get('focus_secondary', '') or 'Consolidation'}",
        '',
    ])

    for day in training_plan.get('days', []):
        lines.append(f"### {day.get('title', 'Bloc de pratique')}")
        for item in day.get('items', []):
            lines.append(f'- {item}')
        lines.append('')

    lines.extend([
        '## Metriques',
        '',
        f"- Debit vocal : {metrics.get('wpm', 0)} WPM",
        f"- Pauses : {metrics.get('pause_count', 0)}",
        f"- Fillers : {metrics.get('filler_count', 0)}",
        f"- Presence visage : {metrics.get('face_presence_ratio', 0)}%",
        f"- Regard camera : {metrics.get('eye_contact_ratio', 0)}%",
        f"- Visibilite des mains : {metrics.get('hands_visibility_ratio', 0)}%",
        '',
        '## Transcription',
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


def _render_recommendations(items: List[Dict[str, str]]) -> str:
    if not items:
        return '<div class="note">Aucune recommandation detaillee n a ete fournie pour cette session.</div>'

    blocks = []
    for item in items:
        severity = escape(item.get('severity', 'Info'))
        blocks.append(
            f"""
            <article class=\"recommendation\">
              <div class=\"recommendation-top\">
                <h4>{escape(item.get('category', 'General'))}</h4>
                <span class=\"severity severity-{severity.lower()}\">{severity}</span>
              </div>
              <p>{escape(item.get('message', ''))}</p>
              <div class=\"tip\"><strong>Action terrain:</strong> {escape(item.get('tip', '') or 'Continuez a pratiquer avec la meme exigence.')}</div>
            </article>
            """
        )
    return ''.join(blocks)


def _render_training_days(days: List[Dict[str, Any]]) -> str:
    if not days:
        return '<div class="note">Le plan detaille n a pas encore ete structure pour cette session.</div>'

    blocks = []
    for day in days:
        items = ''.join(f'<li>{escape(str(item))}</li>' for item in day.get('items', [])) or '<li>Pas de detail supplementaire pour ce bloc.</li>'
        blocks.append(
            f"""
            <article class=\"training-day\">
              <h4>{escape(str(day.get('title', 'Bloc de pratique')))}</h4>
              <ul>{items}</ul>
            </article>
            """
        )
    return ''.join(blocks)


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
    recommendations = report.get('recommendations') or []
    training_plan = report.get('training_plan') or {}
    transcript = report.get('transcript') or []

    title = escape(str(session.get('title', 'Rapport SpeechCoach')))
    created_at = _format_date(str(session.get('created_at', '')))
    duration = _format_duration(session.get('duration_seconds', 0))
    language = _format_language(str(session.get('language', 'unknown')))
    encouragement = str(summary.get('encouragement') or '').strip()

    return f"""
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
            <h2>Scores detaillees</h2>
            <span class=\"badge\">Lecture rapide des piliers de la note</span>
          </div>
          <div class=\"score-grid\">
            <div class=\"score-item\"><strong>Voix</strong><div class=\"value\">{scores.get('voice', 0)}</div><div class=\"helper\">Rythme, fluidite et projection</div></div>
            <div class=\"score-item\"><strong>Corps</strong><div class=\"value\">{scores.get('body_language', 0)}</div><div class=\"helper\">Posture et gestuelle</div></div>
            <div class=\"score-item\"><strong>Presence</strong><div class=\"value\">{scores.get('presence', 0)}</div><div class=\"helper\">Occupation du cadre</div></div>
            <div class=\"score-item\"><strong>Regard</strong><div class=\"value\">{scores.get('eye_contact', 0)}</div><div class=\"helper\">Connexion camera</div></div>
          </div>
        </article>

        <div class=\"two-col\">
          <article class=\"card\">
            <div class=\"section-title\"><h2>Points forts</h2></div>
            {_render_bullet_cards(strengths, 'Aucun point fort detaille n a ete fourni.')}
          </article>
          <article class=\"card\">
            <div class=\"section-title\"><h2>Axes de progression</h2></div>
            {_render_bullet_cards(weaknesses, 'Aucun point de vigilance detaille n a ete fourni.')}
          </article>
        </div>

        <article class=\"card\">
          <div class=\"section-title\"><h2>Indicateurs et preuves</h2></div>
          <div class=\"metrics-grid\">
            <div class=\"metric-item\"><strong>Debit vocal</strong><span>{metrics.get('wpm', 0)} WPM</span></div>
            <div class=\"metric-item\"><strong>Pauses</strong><span>{metrics.get('pause_count', 0)}</span></div>
            <div class=\"metric-item\"><strong>Fillers</strong><span>{metrics.get('filler_count', 0)}</span></div>
            <div class=\"metric-item\"><strong>Pause cumulee</strong><span>{metrics.get('pause_duration_total', 0)}s</span></div>
            <div class=\"metric-item\"><strong>Presence visage</strong><span>{metrics.get('face_presence_ratio', 0)}%</span></div>
            <div class=\"metric-item\"><strong>Regard camera</strong><span>{metrics.get('eye_contact_ratio', 0)}%</span></div>
            <div class=\"metric-item\"><strong>Visibilite des mains</strong><span>{metrics.get('hands_visibility_ratio', 0)}%</span></div>
            <div class=\"metric-item\"><strong>Qualite de scene</strong><span>{scores.get('scene', 0)}/100</span></div>
          </div>
        </article>

        <article class=\"card\">
          <div class=\"section-title\">
            <h2>Recommandations prioritaires</h2>
            <span class=\"badge\">Focus principal: {escape(str(training_plan.get('focus_primary', '') or 'General'))}</span>
          </div>
          {_render_recommendations(recommendations)}
        </article>

        <article class=\"card\">
          <div class=\"section-title\"><h2>Plan de pratique</h2></div>
          <div class=\"training-grid\">{_render_training_days(training_plan.get('days', []))}</div>
        </article>

        <article class=\"card\">
          <div class=\"section-title\"><h2>Transcription</h2></div>
          {_render_transcript(transcript)}
        </article>
      </section>

      <div class=\"footer-note\">SpeechCoach - rapport exportable pour partage academique ou professionnel</div>
    </main>
  </body>
</html>
    """
