"""
Model-Based Emotion Detection (AI Intuition Track)

This module implements deep learning-based emotion detection using:
- Wav2Vec2 for vocal emotion recognition
- HSEmotion (ONNX) for facial emotion recognition

These models provide an "AI Intuition" approach to complement the rule-based
"Rigid Math" approach from Librosa/MediaPipe.
"""

import logging
import os
from typing import Dict, Any, List, Tuple, Optional
import numpy as np

logger = logging.getLogger(__name__)


# Emotion label mappings
EMOTION_LABELS = {
    "wav2vec2": {
        0: "neutral",
        1: "calm",
        2: "happy",
        3: "sad",
        4: "angry",
        5: "fearful",
        6: "disgust",
        7: "surprised"
    },
    "hsemotion": {
        0: "neutral",
        1: "happy",
        2: "sad",
        3: "surprise",
        4: "fear",
        5: "disgust",
        6: "angry"
    }
}


def _load_wav2vec2_model():
    """Load Wav2Vec2 model for speech emotion recognition."""
    try:
        from transformers import AutoModelForAudioClassification, AutoFeatureExtractor
        
        model_name = "ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition"
        logger.info(f"Loading Wav2Vec2 model: {model_name}")
        
        # Load model and feature extractor
        model = AutoModelForAudioClassification.from_pretrained(model_name)
        feature_extractor = AutoFeatureExtractor.from_pretrained(model_name)
        
        logger.info("Wav2Vec2 model loaded successfully")
        return model, feature_extractor
    except Exception as e:
        logger.error(f"Failed to load Wav2Vec2 model: {e}")
        return None, None


def _load_hsemotion_model():
    """Load HSEmotion ONNX model for facial emotion recognition."""
    try:
        from hsemotion_onnx.facial_emotions import HSEmotionRecognizer
        
        logger.info("Loading HSEmotion ONNX model")
        detector = HSEmotionRecognizer()
        
        logger.info("HSEmotion model loaded successfully")
        return detector
    except (ImportError, AttributeError, TypeError) as e:
        logger.warning(f"HSEmotion not available: {e}")
        logger.info("Vision emotion detection will use audio-only fallback")
        return None
    except Exception as e:
        logger.error(f"Failed to load HSEmotion model: {e}")
        logger.info("Vision emotion detection will use audio-only fallback")
        return None


def _analyze_audio_emotion(
    audio_path: str,
    model,
    feature_extractor,
    language: str = "en"
) -> Dict[str, float]:
    """
    Analyze vocal emotion using Wav2Vec2.
    
    Returns emotion probabilities for 7-8 emotion categories.
    """
    if model is None or feature_extractor is None:
        logger.warning("Wav2Vec2 model not available, returning neutral probabilities")
        return {label: 0.125 for label in EMOTION_LABELS["wav2vec2"].values()}
    
    try:
        import librosa
        
        # Load audio
        y, sr = librosa.load(audio_path, sr=16000)
        
        # Extract features
        inputs = feature_extractor(y, sampling_rate=sr, return_tensors="pt", padding=True)
        
        # Get model predictions
        import torch
        with torch.no_grad():
            logits = model(**inputs).logits
        
        # Convert to probabilities
        probabilities = torch.nn.functional.softmax(logits, dim=-1)[0]
        
        # Map to emotion labels
        emotion_probs = {}
        for idx, prob in enumerate(probabilities):
            label = EMOTION_LABELS["wav2vec2"].get(idx, f"class_{idx}")
            emotion_probs[label] = float(prob)
        
        logger.info(f"Audio emotion analysis completed. Top emotion: {max(emotion_probs, key=emotion_probs.get)}")
        return emotion_probs
        
    except Exception as e:
        logger.error(f"Audio emotion analysis failed: {e}")
        return {label: 0.125 for label in EMOTION_LABELS["wav2vec2"].values()}


