import json
import logging
import re
from typing import List, Dict, Any, Optional
from metrics.schema import AudioMetrics, VisionMetrics, Scores, Recommendation

logger = logging.getLogger(__name__)

def clean_llm_output(text: str) -> str:
    """Agressively scrubs echoed labels, meta-text, and broken sentences."""
    # Remove meta-conversation but ONLY the prefix, not the rest of the line!
    text = re.sub(r'^(Je vais essayer(?:[^:\n]*?:)?\s*|Voici mon bilan(?:[^:\n]*?:)?\s*|En tant que SpeechCoach\,?\s*|Voici un bilan(?:[^:\n]*?:)?\s*|Bilan\s*:|Conseil\s*:|Motivation\s*:|Performance\s*:|Forces\s*:|Défis\s*:|Langue\s*:|Score\s*:|Point\s*:)', '', text, flags=re.IGNORECASE).strip()
    text = re.sub(r'^(Bilan|Conseil|Motivation|Analyse|Point)[ \-:]+', '', text, flags=re.IGNORECASE).strip()
    
    # Strip chat scaffolding common to 1B models
    text = re.sub(r'^(Here is|Voici|Je comprends|Merci|Bien sûr).*?:\s*', '', text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r'^["\']|["\']$', '', text.strip())
    
    lines = text.split('\n')
    cleaned_lines = []
    
    # Scrub specific starting patterns
    skip_patterns = [
        r'^\s*Score\s*[:\d]', r'^\s*Langue\s*[:A-Z]', r'^\s*Forces\s*[:\w]', 
        r'^\s*Défis\s*[:\w]', r'^\s*(Bilan|Conseil|Motivation|Analyse|Point)[^\w]',
        r'^\s*(En tant que|Je suis|Voici)[^\w]'
    ]
    
    for line in lines:
        line = line.strip()
        if not line: continue
        
        # If the line is purely one of the banned patterns, skip it.
        # But if it contains more text after the pattern, we should probably keep it, 
        # or better yet, the regex above already stripped the prefix for the first line.
        if any(re.match(p, line, re.IGNORECASE) for p in skip_patterns):
            # If the line is short (just the label), skip it.
            if len(line) < 30: continue
            # Else, it's a real sentence that happens to start with "Bilan", keep it.
            
        # Clean formatting
        line = line.replace('**', '').replace('*', '').strip()
        if line:
            cleaned_lines.append(line)
            
    res = " ".join(cleaned_lines).strip()
    
    # Truncate incomplete final sentences if they lack punctuation
    if res and not res[-1] in ['.', '!', '?']:
        res = re.sub(r'[^.!?]*$', '', res).strip()
        
    return res

def call_ollama_safe(model: str, system: str, user: str, temp: float = 0.3, limit: int = 200) -> str:
    """Helper for a single robust Ollama call."""
    try:
        import ollama
        res = ollama.chat(
            model=model,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            options={"temperature": temp, "num_predict": limit}
        )
        content = res['message']['content'].strip()
        return clean_llm_output(content)
    except Exception as e:
        logger.error(f"Ollama call failed: {e}")
        return ""

def generate_coaching_text(
    scores: Scores, strengths: List[str], weaknesses: List[str],
    recommendations: List[Recommendation], fetched_docs: List[Dict[str, Any]],
    language: str, model: str = "llama3.2", speaker_name: Optional[str] = None
) -> Optional[Dict[str, str]]:
    """
    v2.9.4 Ultra-Simple: One paragraph text completion, locked in French, no lists.
    """
    score = scores.overall_score
    
    # We lock the response language to French for UI consistency.
    lang = "français"
    
    # 1. BILAN (Ultra-simple completion)
    # Give it only 1 strength and 1 weakness to avoid lists.
    force = strengths[0] if strengths else 'voix'
    defi = weaknesses[0] if weaknesses else 'posture'
    
    sys_bilan = "Tu es un coach de prise de parole."
    user_bilan = f"Voici les résultats de ton élève : Score de {score}/100, Point fort ({force}), Point à améliorer ({defi}).\nRédige un paragraphe de 3 phrases en {lang} en t'adressant DIRECTEMENT à lui avec le mot 'vous'. Félicite-le pour son point fort et parle de son point faible avec bienveillance. Ne fais PAS de liste.\nRÈGLE : Ne dis JAMAIS 'Bonjour', 'Voici', 'Merci' ou 'Je comprends'. Commence directement par ton analyse."
    bilan = call_ollama_safe(model, sys_bilan, user_bilan, temp=0.3, limit=300)
    
    # 2. CONSEIL (Ultra-simple completion)
    fiche = fetched_docs[0]['content'][:250] if fetched_docs else "Utilisez des gestes ouverts."
    sys_conseil = "Tu es un coach expert."
    user_conseil = f"Ton élève a un problème de : {defi}.\nRessource : {fiche}.\nDonne-lui un seul conseil pratique tiré de cette ressource. Écris une seule phrase directe en {lang} en t'adressant directement à lui avec 'vous'.\nRÈGLE : Ne dis JAMAIS 'Bonjour', 'Voici', 'Merci' ou 'Je comprends'. Ne mets pas de guillemets. Commence directement par le conseil."
    conseil = call_ollama_safe(model, sys_conseil, user_conseil, temp=0.2, limit=200)
    
    # 3. MOTIVATION (Ultra-simple completion)
    sys_motiv = "Tu es motivateur."
    user_motiv = f"Rédige une phrase courte, inspirante et très motivante en {lang} adressée directement à ton élève (utilise 'vous').\nRÈGLE : Ne dis JAMAIS 'Bonjour', 'Voici', 'Merci' ou 'Je comprends'. Commence directement par la phrase."
    motiv = call_ollama_safe(model, sys_motiv, user_motiv, temp=0.6, limit=100)
    
    # Final Validation
    if not bilan or len(bilan) < 15: bilan = "Prestation analysée avec succès. Consultez les métriques ci-dessous pour plus de détails."
    if not conseil or len(conseil) < 15: conseil = "Gardez un rythme de parole posé et un bon contact visuel avec votre audience."
    if not motiv or len(motiv) < 5: motiv = "Continuez vos excellents efforts vers la progression !"
    
    return {
        "bilan_global": bilan,
        "point_prioritaire": conseil,
        "encouragement": motiv
    }
