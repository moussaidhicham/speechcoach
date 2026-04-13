import json
import logging
import re
from typing import Any, Dict, List, Optional, Tuple

from app.analytics.engine.metrics.schema import Recommendation, Scores

logger = logging.getLogger(__name__)


def clean_llm_output(text: str) -> str:
    text = (text or "").strip()
    if not text:
        return ""
    text = re.sub(r'^["\']|["\']$', "", text)
    text = text.replace("\r", "\n")
    lines = [line.strip().replace("**", "") for line in text.split("\n") if line.strip()]
    return " ".join(lines).strip()


def _apply_text_replacements(text: str) -> str:
    cleaned = text or ""
    replacements = {
        "Veuillez marquer": "Marquez",
        "Veuillez ajuster": "Ajustez",
        "Veuillez regarder": "Regardez",
        "Veuillez replacer": "Replacez",
        "Veuillez revenir": "Revenez",
        "clartet": "clarte",
        "clarté": "clarte",
        "ameliora tion": "amelioration",
        "bénil": "point faible",
        "b�nil": "point faible",
        "structur�": "structuree",
        "r�duite": "reduite",
        "pr�sentation": "presentation",
        "pr�sence": "presence",
        "expressi on": "expression",
    }
    for source, target in replacements.items():
        cleaned = cleaned.replace(source, target)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def call_ollama_safe(model: str, system: str, user: str, temp: float = 0.2, limit: int = 220) -> str:
    try:
        import ollama

        response = ollama.chat(
            model=model,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            options={"temperature": temp, "num_predict": limit},
        )
        content = response["message"]["content"].strip()
        logger.info("Ollama coaching output (%s): %s", model, content.replace("\n", " | "))
        return clean_llm_output(content)
    except Exception as error:
        logger.error("Ollama call failed for model %s: %s", model, error)
        return ""


def call_groq_safe(model: str, system: str, user: str, temp: float = 0.2, limit: int = 220) -> str:
    import requests
    import os
    
    # Bypass cache by reading .env directly
    try:
        from dotenv import dotenv_values
        config = dotenv_values(".env")
        api_key = config.get("GROQ_API_KEY")
    except Exception:
        api_key = os.environ.get("GROQ_API_KEY")

    if not api_key:
        logger.error("GROQ_API_KEY not found in environment.")
        return ""

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": "SpeechCoach-App/1.0"
    }
    
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user}
        ],
        "temperature": temp,
        "max_tokens": limit,
        "response_format": {"type": "json_object"}
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=20)
        if response.status_code != 200:
            logger.error("Groq API error: status %s, %s", response.status_code, response.text)
            logger.error("Groq API error: %s", response.text)
            return ""
            
        result = response.json()
        content = result["choices"][0]["message"]["content"].strip()
        logger.info("Groq coaching output (%s): %s", model, content.replace("\n", " | "))
        return clean_llm_output(content)
    except Exception as error:
        logger.error("Groq connection error: %s", error)
        logger.error("Groq call failed: %s", error)
        return ""


def _top_strength(strengths: List[str]) -> str:
    return strengths[0] if strengths else "la clarte generale du discours"


def _top_recommendation(recommendations: List[Recommendation], weaknesses: List[str]) -> Tuple[str, str, str]:
    if recommendations:
        rec = recommendations[0]
        return rec.category, rec.message, rec.actionable_tip
    if weaknesses:
        return "Progression generale", weaknesses[0], "Concentrez-vous sur le point le plus fragile de cette session."
    return "Progression generale", "Quelques ajustements restent utiles.", "Concentrez-vous sur un seul axe a la fois."


def _strength_anchor(strength: str) -> str:
    lowered = strength.lower()
    if "discours clair" in lowered or "tics de langage" in lowered:
        return "Votre discours est clair et facile a suivre."
    if "contact visuel" in lowered:
        return "Votre regard vers la camera constitue deja un point fort."
    if "gestuelle" in lowered:
        return "Votre gestuelle est deja bien tenue."
    if "rythme vocal" in lowered or "debit" in lowered:
        return "Votre rythme vocal est deja bien maitrise."
    return "La base de votre prise de parole est deja solide."


