# Step 2 - Batch 1 Curation

Source file:
- `fine_tuning/data/intermediate/seed_inputs_from_real_sessions.jsonl`

Current export:
- 14 usable rows

Important limitation:
- all current rows share the same context:
  - `experience_level = advanced`
  - `current_goal = pitch`

This means the batch is good for starting target writing, but it is **not** yet a balanced seed dataset.

## Keep for first manual target-writing batch

These rows give the best initial variety in severity and recommendation type.

1. `8_Almost_Perfect_V3.mp4`
- strong session
- top recommendation: `Voix & Debit`
- severity: `Warning`
- useful because it covers the high-score / light-correction case

2. `6_Talking_Really_Slow.mp4`
- medium session
- top recommendation: `Voix & Debit`
- severity: `Critical`
- useful because it covers slow speech rather than fast speech

3. `5_Talking_Really_Fast.mp4`
- medium session
- top recommendation: `Voix & Debit`
- severity: `Critical`
- useful because it is a strong fast-speech case

4. `4_Not_Looking_At_camera.mp4`
- weak session
- top recommendation: `Presence & Regard`
- severity: `Critical`
- useful because the visual issue is dominant and severe

5. `2_Face_Not_visible.mp4`
- medium session
- top recommendation: `Cadre & Posture`
- severity: `Critical`
- useful because it gives a setup/framing case instead of only speaking-rate issues

6. `French_Hesitations.webm`
- weak session
- top recommendation: `Presence & Regard`
- strong hesitation/repetition context
- useful because it combines visual weakness and clear audio disfluency signals

7. `English_Hesitations.mp4`
- weak-medium session
- top recommendation: `Presence & Regard`
- hesitation/repetition context in English
- useful because it differs from the French case in severity and counts

8. `Arabic_Hesitatios.mp4`
- weak session
- top recommendation: `Voix & Debit`
- strong hesitation/repetition context in Arabic-derived analysis
- useful because it covers the slow + disfluency case

## Keep as optional reserve rows

These are usable, but more redundant for the first writing pass.

- `7_Almost_Perfect_V2.mp4`
  - close to other fast-speech rows

- `3_Hands_Not_visible.mp4`
  - useful later, but top recommendation is still `Voix & Debit`

- `1_Almost_Perfect.mp4`
  - useful later, but overlaps heavily with other fast-speech pitch sessions

- `SmartPhone.mp4`
  - useful later for realism, but device type is not part of the current training schema

- `IPad.mp4`
  - same note as smartphone; useful later, but not first-priority for the current schema

- `PC.mp4`
  - same note as smartphone/tablet; still mostly another fast-speech case

## Coverage gaps still missing

Before calling the seed dataset balanced, we still need future rows for:
- `experience_level = beginner`
- `experience_level = intermediate`
- `current_goal = general`
- `current_goal = soutenance_pfe`
- `current_goal = entretien`
- top recommendation = `Voix & Fluidite`
- top recommendation = `Gestuelle`
- top recommendation = `Image & Lumiere`
- top recommendation = `Image & Nettete`
- top recommendation = `Maintien`

## Recommended next move

Use the 8 kept rows above to write the first manual target batch.

After that:
- review target quality;
- then collect or generate additional real sessions to fill the missing contexts and categories.
