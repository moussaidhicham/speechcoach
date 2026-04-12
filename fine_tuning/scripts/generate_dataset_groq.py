import json
import os
import time
import sys
import requests
from typing import List, Dict, Any

# API Configuration
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
MODEL_NAME = "llama-3.3-70b-versatile"

def serialize_prompt_for_llm(inp: Dict[str, Any]) -> str:
    """Mirrors _build_prompt_payload from agent_coach.py exactly."""
    scores = inp.get("scores", {})
    strengths = inp.get("strengths", [])
    weaknesses = inp.get("weaknesses", [])
    rec = inp.get("top_recommendation", {})
    ctx = inp.get("session_context", {})
    
    # In some engine outputs, scores are a dictionary, in others an object
    # The archetypes_engine.json uses a dictionary
    
    top_category = rec.get("category", "Général")
    top_message = rec.get("message", weaknesses[0] if weaknesses else "Amélioration continue")
    top_tip = rec.get("actionable_tip", "Continuez vos efforts.")
    
    strengths_text = " | ".join(strengths[:3]) if strengths else "Aucun point fort explicite."
    weaknesses_text = " | ".join(weaknesses[:3]) if weaknesses else top_message
    
    pedagogical_source = str(inp.get("pedagogical_source", "")).strip()[:240]
    normalized_level = ctx.get("experience_level", "non renseigne")
    normalized_goal = ctx.get("current_goal", "general")

    prompt = (
        f"Score global: {scores.get('overall_score', 0.0)}\n"
        f"Voix: {scores.get('voice_score', 0.0)}/10\n"
        f"Presence: {scores.get('presence_score', 0.0)}/10\n"
        f"Corps: {scores.get('body_language_score', 0.0)}/10\n"
        f"Scene: {scores.get('scene_score', 0.0)}/10\n"
        f"Points forts: {strengths_text}\n"
        f"Axes de progression: {weaknesses_text}\n"
        f"Top recommandation: {top_category}\n"
        f"Message: {top_message}\n"
        f"Conseil actionnable: {top_tip}\n"
        f"Niveau utilisateur: {normalized_level}\n"
        f"Objectif utilisateur: {normalized_goal}\n"
        f"Source pedagogique: {pedagogical_source or 'Non fournie'}"
    )
    return prompt

def call_groq(system_prompt: str, user_prompt: str) -> str:
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.2,
        "response_format": {"type": "json_object"}
    }
    
    for attempt in range(3):
        try:
            response = requests.post(url, headers=headers, json=data, timeout=30)
            if response.status_code != 200:
                print(f"Groq API Error {response.status_code}: {response.text}")
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]
        except Exception as e:
            if "response" in locals() and response is not None:
                print(f"Groq API Error Detail: {response.text}")
            print(f"Groq API Error (Attempt {attempt+1}): {e}")
            time.sleep(2)
    return ""

def build_prompts(input_data: Dict[str, Any]):
    system = (
        "Tu es un coach de prise de parole. "
        "Tu dois repondre uniquement en JSON valide. "
        "Tu dois toujours utiliser exactement ces 3 cles : "
        "bilan_global, point_prioritaire, encouragement. "
        "N'utilise jamais d'autres cles. "
        "Ne rajoute aucun texte avant ou apres le JSON. "
        "bilan_global doit contenir entre 2 et 4 phrases courtes. "
        "point_prioritaire doit contenir exactement 1 phrase courte. "
        "encouragement doit contenir exactement 1 phrase courte. "
        "Tu reponds en francais simple, professionnel, toujours avec 'vous'. "
        "Tu restes concret, sobre et directement lie aux signaux fournis. "
        "Tu n'utilises jamais de formulations lyriques, generiques ou grandiloquentes."
    )
    
    # Format input for LLM to mirror production
    user = serialize_prompt_for_llm(input_data)
    return system, user

def process_scenarios(input_file: str, output_file: str, is_jsonl=False):
    print(f"Processing {input_file} -> {output_file}")
    
    inputs = []
    if is_jsonl:
        with open(input_file, "r", encoding="utf-8-sig") as f:
            for line in f:
                if line.strip():
                    data = json.loads(line)
                    # For real sessions, the input is under "input" key
                    inputs.append(data.get("input", data))
    else:
        with open(input_file, "r", encoding="utf-8-sig") as f:
            inputs = json.load(f)

    # Process in batches to avoid rate limits
    results = []
    total = len(inputs)
    
    with open(output_file, "w", encoding="utf-8") as out_f:
        for i, inp in enumerate(inputs):
            print(f"[{i+1}/{total}] Generating for: {inp.get('scores', {}).get('overall_score')}...")
            
            system, user = build_prompts(inp)
            raw_target = call_groq(system, user)
            
            if raw_target:
                try:
                    target = json.loads(raw_target)
                    # We store the serialized string in "input" to match reality
                    example = {
                        "input": serialize_prompt_for_llm(inp),
                        "target": target
                    }
                    out_f.write(json.dumps(example, ensure_ascii=False) + "\n")
                    results.append(example)
                except Exception as e:
                    print(f"JSON Parse Error for row {i+1}: {e}")
            
            # Small sleep to respect rate limits (Groq Free Tier is roughly 30 RPM)
            time.sleep(2.5)

    print(f"Successfully generated {len(results)} examples.")

if __name__ == "__main__":
    # 1. Process real sessions (Calibration)
    real_sessions = "fine_tuning/data/intermediate/seed_inputs_from_real_sessions.jsonl"
    if os.path.exists(real_sessions):
        process_scenarios(real_sessions, "fine_tuning/data/seed/dataset_v2_real.jsonl", is_jsonl=True)
    
    # 2. Process synthetic archetypes
    archetypes = "fine_tuning/data/seed/archetypes_engine.json"
    if os.path.exists(archetypes):
        process_scenarios(archetypes, "fine_tuning/data/seed/dataset_v2_synthetic.jsonl", is_jsonl=False)
    
    # 3. Merge
    print("Merging datasets into coach_dataset_v2.jsonl...")
    final_file = "fine_tuning/data/seed/coach_dataset_v2.jsonl"
    with open(final_file, "w", encoding="utf-8") as out_f:
        for src in ["fine_tuning/data/seed/dataset_v2_real.jsonl", "fine_tuning/data/seed/dataset_v2_synthetic.jsonl"]:
            if os.path.exists(src):
                with open(src, "r", encoding="utf-8") as in_f:
                    for line in in_f:
                        out_f.write(line)
    
    print(f"Dataset complete: {final_file}")