def _weakness_summary(message: str) -> str:
    lowered = message.lower()
    if "trop rapide" in lowered or "un peu trop rapide" in lowered:
        return "Le point principal a travailler reste un debit trop rapide."
    if "trop lent" in lowered:
        return "Le point principal a travailler reste un debit encore trop lent."
    if "contact visuel" in lowered or "regard camera" in lowered or "regard" in lowered:
        return "Le point principal a travailler reste la regularite du regard vers la camera."
    if "mots parasites" in lowered or "hesitations" in lowered:
        return "Le point principal a travailler reste la fluidite de la parole."
    if "mains" in lowered or "gestes" in lowered or "gestuelle" in lowered:
        return "Le point principal a travailler reste la maitrise de la gestuelle."
    if "cadre" in lowered or "visage" in lowered:
        return "Le point principal a travailler reste la stabilite du cadrage."
    if "floue" in lowered or "nettete" in lowered or "lumiere" in lowered or "sombre" in lowered:
        return "Le point principal a travailler reste la qualite visuelle de l'image."
    return "Le point principal a travailler reste la regularite generale de la prestation."


def build_bilan(scores: Scores, strengths: List[str], recommendations: List[Recommendation], weaknesses: List[str]) -> str:
    del scores
    strength = _top_strength(strengths)
    _, message, _ = _top_recommendation(recommendations, weaknesses)
    return f"{_strength_anchor(strength)} {_weakness_summary(message)}"


def build_priority(recommendations: List[Recommendation], weaknesses: List[str]) -> str:
    _, _, tip = _top_recommendation(recommendations, weaknesses)
    return tip


def build_encouragement(strengths: List[str], recommendations: List[Recommendation], weaknesses: List[str]) -> str:
    strength = _top_strength(strengths)
    category, message, _ = _top_recommendation(recommendations, weaknesses)
    lowered = f"{category} {message}".lower()
    if "voix" in lowered or "debit" in lowered or "fluidite" in lowered:
        return "La base est solide ; un rythme plus pose rendra votre message encore plus facile a suivre."
    if "regard" in lowered or "presence" in lowered:
        return "Votre prise de parole est deja claire ; un regard plus regulier renforcera encore votre presence."
    if "gestuelle" in lowered or "posture" in lowered or "mains" in lowered:
        return "Votre message est deja lisible ; une gestuelle plus stable lui donnera encore plus d'impact."
    if "image" in lowered or "lumiere" in lowered or "nettete" in lowered or "cadre" in lowered:
        return "Le contenu est deja solide ; une image plus propre renforcera encore l'impression generale."
    if "discours clair" in strength.lower():
        return "Votre discours est deja clair ; en travaillant un seul axe a la fois, la progression restera nette."
    return "La base est bonne ; en travaillant un seul axe a la fois, la progression restera visible."


def _sentence_count(text: str) -> int:
    chunks = [chunk.strip() for chunk in re.split(r"[.!?]+", text or "") if chunk.strip()]
    return len(chunks)


def _validate_and_sanitize(text: str, fallback: str) -> str:
    if not text or len(text) < 15:
        return fallback

    cleaned = _apply_text_replacements(clean_llm_output(text))
    lowered = cleaned.lower()

    tutoiement_patterns = [
        r"\btu\b",
        r"\bton\b",
        r"\bta\b",
        r"\btes\b",
        r"\btoi\b",
        r"\bt'a\b",
        r"\bt'es\b",
        r"\bfais\b",
        r"\btravaille\b",
        r"\bconcentre-toi\b",
    ]
    if any(re.search(pattern, lowered) for pattern in tutoiement_patterns):
        return fallback

    if cleaned[-1] not in ".!?":
        cleaned = cleaned + "."
    return cleaned


def _needs_more_specific_bilan(text: str) -> bool:
    lowered = (text or "").lower()
    vague_patterns = [
        "concerne le debit de parole",
        "concerne la presentation",
        "concerne la voix",
        "concerne le regard",
        "concerne la gestuelle",
    ]
    return any(pattern in lowered for pattern in vague_patterns)


