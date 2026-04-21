# GPU Optimization Guide for Whisper

## Option 1: CUDA (NVIDIA GPUs)

### Prerequisites
- NVIDIA GPU with CUDA support (GTX 1060 or higher recommended)
- CUDA Toolkit 11.8+ installed
- PyTorch with CUDA support

### Installation
```bash
# Uninstall current PyTorch
pip uninstall torch torchvision torchaudio

# Install PyTorch with CUDA support
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Verify CUDA is available
python -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}')"
```

### Code Changes

**File: `backend/app/analytics/engine/audio/asr.py`**

```python
# Change device from "cpu" to "cuda"
class ASRProcessor:
    def __init__(
        self,
        model_size: str = "medium",
        device: str = "cuda",  # Changed from "cpu"
        compute_type: str = "float16",  # Changed from "int8"
        beam_size: int = 1,
    ):
        # ... rest of initialization
```

**Expected Speedup:**
- Whisper medium on GPU: ~0.15-0.20x RTF (15-20s for 5-minute video)
- **Speedup: 10-15x faster than CPU**

### Pros
- Massive speedup (10-15x)
- Better accuracy with float16
- Can handle longer videos easily

### Cons
- Requires NVIDIA GPU
- Higher hardware cost
- GPU memory requirements (~2-3GB for medium model)

---

## Option 2: Smaller Whisper Models

### Available Models
| Model | Parameters | Speed | Accuracy |
|-------|-----------|-------|----------|
| tiny | 39M | 4x faster | Lower |
| base | 74M | 2x faster | Medium |
| small | 244M | 1.5x faster | Good |
| medium | 769M | Baseline | High |
| large-v3 | 1550M | 0.5x slower | Best |

### Code Changes

**File: `backend/app/analytics/engine/audio/asr.py`**

```python
# Use base model instead of medium
asr = ASRProcessor(
    model_size="base",  # Changed from "medium"
    device="cpu",
    compute_type="int8",
    beam_size=1,
)
```

**Expected Speedup:**
- Whisper base on CPU: ~1.1x RTF (110s for 5-minute video)
- **Speedup: 2x faster than medium**

### Pros
- No hardware changes needed
- Immediate speedup
- Good accuracy for most use cases

### Cons
- Lower accuracy for accented speech
- May miss some fillers and hesitations

---

## Option 3: Distil-Whisper (Distilled Model)

### What is Distil-Whisper?
- Distilled version of Whisper large-v3
- 6x smaller, 6x faster, within 1% WER of Whisper large-v3
- Optimized for English, multilingual versions available

### Installation
```bash
pip install distil-whisper
```

### Code Changes

**File: `backend/app/analytics/engine/audio/asr.py`**

```python
from faster_whisper import WhisperModel

# Use distil-whisper model
asr = ASRProcessor(
    model_size="distil-large-v3",  # Distilled model
    device="cuda",  # Requires GPU for best performance
    compute_type=" "float16",
    beam_size=1,
)
```

**Expected Speedup:**
- Distil-large-v3 on GPU: ~0.10x RTF (30s for 5-minute video)
- **Speedup: 6x faster than Whisper medium on GPU**

### Pros
- Best speed/accuracy tradeoff
- State-of-the-art distilled model
- Maintains high accuracy

### Cons
- Requires GPU for best performance
- Newer model, less battle-tested

---

## Option 4: Batch Processing (Multiple Videos)

### Concept
- Process multiple videos in parallel
- Use GPU batch inference
- Distribute across multiple workers

### Code Changes

**File: `backend/app/worker/tasks.py`**

```python
# Configure Celery with GPU workers
celery_app.conf.update(
    worker_prefetch_multiplier=1,
    worker_concurrency=2,  # 2 workers for GPU
)

# Use BatchedInferencePipeline
from faster_whisper import BatchedInferencePipeline

batched_model = BatchedInferencePipeline(
    model=whisper_model,
    batch_size=16,  # Process 16 chunks at once
)
```

**Expected Speedup:**
- For 4 videos: 4x faster (parallel processing)
- **Speedup: N videos = N times faster**

### Pros
- Scales with number of videos
- Efficient GPU utilization
- Better throughput

### Cons
- More complex implementation
- Requires more GPU memory
- Single video not faster

---

## Option 5: Streaming/Real-Time Transcription

### Concept
- Transcribe while recording
- Show results incrementally
- Reduce perceived latency

### Implementation
```python
# Use streaming API
segments, info = model.transcribe(
    audio_stream,
    beam_size=1,
    vad_filter=True,
)

# Process segments as they arrive
for segment in segments:
    # Update UI with partial results
    update_progress(segment)
```

**Expected Benefit:**
- Perceived latency reduced by 50%
- User sees progress immediately

### Pros
- Better user experience
- Early feedback possible
- Can stop processing early if needed

### Cons
- More complex UI
- Still same total processing time
- Requires real-time architecture

---

## Recommended Solution: Hybrid Approach

### For Production (Best UX)
1. **Primary**: GPU with Whisper medium (10-15x faster)
2. **Fallback**: CPU with Whisper base (2x faster)
3. **Optimization**: Reduce beam_size to 1 (Fastest)

### Implementation Priority
1. **Immediate**: Switch to Whisper base (no hardware cost)
2. **Short-term**: Add GPU support (hardware investment)
3. **Long-term**: Implement distil-whisper + batch processing

### Cost-Benefit Analysis

| Solution | Cost | Speedup | ROI |
|----------|------|---------|-----|
| Whisper base (CPU) | $0 | 2x | High |
| Whisper medium (GPU) | $300-500 | 10-15x | Very High |
| Distil-whisper (GPU) | $300-500 | 6x | High |
| Batch processing | $0 | Nx | Medium |

---

## Testing Checklist

Before deploying to production:

- [ ] Test with various video lengths (1min, 5min, 10min, 30min)
- [ ] Verify accuracy with accented speech
- [ ] Test with different languages (en, fr, ar)
- [ ] Monitor GPU memory usage
- [ ] Test concurrent video processing
- [ ] Verify fillers/hesitations detection
- [ ] Compare WER (Word Error Rate) before/after
- [ ] Load test with multiple users

---

## Monitoring

Add performance metrics:

```python
# Track transcription time
import time

start_time = time.time()
segments, info = model.transcribe(audio_path)
transcription_time = time.time() - start_time

# Log metrics
logger.info(f"Transcription: {transcription_time:.2f}s for {duration}s audio")
logger.info(f"RTF: {transcription_time/duration:.2f}x")
```
