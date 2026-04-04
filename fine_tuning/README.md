# Fine-Tuning Seed Dataset

This folder is the starting point for a clean supervised fine-tuning dataset.

## Files

- `coach_dataset_seed.jsonl`: curated source dataset in `input/target` format
- `convert_seed_to_messages.py`: converter from source format to chat format
- `train_qwen25_lora.py`: first LoRA fine-tuning script for Qwen 2.5 3B

## Next steps

1. Keep targets short, sober, and always in `vous`.
2. Avoid using old bad `llm_coaching` outputs as targets.
3. Refresh `coach_dataset_train.jsonl` whenever `coach_dataset_seed.jsonl` changes.
4. Use the train/validation split files for the first fine-tuning runs.

## Target style rules

- `bilan_global`
  - 2 short sentences
  - one strength
  - one main issue
- `point_prioritaire`
  - 1 concrete action sentence
  - based directly on the top actionable tip
- `encouragement`
  - 1 short sentence
  - specific to the session
  - no generic motivation