def _is_bad_bilan(text: str) -> bool:
    if not text or len(text) < 30:
        return True
    return False


def _is_bad_priority(text: str, tip_seed: str) -> bool:
    del tip_seed
    if not text or len(text) < 15:
        return True
    return False


def _is_bad_encouragement(text: str) -> bool:
    if not text or len(text) < 15:
        return True
    return False


def _resolve_backend() -> str:
    from app.core.config import settings
    configured = (settings.SPEECHCOACH_COACHING_BACKEND or "").strip().lower()
    return configured or "ollama"


def _extract_json_payload(text: str) -> Optional[Dict[str, Any]]:
    if not text:
        return None
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None

    candidate = text[start : end + 1]
    try:
        payload = json.loads(candidate)
    except json.JSONDecodeError:
        return None

    if not isinstance(payload, dict):
        return None
    return payload


def _build_prompt_payload(
    scores: Scores,
    strengths: List[str],
    weaknesses: List[str],
    recommendations: List[Recommendation],
    fetched_docs: List[Dict[str, Any]],
    language: str = "fr",
    experience_level: Optional[str] = None,
    current_goal: Optional[str] = None,
    history_context: str = "Aucun historique disponible."
) -> Tuple[str, str]:
    top_category, top_message, top_tip = _top_recommendation(recommendations, weaknesses)
    strengths_text = " | ".join(strengths[:3]) if strengths else "Bases de présentation correctes."
    weaknesses_text = " | ".join(weaknesses[:2]) if weaknesses else top_message
    
    # Enrich from RAG
    pedagogical_info = ""
    if fetched_docs:
        doc = fetched_docs[0]
        title = doc.get("title", "Technique sans titre")
        content = doc.get("content", "")
        steps = " | ".join(doc.get("exercise_steps", []))
        pedagogical_info = f"Technique: {title}\nThéorie: {content}\nÉtapes suggérées: {steps}"

    normalized_level = (experience_level or "Beginner").strip()
    normalized_goal = (current_goal or "Général").strip()

    system = (
        "Vous êtes le 'Master Coach' de SpeechCoach, un expert certifié en communication (Toastmasters International). "
        "Votre mission est de transformer des chiffres bruts en un parcours d'entraînement puissant. "
        "Répondez exclusivement au format JSON strict avec ces 5 clés : "
        "bilan_global, point_prioritaire, encouragement, exercice_titre, exercice_consigne. "
        "DIRECTIVES PÉDAGOGIQUES : "
        "1. Ton : Professionnel, bienveillant, humain. Vouvoiement obligatoire. "
        "2. Langage : Interdiction totale du jargon technique (pas de 'WPM', dites 'mots par minute'). "
        "3. Bilan : Mentionnez la TENDANCE basée sur l'historique (progression ou stagnation). "
        "4. Exercice Universel : Concevez un exercice de 5 minutes SANS support. Ne copiez JAMAIS mot pour mot la source pédagogique ! INVENTEZ à chaque fois un scénario pratique, créatif et unique adapté. "
        "5. Format Exercice : 'exercice_titre' (court), 'exercice_consigne' DOIT ÊTRE UN TABLEAU JSON DE STRING comprenant EXACTEMENT 3 étapes. Exemple: [\"Faites X.\", \"Dites Y.\", \"Vérifiez Z.\"].\n"
        "6. Adaptation Linguistique : Rédigez le texte global en FRANÇAIS. Mais si vous donnez des exemples de mots (mots de liaison, tics linguistiques), ils DOIVENT ABSOLUMENT être dans la LANGUE DE LA VIDÉO."
    )
    user = (
        f"--- CONTEXTE UTILISATEUR ---\n"
        f"Niveau: {normalized_level} | Objectif: {normalized_goal}\n"
        f"Langue de la Vidéo: {language.upper() if language else 'FR'}\n"
        f"Historique/Tendance: {history_context}\n\n"
        f"--- MÉTRIQUES ACTUELLES ---\n"
        f"Score: {int(round(scores.overall_score))}/100\n"
        f"Points forts: {strengths_text}\n"
        f"Défauts: {weaknesses_text}\n\n"
        f"--- SOURCE PÉDAGOGIQUE (RAG) ---\n"
        f"{pedagogical_info or 'Utilisez votre expertise générale.'}"
    )
    return system, user


