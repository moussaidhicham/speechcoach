import logging
import re
from typing import List, Tuple

import librosa
import numpy as np

from app.analytics.engine.metrics.schema import AudioMetrics, TranscriptionSegment

logger = logging.getLogger(__name__)

# Common fillers in EN, FR, and AR (MSA + Darija)
# NOTE: Arabic does not support \b word boundaries in Python regex.
# We use (?<!\w) / (?!\w) which are Unicode-aware alternatives.
_AR_S = r"(?<!\w)"
_AR_E = r"(?!\w)"


def _ar(word: str) -> str:
    """Wrap an Arabic word pattern with Unicode-safe boundaries."""
    return _AR_S + word + _AR_E


ARABIC_LEXICAL_FILLERS = [
    _ar(r"يعني"),
    _ar(r"[آا]ه"),
    _ar(r"[إا]ي"),
    _ar(r"والله"),
    _ar(r"[اإ]ذن"),
]

ARABIC_NASAL_FILLERS = [
    _ar(r"هم+"),
    _ar(r"مم+"),
    _ar(r"ا?م+"),
]

ENGLISH_LEXICAL_FILLERS = [
    r"\bum\b",
    r"\buh\b",
    r"\ber\b",
    r"\bah\b",
]

ENGLISH_HUM_FILLERS = [
    r"\bhmm+\b",
    r"\bmm+\b",
    r"\bmmm+\b",
]

FRENCH_LEXICAL_FILLERS = [
    r"\beuh\b",
    r"\bah\b",
    r"\bben\b",
]

FRENCH_HUM_FILLERS = [
    r"\bhum+\b",
    r"\bhmm+\b",
    r"\bmm+\b",
    r"\bmmm+\b",
]

FILLERS = {
    "en": ENGLISH_LEXICAL_FILLERS + ENGLISH_HUM_FILLERS,
    "fr": FRENCH_LEXICAL_FILLERS + FRENCH_HUM_FILLERS,
    "ar": ARABIC_LEXICAL_FILLERS + ARABIC_NASAL_FILLERS,
}


RAW_FILLERS = {
    "euh",
    "euhm",
    "um",
    "uh",
    "er",
    "ah",
    "mmm",
    "hmm",
    "يعني",
    "آه",
    "إي",
    "همم",
    "هممم",
    "مم",
    "ام",
    "والله",
}


WHITELIST_DOUBLES = {
    "nous",
    "vous",
    "on",
    "the",
    "he",
    "she",
    "في",
    "من",
    "إلى",
    "على",
    "هو",
    "هي",
}


def detect_stutters(text: str, language: str = "en") -> int:
    """Detects simple repetitions and restart-like patterns."""
    text = text.lower()
    clean_text = re.sub(r"[^\w\s]", " ", text)
    words = clean_text.split()
    if len(words) < 2:
        return 0

    count = 0
    i = 0
    while i < len(words):
        if i + 4 < len(words) and words[i + 2] in RAW_FILLERS and words[i : i + 2] == words[i + 3 : i + 5]:
            count += 1
            i += 3
            continue
        if i + 3 < len(words) and words[i : i + 2] == words[i + 2 : i + 4]:
            count += 1
            i += 2
            continue
        if (
            i + 2 < len(words)
            and words[i] == words[i + 2]
            and words[i + 1] in RAW_FILLERS
            and words[i] not in WHITELIST_DOUBLES
        ):
            count += 1
            i += 2
            continue
        if i + 1 < len(words) and words[i] == words[i + 1] and words[i] not in WHITELIST_DOUBLES:
            count += 1
            i += 1
            continue
        i += 1
    return count


def _count_pattern_matches(text: str, patterns: List[str]) -> int:
    count = 0
    for pattern in patterns:
        try:
            count += len(re.findall(pattern, text))
        except re.error:
            logger.warning("Invalid filler regex skipped: %s", pattern)
    return count


def _estimate_hum_like_fillers(y: np.ndarray, sr: int, non_silent_intervals: np.ndarray) -> int:
    """Light acoustic proxy for short hum-like fillers dropped by ASR."""
    if y.size == 0 or len(non_silent_intervals) == 0:
        return 0

    global_rms = float(np.sqrt(np.mean(np.square(y)))) if y.size else 0.0
    min_rms = max(0.008, global_rms * 0.2)
    count = 0

    for start, end in non_silent_intervals:
        duration = (end - start) / sr
        if duration < 0.12 or duration > 0.9:
            continue

        segment = y[start:end]
        if segment.size < 512:
            continue

        rms = float(np.mean(librosa.feature.rms(y=segment, frame_length=512, hop_length=128)))
        if rms < min_rms:
            continue

        zcr = float(np.mean(librosa.feature.zero_crossing_rate(segment, frame_length=512, hop_length=128)))
        centroid = float(np.mean(librosa.feature.spectral_centroid(y=segment, sr=sr, n_fft=1024, hop_length=128)))
        rolloff = float(
            np.mean(librosa.feature.spectral_rolloff(y=segment, sr=sr, roll_percent=0.85, n_fft=1024, hop_length=128))
        )

        if zcr > 0.08:
            continue
        if centroid > 1400:
            continue
        if rolloff > 2200:
            continue

        count += 1

    return count


