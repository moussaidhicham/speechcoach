"""
Quick test to verify Ollama LLM is working end-to-end with our Agent Coach.
"""
from metrics.schema import AudioMetrics, VisionMetrics, Scores, Recommendation
from metrics.scoring import calculate_scores
from metrics.recommendations import generate_recommendations
import logging
logging.basicConfig(level=logging.INFO)
from agent.agent_coach import generate_coaching_text

# Simulate the same metrics as the Test6 video
audio = AudioMetrics(wpm=117, filler_count=2, pause_count=11)
vision = VisionMetrics(
    face_presence_ratio=0.58,
    eye_contact_ratio=0.54,
    hands_visibility_ratio=0.0,
    hands_activity_score=0.0,
    avg_brightness=125,
    avg_blur=9
)
scores = calculate_scores(audio, vision)
from metrics.scoring import generate_feedback_summary
strengths, weaknesses = generate_feedback_summary(scores, audio, vision)
recs = generate_recommendations(audio, vision, scores)

# Simulate fetched docs (like the ones we retrieved from FAISS previously)
fetched_docs = [
    {
        "title": "Débloquer une posture figée",
        "category": "Gestuelle",
        "content": "Une présentation avec les bras ballants ou cachés manque d'énergie...\n\n**Exercice Pratique : La pyramide des mains**\n1. Adoptez la position 'pyramide' ouverte.\n2. Utilisez cette position comme point de repos.\n3. Ouvrez les mains sur les points importants."
    }
]

print(f"Calling Ollama (Agent Coach) for coaching on scores: {scores.overall_score}/100...")
print("(This may take ~20-60 seconds on first call as the model loads into RAM)\n")

result = generate_coaching_text(
    scores=scores,
    strengths=strengths,
    weaknesses=weaknesses,
    recommendations=recs,
    fetched_docs=fetched_docs,
    language="en",
    model="llama3.2"
)

if result:
    print("SUCCESS! LLM Agent response:")
    print(f"\n🤖 Bilan Global:\n{result['bilan_global']}")
    print(f"\n📍 Point Prioritaire:\n{result['point_prioritaire']}")
    print(f"\n💡 Encouragement:\n{result['encouragement']}")
else:
    print("FAILED: Agent returned None. Check that 'ollama serve' is running.")
