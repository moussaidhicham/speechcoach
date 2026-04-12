# Step 2 - Seed Dataset Specification

This document defines how `coach_dataset_seed_v2.jsonl` must be written.

The objective of Step 2 is:
- create a new human-curated seed dataset from scratch;
- keep every row aligned with the frozen engine contract from Step 1;
- mirror the real runtime payload sent to `agent_coach.py`;
- avoid style drift, duplicated scenarios, and noisy labels.

## 1. File to create

Target file:
- `fine_tuning/data/seed/coach_dataset_seed_v2.jsonl`

Format:
- one JSON object per line
- UTF-8
- no trailing comments
- no mixed schema versions in the same file

## 2. Row schema

Each row must contain exactly two top-level keys:
- `input`
- `target`

### Canonical row format

```json
{
  "input": {
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
    "strengths": [
      "Discours clair et globalement fluide.",
      "Le visage reste bien visible dans le cadre."
    ],
    "weaknesses": [
      "Le regard camera reste encore irregulier.",
      "La gestuelle peut mieux accompagner les idees cles."
    ],
    "top_recommendation": {
      "category": "Presence & Regard",
      "severity": "Warning",
      "message": "Le regard camera reste inconstant.",
      "actionable_tip": "Regardez la camera a chaque idee cle pour rendre votre presence plus stable et plus engageante.",
      "exercise_key": "fiche-regard-001"
    },
    "pedagogical_source": "Exercice : fixez une idee cle, regardez l'objectif, puis relancez une phrase complete en gardant ce point d'ancrage."
  },
  "target": {
    "bilan_global": "Votre prise de parole repose deja sur une base claire et globalement stable. Le point principal a travailler reste un regard camera plus regulier pour renforcer votre presence. La gestuelle peut ensuite mieux accompagner les idees cles.",
    "point_prioritaire": "Regardez la camera a chaque idee cle pour rendre votre presence plus stable et plus engageante.",
    "encouragement": "La base est deja serieuse ; un regard plus regulier renforcera nettement votre impact."
  }
}
```

## 3. Writing rules

### General rules
- all targets must be written in French
- always use `vous`
- keep tone sober, professional, and specific
- do not invent facts not present in the input
- do not mention metrics that are not visible in the row
- do not contradict `top_recommendation`

### `bilan_global`
- 2 to 4 concise sentences
- summarize the session globally
- reflect:
  - overall level
  - main strengths
  - main issue or priority
- no generic filler sentence
- no empty praise

### `point_prioritaire`
- exactly 1 sentence
- concrete action
- must stay aligned with `top_recommendation.actionable_tip`
- may simplify wording slightly
- must not introduce a second coaching axis

### `encouragement`
- exactly 1 sentence
- specific to the case
- supportive but sober
- no generic motivational slogans

## 4. What to avoid

Do not write:
- vague praise like `Continuez comme ca`
- empty motivation like `Croyez en vous`
- lyrical expressions
- mixed pedagogical priorities in one short target
- hidden hallucinations about stress, confidence, charisma, posture, etc. if the input does not justify them

Do not reuse old bad phrasing from the previous dataset such as:
- over-generic summaries
- decorative encouragement
- artificial style inflation
- advice not grounded in the deterministic recommendation

## 5. Controlled vocabularies

### `experience_level`
- `beginner`
- `intermediate`
- `advanced`

### `current_goal`
- `general`
- `soutenance_pfe`
- `pitch`
- `entretien`

### `top_recommendation.severity`
- `Critical`
- `Warning`
- `Info`

### `top_recommendation.category`
- `Voix & Debit`
- `Voix & Fluidite`
- `Presence & Regard`
- `Gestuelle`
- `Cadre & Posture`
- `Image & Lumiere`
- `Image & Nettete`
- `Maintien`

## 6. Coverage grid

The seed dataset must be intentionally balanced.

Minimum balancing axes:
- session quality
- recommendation category
- experience level
- current goal

### Session quality buckets
- weak
  - overall score `< 60`
- medium
  - overall score `60 to < 80`
- strong
  - overall score `>= 80`

### Initial target distribution

For the first seed version, aim for:
- 25% weak
- 45% medium
- 30% strong

This keeps the dataset realistic while still covering degraded cases well enough.

### Recommendation coverage

Each core category should appear multiple times:
- `Voix & Debit`
- `Voix & Fluidite`
- `Presence & Regard`
- `Gestuelle`
- `Cadre & Posture`
- `Image & Lumiere`
- `Image & Nettete`

`Maintien` should exist, but less often.

### Context coverage

Each of these should appear across multiple score profiles:
- `beginner`
- `intermediate`
- `advanced`

Each goal should appear across multiple categories:
- `general`
- `soutenance_pfe`
- `pitch`
- `entretien`

## 7. Row creation protocol

For each row:

1. start from the deterministic engine contract
2. choose a realistic context:
   - `experience_level`
   - `current_goal`
3. define coherent scores and metrics
4. derive strengths and weaknesses consistent with those metrics
5. define one top recommendation consistent with the deterministic policy
6. write targets grounded in that row only
7. check style constraints before keeping the row

## 8. Validation checklist per row

Before accepting a row, verify:
- schema is complete
- numeric values are realistic
- strengths do not contradict weaknesses
- `top_recommendation` matches the rest of the row
- `point_prioritaire` matches the top recommendation
- `bilan_global` is not generic
- `encouragement` is specific
- `vous` is used consistently

## 9. Dataset-level validation

Before expansion, check:
- no exact duplicate rows
- no near-duplicate targets for materially identical inputs
- no empty fields
- no null values
- no contradictory label pairs
- category coverage is balanced enough
- context coverage is balanced enough

## 10. Immediate next step

After this specification is accepted, the next action is:
- create `fine_tuning/data/seed/coach_dataset_seed_v2.jsonl`
- begin with a small manually curated batch
- review that batch before writing the full seed set
