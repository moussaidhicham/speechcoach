import sys
import os
import json
import random
from dataclasses import asdict

# Add backend root to sys.path to allow imports from app.*
# Assuming script is in fine_tuning/scripts/
root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend"))
sys.path.append(root)

# Try imports from the app package (root of backend)
try:
    from app.analytics.engine.metrics.scoring import calculate_scores, generate_feedback_summary
    from app.analytics.engine.metrics.recommendations import generate_recommendations
    from app.analytics.engine.metrics.schema import AudioMetrics, VisionMetrics, Scores
    print("Backend engine modules loaded successfully.")
except ImportError as e:
    print(f"Error loading backend modules: {e}")
    sys.exit(1)

def get_random_source(category):
    """Real snippets from knowledge_base.json for total loyalty."""
    SOURCES = {
        "Voix & Debit": "Parler trop vite (plus de 160 mots par minute) fatigue le cerveau de ceux qui vous ecoutent et donne une impression de stress.",
        "Voix & Fluidite": "Les 'euh' et autres tics verbaux sont des bequilles utilisees par le cerveau lorsqu'il cherche ses mots. Le secret pour les reduire est d'accepter le silence.",
        "Presence & Regard": "Regarder l'ecran au lieu de l'objectif de la camera casse l'illusion du contact visuel en visioconference ou en video enregistree.",
        "Gestuelle": "Une presentation avec les bras ballants ou caches manque d'energie. Les mains sont essentielles pour appuyer la structure du discours.",
        "Cadre & Posture": "Un mauvais cadrage (front coupe, trop de vide au-dessus de la tete) donne un rendu amateur.",
        "Image & Lumiere": "Une video trop sombre ou a contre-jour distrait l'attention et reduit la qualite visuelle globale.",
        "Image & Nettete": "Un mauvais eclairage peut aussi rendre l'image plus floue a cause du bruit numerique."
    }
    return SOURCES.get(category, "La regularite et la pratique sont les cles d'une progression durable.")

def generate_engine_scenarios():
    experience_levels = ["beginner", "intermediate", "advanced"]
    goals = ["pitch", "soutenance_pfe", "entretien_embauche", "general"]
    
    # Define 15 pedagogical cases with emphasis on HARD coaching
    SCENARIO_TEMPLATES = [
        # --- HARD CASES (Top Priority for this batch) ---
        {"name": "Total Disaster", "audio": {"wpm": (70, 95), "filler": (8, 15), "stutter": (5, 10)}, "vision": {"eye": (0.05, 0.25), "face": (0.2, 0.5), "hands_vis": (0, 0.1), "bright": 40}},
        {"name": "Anxiety Spike", "audio": {"wpm": (195, 225), "filler": (5, 10)}, "vision": {"eye": (0.1, 0.3), "hands_act": (9.0, 10.0), "hands_vis": 0.8}},
        {"name": "Tech/Setup Fail", "audio": {"wpm": 140}, "vision": {"face": 0.3, "bright": (20, 45), "blur": (5, 15)}},
        {"name": "Mumble/Low Energy", "audio": {"wpm": (80, 100), "stutter": 4, "pause": 10}, "vision": {"eye": 0.4, "hands_vis": 0}},
        {"name": "Hyper-Agitated", "audio": {"wpm": (180, 200)}, "vision": {"hands_act": 10.0, "eye": 0.1, "face": 0.6}},
        
        # --- MEDIUM/STANDARD CASES ---
        {"name": "Fast Voice Only", "audio": {"wpm": (185, 205)}, "vision": {"eye": 0.8, "face": 0.95}},
        {"name": "Slow Voice Only", "audio": {"wpm": (90, 105)}, "vision": {"eye": 0.8, "face": 0.95}},
        {"name": "Shy Eyes", "audio": {"wpm": 140}, "vision": {"eye": (0.2, 0.4), "face": 0.95}},
        {"name": "Static Speaker", "audio": {"wpm": 140}, "vision": {"hands_vis": (0.0, 0.1)}},
        {"name": "Hesitant", "audio": {"wpm": 135, "filler": (5, 8)}, "vision": {"eye": 0.8}},
        
        # --- SUCCESS CASES ---
        {"name": "High Mastery", "audio": {"wpm": (135, 145), "filler": 0}, "vision": {"eye": (0.92, 0.98), "face": 0.98, "hands_act": 4.5, "hands_vis": 0.7, "bright": 150, "blur": 100}},
        {"name": "Solid Performer", "audio": {"wpm": 140, "filler": 1}, "vision": {"eye": 0.85, "face": 0.9, "hands_vis": 0.5}}
    ]
    
    scenarios = []
    
    # We will generate 3 experience levels * 4 goals * 12 scenarios = 144 scenarios
    # With 5/12 being "Hard", we get 60 Hard cases. Perfect.
    
    for lvl in experience_levels:
        for goal in goals:
            for template in SCENARIO_TEMPLATES:
                def get_val(v):
                    if isinstance(v, tuple): return random.uniform(v[0], v[1])
                    return v

                audio = AudioMetrics(
                    wpm=get_val(template["audio"].get("wpm", 140.0)),
                    filler_count=int(get_val(template["audio"].get("filler", 0))),
                    stutter_count=int(get_val(template["audio"].get("stutter", 0))),
                    pause_count=int(get_val(template["audio"].get("pause", 2))),
                    total_duration=60.0
                )
                
                vision = VisionMetrics(
                    eye_contact_ratio=get_val(template["vision"].get("eye", 0.8)),
                    face_presence_ratio=get_val(template["vision"].get("face", 0.95)),
                    hands_visibility_ratio=get_val(template["vision"].get("hands_vis", 0.4)),
                    hands_activity_score=get_val(template["vision"].get("hands_act", 5.0)),
                    avg_brightness=get_val(template["vision"].get("bright", 120)),
                    avg_blur=get_val(template["vision"].get("blur", 100))
                )
                
                # RUN REAL ENGINE LOGIC
                scores = calculate_scores(audio, vision)
                strengths, weaknesses = generate_feedback_summary(scores, audio, vision)
                recs = generate_recommendations(audio, vision, scores)
                
                top_rec = recs[0] if recs else None
                
                scenarios.append({
                    "session_context": {
                        "experience_level": lvl,
                        "current_goal": goal
                    },
                    "scores": asdict(scores),
                    "strengths": strengths,
                    "weaknesses": weaknesses,
                    "top_recommendation": asdict(top_rec) if top_rec else {},
                    "pedagogical_source": get_random_source(top_rec.category if top_rec else "")
                })

    output_path = os.path.join(os.path.dirname(__file__), "..", "data", "seed", "archetypes_engine.json")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(scenarios, f, indent=2, ensure_ascii=False)
    
    print(f"Generated {len(scenarios)} engine-loyal scenarios in {output_path}")

if __name__ == "__main__":
    generate_engine_scenarios()
