import logging
import os
from typing import List, Optional, Tuple

from faster_whisper import WhisperModel

from app.analytics.engine.metrics.schema import TranscriptionSegment

logger = logging.getLogger(__name__)

_MODEL_CACHE: dict[tuple[str, str, str], WhisperModel] = {}
_ALLOWED_LANGS = {"ar", "fr", "en"}
_LANGUAGE_PROMPTS = {
    "ar": "يعني، آه، ام، همم، هممم، مم، إي، مرحبا، حسناً",
    "fr": "Euh, hum, hmm, mm, mmm, ah, ben, alors, donc, Bonjour, salut",
    "en": "Um, uh, er, ah, like, you know, mmm, Hello, hi",
}


class ASRProcessor:
    def __init__(
        self,
        model_size: str = "medium",
        device: str = "cpu",
        compute_type: str = "int8",
        beam_size: int = 1,
    ):
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
        self.beam_size = beam_size
        cache_key = (model_size, device, compute_type)
        try:
            if cache_key not in _MODEL_CACHE:
                logger.info(f"Loading Whisper model '{model_size}' on {device} ({compute_type})...")
                try:
                    # Pass 1: Try instant local loading to bypass 20s HuggingFace network check
                    _MODEL_CACHE[cache_key] = WhisperModel(model_size, device=device, compute_type=compute_type, local_files_only=True)
                    logger.info("Whisper model instantly loaded from local offline cache.")
                except Exception:
                    # Pass 2: Fallback to download if it's a fresh install
                    logger.info("Local model not found. Downloading from HuggingFace...")
                    _MODEL_CACHE[cache_key] = WhisperModel(model_size, device=device, compute_type=compute_type, local_files_only=False)
                    logger.info("Whisper model downloaded and loaded successfully.")
            else:
                logger.info(f"Reusing cached Whisper model '{model_size}' on {device} ({compute_type}).")

            self.model = _MODEL_CACHE[cache_key]
        except Exception as e:
            logger.error(f"Failed to load Whisper model: {e}")
            self.model = None

    def _run_transcription(
        self,
        audio_path: str,
        forced_language: Optional[str] = None,
        prompt_language: Optional[str] = None,
    ):
        return self.model.transcribe(
            audio_path,
            beam_size=self.beam_size,
            vad_filter=True,
            language=forced_language,
            vad_parameters=dict(min_silence_duration_ms=500),
            initial_prompt=_LANGUAGE_PROMPTS.get(prompt_language),
        )

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
            if forced_language in _ALLOWED_LANGS:
                segments, info = self._run_transcription(
                    audio_path,
                    forced_language=forced_language,
                    prompt_language=forced_language,
                )
                detected_language = forced_language
            else:
                detect_segments, detect_info = self._run_transcription(audio_path)
                detected_language = detect_info.language
                segments = detect_segments
                info = detect_info

                if detected_language in _ALLOWED_LANGS:
                    logger.info("Detected %s in auto mode; rerunning with language-specific prompt.", detected_language)
                    segments, info = self._run_transcription(
                        audio_path,
                        forced_language=detected_language,
                        prompt_language=detected_language,
                    )
                else:
                    logger.warning(f"Language {detected_language} detected, outside of [ar, fr, en].")

            logger.info(f"Language used: {detected_language} (forced={bool(forced_language)})")

            transcription_segments = []
            for segment in segments:
                transcription_segments.append(
                    TranscriptionSegment(
                        start=segment.start,
                        end=segment.end,
                        text=segment.text.strip(),
                    )
                )

            logger.info(f"Transcription complete. {len(transcription_segments)} segments managed.")
            return transcription_segments, detected_language

        except Exception as e:
            logger.error(f"Error during transcription: {e}")
            return [], "unknown"


