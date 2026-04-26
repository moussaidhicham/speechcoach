"""
Language-related constants and labels.
"""

LANGUAGE_LABELS = {
    'fr': 'Francais',
    'en': 'English',
    'ar': 'Arabic',
    'unknown': 'Non renseignee',
}

def get_language_label(code: str) -> str:
    """Get the display label for a language code."""
    normalized = str(code or 'unknown').strip().lower()
    return LANGUAGE_LABELS.get(normalized, normalized.upper())