def _analyze_vision_emotion(
    frames_dir: str,
    detector,
    device_type: str = "unknown"
) -> Dict[str, float]:
    """
    Analyze facial emotion using HSEmotion ONNX.
    
    Returns average emotion probabilities across all frames.
    If detector is not available, returns neutral probabilities (audio-only fallback).
    """
    if detector is None:
        logger.info("HSEmotion not available, using audio-only fallback for vision emotions")
        return {label: 0.143 for label in EMOTION_LABELS["hsemotion"].values()}
    
    try:
        import cv2
        import glob
        
        frame_paths = sorted(glob.glob(os.path.join(frames_dir, "*.jpg")))
        if not frame_paths:
            logger.warning(f"No frames found in {frames_dir}")
            return {label: 0.143 for label in EMOTION_LABELS["hsemotion"].values()}
        
        # Sample frames to avoid processing too many
        max_frames = 30
        if len(frame_paths) > max_frames:
            indices = np.linspace(0, len(frame_paths) - 1, max_frames, dtype=int)
            frame_paths = [frame_paths[i] for i in indices]
        
        emotion_prob_sums = {label: 0.0 for label in EMOTION_LABELS["hsemotion"].values()}
        valid_frames = 0
        
        logger.info(f"Analyzing {len(frame_paths)} frames with HSEmotion...")
        
        for frame_path in frame_paths:
            try:
                # Read frame
                image = cv2.imread(frame_path)
                if image is None:
                    continue
                
                # Detect emotion using HSEmotionRecognizer
                # Returns: (emotion_label, scores_array)
                emotion_label, scores = detector.predict_emotions(image, logits=True)
                
                # Convert scores array to probabilities
                # scores is a numpy array of raw logits or probabilities
                if scores is not None:
                    # Normalize to probabilities if needed
                    if np.max(scores) > 1:
                        # Apply softmax to convert logits to probabilities
                        exp_scores = np.exp(scores - np.max(scores))
                        probs = exp_scores / exp_scores.sum()
                    else:
                        probs = scores
                    
                    # Map probabilities to emotion labels
                    # HSEmotion uses idx_to_class mapping internally
                    # We'll use the scores array order which matches EMOTION_LABELS["hsemotion"]
                    for idx, prob in enumerate(probs):
                        if idx < len(EMOTION_LABELS["hsemotion"]):
                            label = EMOTION_LABELS["hsemotion"][idx]
                            emotion_prob_sums[label] += prob
                    
                    valid_frames += 1
                    
            except Exception as e:
                logger.warning(f"Failed to analyze frame {frame_path}: {e}")
                continue
        
        # Average probabilities across valid frames
        if valid_frames > 0:
            emotion_probs = {label: prob / valid_frames for label, prob in emotion_prob_sums.items()}
            logger.info(f"Vision emotion analysis completed on {valid_frames} frames. Top emotion: {max(emotion_probs, key=emotion_probs.get)}")
            return emotion_probs
        else:
            logger.warning("No valid frames analyzed with HSEmotion")
            return {label: 0.143 for label in EMOTION_LABELS["hsemotion"].values()}
            
    except Exception as e:
        logger.error(f"Vision emotion analysis failed: {e}")
        return {label: 0.143 for label in EMOTION_LABELS["hsemotion"].values()}


def _fuse_emotion_scores(
    audio_emotions: Dict[str, float],
    vision_emotions: Dict[str, float]
) -> Dict[str, float]:
    """
    Fuse audio and vision emotion probabilities using weighted averaging.
    
    Audio gets 0.6 weight (more reliable for speech coaching)
    Vision gets 0.4 weight (complementary visual cues)
    """
    # Normalize emotion labels to common set
    common_emotions = ["neutral", "happy", "sad", "angry", "fear", "surprise", "disgust"]
    
    fused_emotions = {}
    
    for emotion in common_emotions:
        audio_prob = audio_emotions.get(emotion, 0.0)
        vision_prob = vision_emotions.get(emotion, 0.0)
        
        # Weighted fusion
        fused_prob = 0.6 * audio_prob + 0.4 * vision_prob
        fused_emotions[emotion] = fused_prob
    
    # Normalize to ensure probabilities sum to 1
    total = sum(fused_emotions.values())
    if total > 0:
        fused_emotions = {k: v / total for k, v in fused_emotions.items()}
    
    return fused_emotions


def _emotions_to_eq_scores(emotion_probs: Dict[str, float]) -> Dict[str, float]:
    """
    Convert emotion probabilities to EQ-style scores:
    - Stress: Based on fear, anger, disgust
    - Confidence: Based on happy, neutral, surprise
    - Articulation: Based on neutral, happy (low stress indicators)
    """
    # Stress components (negative emotions)
    stress_emotions = ["fear", "angry", "disgust", "sad"]
    stress_score = sum(emotion_probs.get(e, 0.0) for e in stress_emotions)
    
    # Confidence components (positive emotions)
    confidence_emotions = ["happy", "neutral", "surprise"]
    confidence_score = sum(emotion_probs.get(e, 0.0) for e in confidence_emotions)
    
    # Articulation components (calm, focused emotions)
    articulation_emotions = ["neutral", "happy"]
    articulation_score = sum(emotion_probs.get(e, 0.0) for e in articulation_emotions)
    
    # Scale to 0-100 range
    stress_final = int(round(stress_score * 100))
    confidence_final = int(round(confidence_score * 100))
    articulation_final = int(round(articulation_score * 100))
    
    return {
        "stress": stress_final,
        "confidence": confidence_final,
        "articulation": articulation_final
    }


