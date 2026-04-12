import json
import ollama

def test_model():
    model_name = "speechcoach"
    system_prompt = (
        "Tu es un coach de prise de parole. "
        "Tu dois repondre uniquement en JSON valide. "
        "Tu dois toujours utiliser exactement ces 3 cles : "
        "bilan_global, point_prioritaire, encouragement. "
        "N'utilise jamais d'autres cles. "
        "Ne rajoute aucun texte avant ou apres le JSON. "
        "Tu reponds en francais simple, professionnel, toujours avec 'vous'. "
        "Tu restes concret, sobre et directement lie aux signaux fournis."
    )
    
    # Test case: Low score scenario (Hard Coaching)
    user_input = (
        "Score global: 45\n"
        "Voix: 4.2/10\n"
        "Presence: 3.5/10\n"
        "Corps: 5.0/10\n"
        "Scene: 6.0/10\n"
        "Points forts: Quelques gestes naturels detectes.\n"
        "Axes de progression: Debit trop rapide (195 mots/minute). | Regard fuyant (20%). | Image tres sombre.\n"
        "Top recommandation: Voix & Debit\n"
        "Message: Votre debit de parole est beaucoup trop rapide.\n"
        "Conseil actionnable: Marquez des pauses claires entre vos idees pour reprendre votre souffle."
    )

    print(f"--- Sending request to model: {model_name} ---")
    try:
        response = ollama.chat(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_input}
            ],
            options={"temperature": 0.2, "num_predict": 220}
        )
        
        content = response['message']['content'].strip()
        print("\n--- RAW OUTPUT ---")
        print(content)
        
        # Try to parse JSON
        try:
            data = json.loads(content)
            print("\n--- PARSED JSON ---")
            print(json.dumps(data, indent=2, ensure_ascii=False))
            
            # Validation
            keys = set(data.keys())
            required = {"bilan_global", "point_prioritaire", "encouragement"}
            if keys == required:
                print("\n[SUCCESS] VALIDATION OK: All required keys present.")
            else:
                print(f"\n[ERROR] VALIDATION ERROR: Keys mismatch. Got {keys}")
                
        except json.JSONDecodeError:
            print("\n[ERROR] JSON ERROR: The output is not valid JSON.")
            
    except Exception as e:
        print(f"\n[ERROR] ERROR calling Ollama: {e}")

if __name__ == "__main__":
    test_model()
