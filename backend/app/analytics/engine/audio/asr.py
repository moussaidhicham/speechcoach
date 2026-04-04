import logging
import os
from typing import List, Tuple, Optional
from faster_whisper import WhisperModel
from app.analytics.engine.metrics.schema import TranscriptionSegment

logger = logging.getLogger(__name__)

_MODEL_CACHE: dict[tuple[str, str, str], WhisperModel] = {}

class ASRProcessor:
    def __init__(self, model_size: str = "small", device: str = "cpu", compute_type: str = "int8"):
        """
        Initialize the Faster-Whisper model.
        Args:
            model_size: 'tiny', 'base', 'small', 'medium', 'larg-v2', 'large-v3'
            device: 'cpu' or 'cuda'
            compute_type: 'int8', 'float16', 'float32'
        """
        self.model_size = model_size
        self.device = device
        self.compute_type = compute_type
        cache_key = (model_size, device, compute_type)
        try:
            if cache_key not in _MODEL_CACHE:
                logger.info(f"Loading Whisper model '{model_size}' on {device} ({compute_type})...")
                _MODEL_CACHE[cache_key] = WhisperModel(model_size, device=device, compute_type=compute_type)
                logger.info("Whisper model loaded successfully.")
            else:
                logger.info(f"Reusing cached Whisper model '{model_size}' on {device} ({compute_type}).")

            self.model = _MODEL_CACHE[cache_key]
        except Exception as e:
            logger.error(f"Failed to load Whisper model: {e}")
            self.model = None

    def transcribe(self, audio_path: str, forced_language: Optional[str] = None) -> Tuple[List[TranscriptionSegment], str]:
        """
        Transcribes the audio file.
        Args:
            audio_path: Path to the audio file.
            forced_language: (Optional) Language code to force (e.g., 'fr', 'en', 'ar').
        Returns:
            - List of TranscriptionSegment
            - Detected or forced language code.
        """
        if not self.model:
            logger.error("Model not initialized. Returning empty transcription.")
            return [], "unknown"

        if not os.path.exists(audio_path):
            logger.error(f"Audio file not found: {audio_path}")
            return [], "unknown"

        logger.info(f"Starting transcription for: {audio_path} (Forced Lang: {forced_language})")
        try:
            # VAD (Voice Activity Detection) enabled for better silence handling
            # If forced_language is provided, we skip auto-detection.
            segments, info = self.model.transcribe(
                audio_path, 
                beam_size=1, 
                vad_filter=True, 
                language=forced_language, # If None, it will auto-detect
                vad_parameters=dict(min_silence_duration_ms=500),
                initial_prompt="Bonjour, hello, مرحبا" if not forced_language else None
            )
            
            detected_language = forced_language or info.language
            
            if not forced_language:
                # Optional: Strict check if we want to ensure it's one of the 3
                allowed_langs = ["ar", "fr", "en"]
                if detected_language not in allowed_langs:
                    logger.warning(f"Language {detected_language} detected, outside of [ar, fr, en].")
            
            logger.info(f"Language used: {detected_language} (forced={bool(forced_language)})")


            transcription_segments = []
            for segment in segments:
                # Store in our schema format
                transcription_segments.append(TranscriptionSegment(
                    start=segment.start,
                    end=segment.end,
                    text=segment.text.strip()
                ))
            
            logger.info(f"Transcription complete. {len(transcription_segments)} segments managed.")
            return transcription_segments, detected_language

        except Exception as e:
            logger.error(f"Error during transcription: {e}")
            return [], "unknown"
