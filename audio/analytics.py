import logging
import re
import numpy as np
import librosa
from typing import List, Dict, Any, Tuple
from metrics.schema import AudioMetrics, TranscriptionSegment

logger = logging.getLogger(__name__)

# Common fillers in EN and FR
FILLERS = {
    "en": [r"\bum\b", r"\buh\b", r"\ber\b", r"\bah\b", r"\blike\b", r"\byou know\b"],
    "fr": [r"\beuh\b", r"\benfin\b", r"\ben fait\b", r"\bdu coup\b", r"\bah\b"]
}
# question : Est ce que je doit faire une liste de tous les mots de remplissage possibles pour chaque langue ? ou juste les plus courants ?


def analyze_audio_file(audio_path: str, transcript: List[TranscriptionSegment], language: str = "en") -> Tuple[AudioMetrics, List[float]]:
    """
    Computes audio metrics from the WAV file and the boolean text transcript.
    """
    if not transcript:
        logger.warning("No transcript provided for audio analysis.")
        return AudioMetrics()

    # 1. Text-based Metrics (WPM, Fillers)
    full_text = " ".join([seg.text for seg in transcript])
    word_count = len(full_text.split())
    
    # Duration based on transcript timestamps to be more accurate about "speaking time"
    # or use file duration? WPM usually uses the total duration including pauses for "Speech Rate",
    # and "Articulation Rate" excludes pauses. Let's use total duration from start to end of speech.
    if transcript:
        speech_duration_min = (transcript[-1].end - transcript[0].start) / 60.0
    else:
        speech_duration_min = 1.0 # Avoid div/0
        
    if speech_duration_min <= 0:
        speech_duration_min = 0.1

    wpm = word_count / speech_duration_min
    
    # Fillers count
    filler_count = 0
    patterns = FILLERS.get(language, FILLERS["en"]) # Fallback to EN
    
    # Normalize text for filler search
    normalized_text = full_text.lower()
    for ptrn in patterns:
        try:
            filler_count += len(re.findall(ptrn, normalized_text))
        except re.error:
            pass

    # 2. Signal-based Metrics (Pauses, Energy) via Librosa
    # Load audio (downsample to 16k is fine)
    try:
        y, sr = librosa.load(audio_path, sr=16000)
    except Exception as e:
        logger.error(f"Could not calculate signal metrics (librosa error): {e}")
        return AudioMetrics(wpm=wpm, filler_count=filler_count)
    
    # Detect non-silent intervals using RMS energy
    # top_db=20 means anything 20dB below max is considered silence.
    # Adjust frame_length and hop_length for granularity.
    non_silent_intervals = librosa.effects.split(y, top_db=30, frame_length=2048, hop_length=512)
    
    total_duration = librosa.get_duration(y=y, sr=sr)
    non_silent_duration = sum([(end - start) for start, end in non_silent_intervals]) / sr
    
    pause_duration_total = total_duration - non_silent_duration
    
    # Count "long" pauses (> 0.5s)
    # We iterating over gaps between intervals
    pause_count = 0
    if len(non_silent_intervals) > 1:
        for i in range(len(non_silent_intervals) - 1):
            end_current = non_silent_intervals[i][1]
            start_next = non_silent_intervals[i+1][0]
            gap_sec = (start_next - end_current) / sr
            if gap_sec > 0.5: # Threshold for a "significant pause"
                pause_count += 1
                
    # Prosody: Energy (RMS)
    # Just a simple mean RMS to check "Volume"
    rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=512)[0] # [0] because rms returns (1, t)
    energy_mean = float(np.mean(rms))
    
    # Downsample RMS for visualization (e.g. 1 point per 0.1s to avoid huge arrays)
    # sr=16000, hop=512 -> ~31 frames/sec. 
    # taking every 3rd frame -> ~10 frames/sec (10Hz)
    energy_curve = [float(v) for v in rms[::3]]

    logger.info(f"Audio Analysis - WPM: {wpm:.1f}, Pauses >0.5s: {pause_count}, Fillers: {filler_count}")

    metrics = AudioMetrics(
        wpm=round(wpm, 1),
        pause_count=pause_count,
        pause_duration_total=round(pause_duration_total, 2),
        filler_count=filler_count
        # energy_mean=energy_mean 
    )
    
    return metrics, energy_curve