def _generate_with_model(system: str, user: str, model_name: str) -> str:
    from app.analytics.engine.agent.agent_coach import _resolve_backend, call_groq_safe, call_ollama_safe
    backend = _resolve_backend()
    
    logger.info("AI ENGINE | %s | %s", backend.upper(), model_name)

    if backend == "groq":
        return call_groq_safe(model_name, system, user, temp=0.6, limit=1000) # Increased limit and temp for creativity
    elif backend != "ollama":
        logger.warning("Unsupported coaching backend '%s'. Falling back to Ollama.", backend)
    return call_ollama_safe(model_name, system, user, temp=0.6, limit=1000)


def generate_coaching_text(
    scores: Scores,
    strengths: List[str],
    weaknesses: List[str],
    recommendations: List[Recommendation],
    fetched_docs: List[Dict[str, Any]],
    language: str,
    model: str = "",
    experience_level: Optional[str] = None,
    current_goal: Optional[str] = None,
    history_context: str = "Première session."
) -> Optional[Dict[str, str]]:

    from app.core.config import settings
    default_model = settings.SPEECHCOACH_LLM_MODEL or "llama-3.3-70b-versatile"
    model_name = model or default_model

    # Minimal fallbacks - deterministic strings improved for robust wording
    fallback_bilan = build_bilan(scores, strengths, recommendations, weaknesses)
    fallback_priority = build_priority(recommendations, weaknesses)
    fallback_encouragement = build_encouragement(strengths, recommendations, weaknesses)
    fallback_ex_titre = "Mission : Pratique Ciblée"
    fallback_ex_consigne = "Focalisez votre attention sur votre axe de progression principal durant 2 minutes de parole libre."

    system, user = _build_prompt_payload(
        scores,
        strengths,
        weaknesses,
        recommendations,
        fetched_docs,
        language=language,
        experience_level=experience_level,
        current_goal=current_goal,
        history_context=history_context
    )

    try:
        raw_output = _generate_with_model(system, user, model_name)
    except Exception as error:
        logger.error("Coaching generation failed: %s", error)
        raw_output = ""

    payload = _extract_json_payload(raw_output)
    if payload is None:
        return {
            "bilan_global": fallback_bilan,
            "point_prioritaire": fallback_priority,
            "encouragement": fallback_encouragement,
            "exercice_titre": fallback_ex_titre,
            "exercice_consigne": fallback_ex_consigne
        }

    # Sanitize and Validate
    bilan = _validate_and_sanitize(str(payload.get("bilan_global", "")).strip(), fallback_bilan)
    priority = _validate_and_sanitize(str(payload.get("point_prioritaire", "")).strip(), fallback_priority)
    encouragement = _validate_and_sanitize(str(payload.get("encouragement", "")).strip(), fallback_encouragement)
    ex_titre = str(payload.get("exercice_titre", fallback_ex_titre)).strip()[:60]
    
    # Process exercice_consigne mathematically: if it's an array, force the pipe separator
    raw_consigne = payload.get("exercice_consigne", fallback_ex_consigne)
    if isinstance(raw_consigne, list):
        # Guarantee flawless separation for the frontend safely
        formatted_steps = [str(step).strip() for step in raw_consigne if str(step).strip()]
        ex_consigne = " | ".join(formatted_steps) if formatted_steps else fallback_ex_consigne
    else:
        ex_consigne = str(raw_consigne).strip()

    # Smart swap if LLM output is too vague or fails quality checks
    if _is_bad_bilan(bilan) or _needs_more_specific_bilan(bilan):
        bilan = fallback_bilan
    if _is_bad_priority(priority, fallback_priority):
        priority = fallback_priority
    if _is_bad_encouragement(encouragement):
        encouragement = fallback_encouragement

    return {
        "bilan_global": bilan,
        "point_prioritaire": priority,
        "encouragement": encouragement,
        "exercice_titre": ex_titre or fallback_ex_titre,
        "exercice_consigne": ex_consigne or fallback_ex_consigne
    }
