# Fine-Tuning Workspace

This folder now contains all fine-tuning work in one place.

## Structure

- `docs/`
  - `STEP1_engine_contract.md`
  - `STEP2_seed_dataset_spec.md`
  - `STEP2_batch1_curation.md`
- `scripts/`
  - `extract_seed_inputs.py`
  - `build_seed_v2_batch1.py`
- `data/intermediate/`
  - `seed_inputs_from_real_sessions.jsonl`
- `data/seed/`
  - `coach_dataset_seed_v2.jsonl`
- `data/legacy/`
  - old dataset files kept only for reference
- `notebooks/`
  - `qwen25_qlora_colab.ipynb`

## Important rule

The seed dataset must match the real runtime LLM payload.

At inference time, the coaching model currently sees:
- `session_context`
- `scores`
- `strengths`
- `weaknesses`
- `top_recommendation`
- `pedagogical_source`

It does **not** directly see raw:
- `audio_metrics`
- `vision_metrics`
- `exercise_recommendation`

So these fields should not be part of the supervised seed input.

## Current workflow

1. Extract real sessions into `data/intermediate/`
2. Curate a batch
3. Build `data/seed/coach_dataset_seed_v2.jsonl`
4. Write targets manually
5. Review style and consistency
6. Only then expand / clean / split / train