def compute_model_based_emotions(
    audio_path: str,
    frames_dir: str,
    language: str = "en",
    device_type: str = "unknown"
) -> Dict[str, Any]:
    """
    Main function to compute model-based emotion scores (AI Intuition track).
    
    Returns:
        Dictionary containing:
        - audio_emotions: Wav2Vec2 emotion probabilities
        -vision_emotions: HSEmotion emotion probabilities (or fallback if unavailable)
        - fused_emotions: Combined emotion probabilities
        - eq_scores: Stress, Confidence, Articulation scores (0-100)
        - method: "model_based"
        - vision_available: Boolean indicating if vision analysis was successful
    """
    logger.info("Starting model-based emotion analysis (AI Intuition track)...")
    
    # Load models (lazy loading to avoid conflicts)
    wav2vec2_model, feature_extractor = _load_wav2vec2_model()
    hsemotion_detector = _load_hsemotion_model()
    
    # Analyze audio emotion
    logger.info("Analyzing audio emotion with Wav2Vec2...")
    audio_emotions = _analyze_audio_emotion(
        audio_path,
        wav2vec2_model,
        feature_extractor,
        language
    )
    
    # Analyze vision emotion
    logger.info("Analyzing vision emotion with HSEmotion...")
    vision_emotions = _analyze_vision_emotion(
        frames_dir,
        hsemotion_detector,
        device_type
    )
    
    # Check if vision analysis was successful
    vision_available = hsemotion_detector is not None
    
    # Fuse emotions
    logger.info("Fusing audio and vision emotion probabilities...")
    fused_emotions = _fuse_emotion_scores(audio_emotions, vision_emotions)
    
    # Convert to EQ scores
    eq_scores = _emotions_to_eq_scores(fused_emotions)
    
    logger.info(
        f"Model-based EQ scores - Stress: {eq_scores['stress']}, "
        f"Confidence: {eq_scores['confidence']}, "
        f"Articulation: {eq_scores['articulation']}"
    )
    
    if not vision_available:
        logger.info("Note: Vision emotion detection unavailable, using audio-only analysis")
    
    return {
        "audio_emotions": audio_emotions,
        "vision_emotions": vision_emotions,
        "fused_emotions": fused_emotions,
        "eq_scores": eq_scores,
        "method": "model_based",
        "vision_available": vision_available
    }


def compute_rule_based_emotions(
    audio_metrics,
    vision_metrics,
    eq_metrics: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Extract rule-based emotion scores from existing metrics (Rigid Math track).
    
    This provides a baseline for comparison with the model-based approach.
    """
    # Extract from existing eq_metrics
    stress_score = eq_metrics.get("scores", {}).get("stress", 50)
    confidence_score = eq_metrics.get("scores", {}).get("confidence", 50)
    articulation_score = eq_metrics.get("scores", {}).get("articulation", 50)
    
    # Create emotion-like probabilities from metrics
    # This is a heuristic mapping from rule-based metrics to emotion space
    stress_level = stress_score / 100.0
    confidence_level = confidence_score / 100.0
    articulation_level = articulation_score / 100.0
    
    # Map to emotion probabilities (heuristic)
    rule_emotions = {
        "neutral": 0.3 + (0.2 * (1 - stress_level)),
        "happy": 0.2 * confidence_level,
        "sad": 0.1 * stress_level,
        "angry": 0.1 * stress_level,
        "fear": 0.1 * stress_level,
        "surprise": 0.1 * (1 - stress_level),
        "disgust": 0.05 * stress_level
    }
    
    # Normalize
    total = sum(rule_emotions.values())
    if total > 0:
        rule_emotions = {k: v / total for k, v in rule_emotions.items()}
    
    return {
        "emotions": rule_emotions,
        "eq_scores": {
            "stress": stress_score,
            "confidence": confidence_score,
            "articulation": articulation_score
        },
        "method": "rule_based"
    }
