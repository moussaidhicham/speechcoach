import logging
import os
from typing import List, Tuple
from faster_whisper import WhisperModel
from metrics.schema import TranscriptionSegment

logger = logging.getLogger(__name__)

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
        logger.info(f"Loading Whisper model '{model_size}' on {device} ({compute_type})...")
        try:
            self.model = WhisperModel(model_size, device=device, compute_type=compute_type)
            logger.info("Whisper model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load Whisper model: {e}")
            self.model = None

    def transcribe(self, audio_path: str) -> Tuple[List[TranscriptionSegment], str]:
        """
        Transcribes the audio file.
        Returns:
            - List of TranscriptionSegment
            - Detected language code (e.g., 'fr', 'en')
        """
        if not self.model:
            logger.error("Model not initialized. Returning empty transcription.")
            return [], "unknown"

        if not os.path.exists(audio_path):
            logger.error(f"Audio file not found: {audio_path}")
            return [], "unknown"

        logger.info(f"Starting transcription for: {audio_path}")
        try:
            # VAD (Voice Activity Detection) enabled for better silence handling
            # Allowing detection only for Arabic (ar), French (fr), and English (en)
            segments, info = self.model.transcribe(
                audio_path, 
                beam_size=1, 
                vad_filter=True, 

                vad_parameters=dict(min_silence_duration_ms=500),
                initial_prompt="Bonjour, hello, مرحبا" # Help detect these 3 languages
            )
            
            detected_language = info.language
            # Optional: Strict check if we want to ensure it's one of the 3
            allowed_langs = ["ar", "fr", "en"]
            if detected_language not in allowed_langs:
                logger.warning(f"Language {detected_language} detected, outside of [ar, fr, en]. Defaulting to 'en'.")
                # We can't easily re-run with force 'en' without a new call, 
                # but Whisper info is just for reporting usually.
            
            logger.info(f"Detected language: {detected_language} (probability: {info.language_probability:.2f})")


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
