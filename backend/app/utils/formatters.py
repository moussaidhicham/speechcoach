"""
Shared formatting functions used across multiple modules.
Extracted from report_formatter.py and report_pdf.py to eliminate duplication.
"""
from typing import Any, Tuple


def _safe_float(value: Any) -> float:
    """Safely convert any value to float, defaulting to 0.0."""
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _safe_int(value: Any) -> int:
    """Safely convert any value to int, defaulting to 0."""
    return int(round(_safe_float(value)))


def _normalize_resolution(value: Any) -> Tuple[int, int]:
    """Normalize resolution to a tuple of (width, height)."""
    if isinstance(value, (list, tuple)) and len(value) == 2:
        return (_safe_int(value[0]), _safe_int(value[1]))
    return (0, 0)


def _format_resolution(value: Any) -> str:
    """Format resolution as 'WIDTHxHEIGHT' string."""
    width, height = _normalize_resolution(value)
    if width <= 0 or height <= 0:
        return 'Non renseignee'
    return f'{width}x{height}'


def _format_fps(value: Any) -> str:
    """Format FPS value, removing trailing zeros."""
    fps = _safe_float(value)
    if fps <= 1 or fps > 240:
        return 'Non renseigne'
    return str(round(fps, 2)).rstrip('0').rstrip('.')


def _format_sharpness_label(value: Any) -> str:
    """Format sharpness/blurriness label."""
    blur = _safe_int(value)
    if blur < 20:
        return 'Floue (Inexploitable)'
    if blur < 40:
        return 'Passable (Limite)'
    return 'Nette (Optimale)'


def _format_axis_score(value: Any) -> str:
    """Format axis score as 'X.X/10'."""
    return f"{_safe_float(value):.1f}/10"


def _format_intensity_label(value: Any) -> str:
    """Format intensity/motion label."""
    score = _safe_float(value)
    if score >= 7.5:
        return 'Agitée'
    if score >= 3.5:
        return 'Naturelle'
    return 'Statique'


def _format_pace_label(wpm: Any) -> str:
    """Format words per minute label."""
    wpm_int = _safe_int(wpm)
    if wpm_int > 180:
        return 'Trop rapide'
    if wpm_int > 150:
        return 'Rapide'
    if wpm_int >= 120:
        return 'Idéal'
    if wpm_int > 0:
        return 'Lent'
    return 'N/A'


def _format_eye_contact_label(value: Any) -> str:
    """Format eye contact ratio label."""
    ratio = _safe_int(value)
    if ratio >= 70:
        return 'Bon'
    if ratio >= 40:
        return 'Moyen'
    return 'Faible'


def _format_hands_label(value: Any) -> str:
    """Format hands visibility ratio label."""
    ratio = _safe_int(value)
    if ratio >= 60:
        return 'Visibles'
    if ratio >= 30:
        return 'Parfois visibles'
    return 'Rarement visibles'
