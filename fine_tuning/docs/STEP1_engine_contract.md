# Step 1 - Engine Contract Before New Fine-Tuning

This document freezes the contract that must be validated before creating a new seed dataset.

The goal is simple:
- do not train on unstable upstream behavior;
- define exactly what the model will receive at inference time;
- separate deterministic pedagogy policy from learned wording.

## 1. Scope of the fine-tuned model

The fine-tuned model should generate only:
- `bilan_global`
- `point_prioritaire`
- `encouragement`

The model should **not** decide:
- raw metrics
- score computation
- recommendation ranking
- severity thresholds
- exercise mode selection
- retrieval strategy

These remain deterministic and must be frozen first.

## 2. Deterministic vs learned split

### Deterministic layer
- audio metrics extraction
- visual metrics extraction
- score computation
- strengths/weaknesses summary
- recommendation ranking
- top actionable tip
- exercise mode selection
- device resolution logic
- language override logic

### Learned layer
- pedagogical wording of the global summary
- pedagogical wording of the top priority
- pedagogical wording of the encouragement

This means the model verbalizes a decision already made by the engine. It must not invent a new coaching policy.

## 3. Canonical coaching input schema

Future seed examples must use one stable input schema that matches the real runtime context.

### Required top-level keys
- `session_context`
- `scores`
- `audio_metrics`
- `vision_metrics`
- `strengths`
- `weaknesses`
- `top_recommendation`
- `exercise_recommendation`

### Recommended schema

```json
{
  "session_context": {
    "experience_level": "intermediate",
    "current_goal": "soutenance_pfe"
  },
  "scores": {
    "overall_score": 74.5,
    "voice_score": 6.8,
    "presence_score": 7.4,
    "body_language_score": 6.0,
    "scene_score": 8.5
  },
  "audio_metrics": {
    "wpm": 151,
    "pause_count": 6,
    "pause_duration_total": 4.8,
    "filler_count": 3,
    "stutter_count": 1
  },
  "vision_metrics": {
    "face_presence_ratio": 0.98,
    "eye_contact_ratio": 0.64,
    "hands_visibility_ratio": 0.36,
    "hands_activity_score": 4.2,
    "avg_brightness": 132,
    "avg_blur": 44
  },
  "strengths": [
    "Discours clair et globalement fluide.",
    "Le visage reste bien visible dans le cadre."
  ],
  "weaknesses": [
    "Le regard caméra reste encore irrégulier.",
    "La gestuelle peut mieux accompagner les idées clés."
  ],
  "top_recommendation": {
    "category": "Presence & Regard",
    "severity": "Warning",
    "message": "Le regard camera reste inconstant.",
    "actionable_tip": "Regardez la camera a chaque idee cle pour rendre votre presence plus stable et plus engageante.",
    "exercise_key": "fiche-regard-001"
  },
  "exercise_recommendation": {
    "mode": "single_exercise",
    "title": "Exercice regard camera",
    "summary": "Refaites une prise de parole courte en revenant a la camera sur chaque idee importante.",
    "goal": "Stabiliser le regard camera sur les idees importantes."
  }
}
```

## 4. Output schema to learn

Each target example must contain exactly:

```json
{
  "bilan_global": "...",
  "point_prioritaire": "...",
  "encouragement": "..."
}
```

### Output rules

#### `bilan_global`
- 2 to 4 concise sentences
- must summarize the session globally, not only mechanically mention one strength and one weakness
- should reflect:
  - overall level of the session
  - main strengths
  - the main issue or priority
- must stay grounded in the input
- no generic filler sentence

#### `point_prioritaire`
- exactly 1 short action sentence
- must align with `top_recommendation.actionable_tip`
- must not introduce a new pedagogical axis

#### `encouragement`
- exactly 1 short sentence
- specific to the current session
- no generic motivation
- no empty praise disconnected from the scores

## 5. Controlled vocabularies

To avoid drift in the new dataset, the following fields should be normalized.

### `experience_level`
- `beginner`
- `intermediate`
- `advanced`

### `current_goal`
- `general`
- `soutenance_pfe`
- `pitch`
- `entretien`

### Recommendation severity
- `Critical`
- `Warning`
- `Info`

### Recommendation categories
- `Voix & Debit`
- `Voix & Fluidite`
- `Presence & Regard`
- `Gestuelle`
- `Cadre & Posture`
- `Image & Lumiere`
- `Image & Nettete`
- `Maintien`

