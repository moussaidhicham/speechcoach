# Model-Based Emotion Detection Implementation

## Overview

This implementation adds a dual-track emotion detection system to SpeechCoach:

1. **Rule-Based Track (Rigid Math)**: Uses Librosa (audio) + MediaPipe (vision) - the existing baseline
2. **Model-Based Track (AI Intuition)**: Uses Wav2Vec2 (audio) + HSEmotion (vision) - new deep learning approach

Both tracks run in parallel and produce comparable EQ scores (Stress, Confidence, Articulation) for side-by-side comparison in the report UI.

## Critical Constraints Addressed

### 1. Protobuf Conflict on Windows
MediaPipe on Windows is extremely sensitive to Protobuf descriptor conflicts. If any library (Pydantic, TensorFlow, Keras) registers a Protobuf descriptor before MediaPipe initializes, it crashes with:
```
CalculatorOptions has no field named 'ext'
```

**Solution**: Nuclear Isolation pattern in `vision/analysis.py`
- All heavy ML imports (cv2, numpy, mediapipe) happen inside a subprocess
- No top-level imports of these libraries
- Subprocess runs with `SPEECHCOACH_ISOLATED_VISION=1` and `TF_USE_LEGACY_KERAS=1` environment flags

### 2. Keras 3 Compatibility
Modern transformers and FER packages pull in Keras 3, but SpeechCoach requires Keras 2/Legacy Keras.

**Solution**: Locked dependencies in `requirements.txt`
- `tensorflow<2.16` and `keras<3.0` force Keras 2 usage
- `tf-keras` provides the bridge for Transformers
- Environment variable `TF_USE_LEGACY_KERAS="1"` set globally

### 3. Dependency Hell
Prevents automatic version upgrades that break MediaPipe compatibility.

**Solution**: Pinned versions
- `protobuf==3.20.3` (required for MediaPipe stability)
- `tensorflow<2.16` and `keras<3.0` (force Keras 2)
- `mediapipe==0.10.11` (known working version)

## Implementation Details

### 1. Environment Stabilization (`requirements.txt`)

```txt
# Protobuf & TensorFlow (Locked for MediaPipe stability on Windows)
protobuf==3.20.3
tensorflow<2.16
keras<3.0
tf-keras

# Model-Based Emotion Detection
hsemotion-onnx
onnxruntime
```

### 2. Vision Pipeline Nuclear Isolation (`vision/analysis.py`)

**Key Changes:**
- Removed top-level imports of `cv2`, `numpy`, `mediapipe`
- Created `_vision_subprocess_worker()` function with isolated imports
- `analyze_frames()` now spawns subprocess with clean C++ heap
- Environment flags: `SPEECHCOACH_ISOLATED_VISION=1`, `TF_USE_LEGACY_KERAS=1`

**Subprocess Flow:**
```
analyze_frames() 
  → spawns subprocess
    → imports cv2, numpy, mediapipe (isolated)
    → runs MediaPipe analysis
    → returns JSON results
  → parses results and returns VisionMetrics
```

### 3. Model-Based Emotion Detection (`metrics/eq_emotion.py`)

**Audio Model: Wav2Vec2**
- Model: `ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition`
- Output: 8 emotion probabilities (neutral, calm, happy, sad, angry, fearful, disgust, surprised)
- Lazy loading to avoid conflicts

**Vision Model: HSEmotion (ONNX)**
- Model: `hsemotion-onnx` (lightweight, ONNX runtime)
- Output: 7 emotion probabilities (neutral, happy, sad, surprise, fear, disgust, angry)
- ONNX avoids Keras/Protobuf conflicts

**Fusion Logic:**
```python
# Weighted fusion (audio 60%, vision 40%)
fused_prob = 0.6 * audio_prob + 0.4 * vision_prob

# Convert to EQ scores (0-100)
stress = (fear + angry + disgust + sad) * 100
confidence = (happy + neutral + surprise) * 100
articulation = (neutral + happy) * 100
```

### 4. Dual-Track Pipeline (`process_video.py`)

**Execution Flow:**
```
1. Audio Pipeline (ASR + Librosa analytics)
2. Vision Pipeline (MediaPipe with Nuclear Isolation)
3. Rule-Based EQ Metrics (existing eq_fusion.py)
4. Model-Based Emotion Detection (new eq_emotion.py)
   - Wav2Vec2 audio emotion analysis
   - HSEmotion vision emotion analysis
   - Fusion and EQ score computation
5. RAG + LLM Coaching (optional)
```

**Report Structure:**
```json
{
  "eq_metrics": {
    "version": "v2",
    "scores": {
      "stress": 45,
      "confidence": 72,
      "articulation": 68
    },
    "emotion_scores": {
      "rule_based": {
        "emotions": {"neutral": 0.35, "happy": 0.25, ...},
        "eq_scores": {"stress": 45, "confidence": 72, "articulation": 68},
        "method": "rule_based"
      },
      "model_based": {
        "audio_emotions": {"neutral": 0.30, "happy": 0.28, ...},
        "vision_emotions": {"neutral": 0.40, "happy": 0.22, ...},
        "fused_emotions": {"neutral": 0.34, "happy": 0.26, ...},
        "eq_scores": {"stress": 42, "confidence": 75, "articulation": 70},
        "method": "model_based"
      }
    }
  }
}
```