def analyze_audio_file(
    audio_path: str,
    transcript: List[TranscriptionSegment],
    language: str = "en",
) -> Tuple[AudioMetrics, List[float]]:
    """Computes audio metrics from the WAV file and the text transcript."""
    if not transcript:
        logger.warning("No transcript provided for audio analysis.")
        return AudioMetrics(), [0.0]

    full_text = " ".join(seg.text for seg in transcript)
    word_count = len(full_text.split())

    if transcript:
        speech_duration_min = (transcript[-1].end - transcript[0].start) / 60.0
    else:
        speech_duration_min = 1.0
    speech_duration_min = max(0.1, speech_duration_min)

    wpm = word_count / speech_duration_min
    normalized_text = full_text.lower()

    lexical_filler_count = 0
    hum_filler_count = 0
    if language == "ar":
        lexical_filler_count = _count_pattern_matches(normalized_text, ARABIC_LEXICAL_FILLERS)
        hum_filler_count = _count_pattern_matches(normalized_text, ARABIC_NASAL_FILLERS)
    elif language == "fr":
        lexical_filler_count = _count_pattern_matches(normalized_text, FRENCH_LEXICAL_FILLERS)
        hum_filler_count = _count_pattern_matches(normalized_text, FRENCH_HUM_FILLERS)
    elif language == "en":
        lexical_filler_count = _count_pattern_matches(normalized_text, ENGLISH_LEXICAL_FILLERS)
        hum_filler_count = _count_pattern_matches(normalized_text, ENGLISH_HUM_FILLERS)
    else:
        lexical_filler_count = _count_pattern_matches(normalized_text, FILLERS.get(language, FILLERS["en"]))

    stutter_count = detect_stutters(full_text, language=language)

    try:
        y, sr = librosa.load(audio_path, sr=16000)
    except Exception as e:
        logger.error(f"Could not calculate signal metrics (librosa error): {e}")
        fallback_filler_count = lexical_filler_count + hum_filler_count
        return AudioMetrics(wpm=wpm, filler_count=fallback_filler_count, stutter_count=stutter_count), [0.0]

    non_silent_intervals = librosa.effects.split(y, top_db=30, frame_length=2048, hop_length=512)

    acoustic_hum_count = 0
    if language in {"ar", "fr", "en"}:
        acoustic_hum_count = _estimate_hum_like_fillers(y, sr, non_silent_intervals)

    filler_count = lexical_filler_count + max(hum_filler_count, acoustic_hum_count)

    total_duration = librosa.get_duration(y=y, sr=sr)
    non_silent_duration = sum((end - start) for start, end in non_silent_intervals) / sr
    pause_duration_total = total_duration - non_silent_duration

    pause_count = 0
    if len(non_silent_intervals) > 1:
        for i in range(len(non_silent_intervals) - 1):
            end_current = non_silent_intervals[i][1]
            start_next = non_silent_intervals[i + 1][0]
            gap_sec = (start_next - end_current) / sr
            if gap_sec > 0.5:
                pause_count += 1

    if len(y) > 0:
        rms_data = librosa.feature.rms(y=y, frame_length=2048, hop_length=512)
        if rms_data.size > 0:
            rms = rms_data[0]
            energy_curve = [float(v) for v in rms[::3]]
        else:
            energy_curve = [0.0]
    else:
        energy_curve = [0.0]

    logger.info(
        "Audio Analysis - WPM: %.1f, Pauses >0.5s: %s, Fillers: %s (lexical=%s, hum_text=%s, hum_audio=%s), Stutters: %s",
        wpm,
        pause_count,
        filler_count,
        lexical_filler_count,
        hum_filler_count,
        acoustic_hum_count,
        stutter_count,
    )

    metrics = AudioMetrics(
        wpm=round(wpm, 1),
        pause_count=pause_count,
        pause_duration_total=round(pause_duration_total, 2),
        filler_count=filler_count,
        stutter_count=stutter_count,
        total_duration=round(total_duration, 2),
    )

    return metrics, energy_curve