## 6. Blockers before seed dataset creation

These must be fixed or explicitly frozen before creating `coach_dataset_seed_v2.jsonl`.

### Blocker A - body-language metric scale
Frozen decision:
- `hands_activity_score` is a pedagogical agitation score on a `/10` scale
- `0` means very static hands
- `10` means very agitated hands

Implementation note:
- the score is derived from normalized wrist movement between analyzed frames
- the current computation may remain heuristic, but the public contract must stay `/10`

This must stay frozen because body-language labels depend on it.

### Blocker B - user context not yet integrated in coaching input
The application already stores:
- `preferred_language`
- `experience_level`
- `current_goal`

Frozen decision for dataset v2:
- include only `experience_level` and `current_goal` in the coaching input;
- keep the LLM output in French for now;
- do not include `language`, `preferred_language`, or `device_type` in the training schema for this first clean fine-tuning cycle.

Implementation note:
- `preferred_language` remains useful in the pipeline for ASR/language override;
- it is not a pedagogical conditioning variable for the current fine-tuning target.

### Blocker C - recommendation wording freeze
The dataset must not be built while recommendation categories or actionable tips are still drifting.

Before seed creation, freeze:
- category names
- severity names
- top-tip writing style

Frozen decision:
- recommendation categories are fixed to:
  - `Voix & Debit`
  - `Voix & Fluidite`
  - `Presence & Regard`
  - `Gestuelle`
  - `Cadre & Posture`
  - `Image & Lumiere`
  - `Image & Nettete`
  - `Maintien`
- severity labels are fixed to:
  - `Critical`
  - `Warning`
  - `Info`
- actionable tips must:
  - stay short and concrete;
  - use direct action wording;
  - remain aligned with the top diagnostic signal;
  - avoid lyrical or overly motivational phrasing;
  - avoid introducing a second pedagogical axis in the same sentence.

Validation result at this stage:
- no major category drift remains in the deterministic engine;
- one wording inconsistency was corrected in the fluidity tip;
- the recommendation policy can now be considered stable enough for seed writing, pending knowledge-base review.

### Blocker D - knowledge-base structure
The knowledge base is usable, but still too shallow for a fully defensible dataset pipeline if we want to say the model is grounded in pedagogical material.

At minimum we should decide whether the current version is:
- accepted as a lightweight phase-1 pedagogical source;
- or restructured before dataset creation.

Frozen decision for Step 1:
- accept the current knowledge base as a lightweight phase-1 pedagogical source;
- require only minimum stabilization before seed creation;
- postpone full fiche restructuring to a later phase.

## 7. Knowledge-base review

File concerned:
- `backend/app/analytics/engine/rag/knowledge_base.json`

### What is already good
- stable exercise IDs
- one fiche per major coaching axis
- content is coherent enough to support deterministic exercise links

### Minimum improvements required now
- fix and preserve UTF-8 content cleanly
- align fiche category names with recommendation category names where possible
- verify each `exercise_key` used by recommendations exists in the KB
- remove any pedagogical wording that contradicts current deterministic advice

Validation result at this stage:
- UTF-8/mojibake issues were removed from the KB source;
- the fiche category used for environment advice was aligned with `Image & Lumiere`;
- all `exercise_key` references used by recommendations are covered by an existing fiche;
- retrieval was strengthened by embedding fiche category and full content, not only title and keywords.

### Useful but optional improvements
- split each fiche into structured fields:
  - `problem`
  - `exercise_name`
  - `steps`
  - `expected_outcome`
  - `self_check`
- embed full fiche text during retrieval, not only title + keywords
- add multilingual aliases or keywords if retrieval must support French, English, and Arabic prompts more robustly

## 8. Validation checklist for Step 1

We can mark Step 1 as validated only if:

1. the coaching input schema above is accepted;
2. the body-language metric scale is clarified and frozen on a `/10` scale;
3. recommendation categories and severity labels are frozen;
4. we decide whether `experience_level` and `current_goal` are included in seed v2;
5. the knowledge base is judged stable enough for seed generation.

Only after that do we move to:
- Step 2: writing the new seed dataset.

## 9. Immediate next sub-step

The next sub-step after this document should be:
- engine freeze review:
  - confirm the canonical schema,
  - classify blockers as must-fix vs acceptable-for-v1,
  - then patch the code only where needed before seed creation.