## Installation

### 1. Update Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Set Environment Variables

Add to `.env` file:
```env
TF_USE_LEGACY_KERAS=1
SPEECHCOACH_ISOLATED_VISION=1
```

Or set in your shell:
```bash
export TF_USE_LEGACY_KERAS=1
export SPEECHCOACH_ISOLATED_VISION=1
```

### 3. Verify Installation

Test the vision pipeline isolation:
```python
from app.analytics.engine.vision.analysis import analyze_frames

metrics, frame_data = analyze_frames(
    frames_dir="path/to/frames",
    device_type="laptop_desktop"
)
```

Test model-based emotions:
```python
from app.analytics.engine.metrics.eq_emotion import compute_model_based_emotions

result = compute_model_based_emotions(
    audio_path="path/to/audio.wav",
    frames_dir="path/to/frames",
    language="en",
    device_type="laptop_desktop"
)
```

## Usage in Reports

The frontend can now display both tracks side-by-side:

```javascript
// Rule-Based (Rigid Math)
const ruleBased = report.eq_metrics.emotion_scores.rule_based;
console.log('Rule-Based Stress:', ruleBased.eq_scores.stress);
console.log('Rule-Based Confidence:', ruleBased.eq_scores.confidence);

// Model-Based (AI Intuition)
const modelBased = report.eq_metrics.emotion_scores.model_based;
console.log('Model-Based Stress:', modelBased.eq_scores.stress);
console.log('Model-Based Confidence:', modelBased.eq_scores.confidence);

// Compare
const stressDiff = modelBased.eq_scores.stress - ruleBased.eq_scores.stress;
console.log('Stress difference:', stressDiff);
```

## Performance Considerations

### Vision Pipeline
- **Subprocess overhead**: ~0.5-1 second startup time
- **Isolation benefit**: Prevents Protobuf crashes (worth the overhead)
- **Timeout**: 5 minutes (configurable in `analyze_frames()`)

### Model-Based Emotions
- **Wav2Vec2**: First run downloads ~1GB model, subsequent runs use cache
- **HSEmotion**: ONNX model ~50MB, fast inference
- **Frame sampling**: Analyzes up to 30 frames (evenly sampled from video)
- **Total time**: ~30-60 seconds for typical 5-minute video

## Troubleshooting

### MediaPipe Crashes
**Error**: `CalculatorOptions has no field named 'ext'`

**Solution**: 
1. Verify `protobuf==3.20.3` is installed
2. Check `TF_USE_LEGACY_KERAS=1` is set
3. Ensure no other imports happen before MediaPipe initialization

### Keras 3 Conflicts
**Error**: `ImportError: cannot import name 'keras'`

**Solution**:
1. Verify `tensorflow<2.16` and `keras<3.0`
2. Check `tf-keras` is installed
3. Set `TF_USE_LEGACY_KERAS=1`

### Model Download Failures
**Error**: `ConnectionError` or `HTTPError`

**Solution**:
1. Check internet connection for first run
2. Models cache in `~/.cache/huggingface/` and `~/.cache/hsemotion/`
3. Can pre-download models offline if needed

### Subprocess Timeouts
**Error**: `Vision subprocess timed out after 5 minutes`

**Solution**:
1. Check if frames directory has too many files
2. Reduce frame sampling rate in `ffmpeg_wrapper.py`
3. Increase timeout in `analyze_frames()` if needed

## Future Enhancements

1. **Parallel Model Loading**: Cache models between video analyses
2. **GPU Acceleration**: Add GPU support for Wav2Vec2 and HSEmotion
3. **Custom Fusion Weights**: Allow user to adjust audio/vision weights
4. **Emotion Timeline**: Add time-series emotion tracking
5. **Multi-Speaker Detection**: Support for multiple speakers in video

## References

- **Wav2Vec2**: https://huggingface.co/ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition
- **HSEmotion**: https://github.com/HSE-asavchenko/hsemotion-onnx
- **MediaPipe Windows Issues**: https://github.com/google/mediapipe/issues/...
- **Protobuf Conflicts**: https://github.com/protocolbuffers/protobuf/issues/...

## Summary

This implementation provides:
- ✅ Stable MediaPipe on Windows (Nuclear Isolation)
- ✅ Keras 2 compatibility (locked dependencies)
- ✅ Dual-track emotion analysis (Rule-Based + Model-Based)
- ✅ Comparable EQ scores for side-by-side comparison
- ✅ Clean separation of concerns (isolated subprocesses)
- ✅ Forward-compatible architecture (easy to add new models)
