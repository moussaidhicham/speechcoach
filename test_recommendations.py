from metrics.schema import AudioMetrics, VisionMetrics, Scores
from metrics.scoring import calculate_scores
from metrics.recommendations import generate_recommendations, generate_training_plan
try:
    from rag.retriever import RAGRetriever
    retriever = RAGRetriever()
except ImportError:
    retriever = None
    print("WARNING: RAG Retriever not loaded.")

def run_test():
    print("--- Test Case 1: Bad Setup (Slow WPM, No Eye Contact, Blurry) ---")
    
    audio = AudioMetrics(wpm=90, filler_count=6, pause_count=8)
    vision = VisionMetrics(
        face_presence_ratio=0.7, 
        eye_contact_ratio=0.2, 
        hands_visibility_ratio=0.1, 
        hands_activity_score=0.5,
        avg_brightness=50,
        avg_blur=8
    )
    
    scores = calculate_scores(audio, vision)
    print(f"Overall Score: {scores.overall_score}/100")
    
    recs = generate_recommendations(audio, vision, scores)
    for i, rec in enumerate(recs, 1):
        print(f"\nRec {i}: [{rec.severity}] {rec.category}")
        print(f"   Message: {rec.message}")
        print(f"   Tip: {rec.actionable_tip}")
        
    print("\n--- Training Plan ---")
    print(generate_training_plan(recs))
    
    print("\n--- RAG Retrieval ---")
    if retriever and recs:
        query = f"{recs[0].category} {recs[0].message}"
        docs = retriever.retrieve(query, top_k=2)
        for d in docs:
            print(f"📄 {d['title']}")
            print(f"   {d['content'][:100]}...")
    
    
    print("\n\n--- Test Case 2: Good Setup (Good WPM, Gestures, but too many fillers) ---")
    audio2 = AudioMetrics(wpm=140, filler_count=12, pause_count=3)
    vision2 = VisionMetrics(
        face_presence_ratio=0.95, 
        eye_contact_ratio=0.8, 
        hands_visibility_ratio=0.6, 
        hands_activity_score=5.0,
        avg_brightness=150,
        avg_blur=200
    )
    
    scores2 = calculate_scores(audio2, vision2)
    print(f"Overall Score: {scores2.overall_score}/100")
    
    recs2 = generate_recommendations(audio2, vision2, scores2)
    for i, rec in enumerate(recs2, 1):
        print(f"\nRec {i}: [{rec.severity}] {rec.category}")
        print(f"   Message: {rec.message}")
        print(f"   Tip: {rec.actionable_tip}")
        
    print("\n--- Training Plan ---")
    print(generate_training_plan(recs2))

if __name__ == "__main__":
    run_test()
