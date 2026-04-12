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
            print(f"\n[GROQ API ERROR] Status {response.status_code}: {response.text}\n")
            logger.error("Groq API error: %s", response.text)
            return ""
            
        result = response.json()
        content = result["choices"][0]["message"]["content"].strip()
        logger.info("Groq coaching output (%s): %s", model, content.replace("\n", " | "))
        return clean_llm_output(content)
    except Exception as error:
        print(f"\n[GROQ CONNECTION ERROR] {error}\n")
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

    banned_fragments = [
        "aventure de",
        "croyez en",
        "chaque jour une",
        "representation visuelle",
        "cadence de parole",
        "ombre au tableau",
        "trou blanc",
        "splendides aptitudes",
        "pointement du recordage",
    ]
    if any(fragment in lowered for fragment in banned_fragments):
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
    sentence_count = _sentence_count(text)
    return sentence_count < 2 or sentence_count > 4


def _is_bad_priority(text: str, tip_seed: str) -> bool:
    if not text or len(text) < 18:
        return True
    if _sentence_count(text) != 1:
        return True

    lowered = text.lower()
    banned = [
        "regarder l'ecran",
        "ecran plutot que l'objectif",
        "recharger votre cerveau",
        "recharger leur cerveau",
        "moins stressante",
    ]
    if any(fragment in lowered for fragment in banned):
        return True

    tip_tokens = {
        token
        for token in re.findall(r"[a-zA-Z]{4,}", tip_seed.lower())
        if token not in {"avec", "pour", "dans", "plus", "vous", "votre"}
    }
    text_tokens = set(re.findall(r"[a-zA-Z]{4,}", lowered))
    return bool(tip_tokens) and not tip_tokens.intersection(text_tokens)


def _is_bad_encouragement(text: str) -> bool:
    if not text or len(text) < 18:
        return True
    if _sentence_count(text) != 1:
        return True

    lowered = text.lower()
    banned = [
        "croyez en vous",
        "plus fort que vous ne le croyez",
        "travaillez dur",
        "confiance en vous",
        "potentiel a explorer",
        "grand pas",
    ]
    if any(fragment in lowered for fragment in banned):
        return True
    if "?" in text:
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
    experience_level: Optional[str] = None,
    current_goal: Optional[str] = None,
) -> Tuple[str, str]:
    top_category, top_message, top_tip = _top_recommendation(recommendations, weaknesses)
    strengths_text = " | ".join(strengths[:3]) if strengths else "Aucun point fort explicite."
    weaknesses_text = " | ".join(weaknesses[:3]) if weaknesses else top_message
    pedagogical_source = ""
    if fetched_docs:
        pedagogical_source = str(fetched_docs[0].get("content", "")).strip()[:240]
    normalized_level = (experience_level or "non renseigne").strip()
    normalized_goal = (current_goal or "general").strip()

    system = (
        "Tu es un coach expert en art oratoire et prise de parole en public. "
        "Tu dois repondre uniquement au format JSON valide strict. "
        "Tu dois toujours utiliser exactement ces 3 cles : "
        "bilan_global, point_prioritaire, encouragement. "
        "N'ajoute absolument aucun texte avant ou apres le bloc JSON. "
        "Directives redactionnelles : "
        "1. bilan_global (2-3 phrases) : Analyse fluide, engageante et tres humaine. Donne le score, celebre avec naturel les points forts, puis pointe doucement ce qui peche. "
        "2. point_prioritaire (1 phrase) : Donne un seul conseil tres specifique et actionnable pour le defaut principal. "
        "3. encouragement (1 phrase) : Une chute motivante, pragmatique, basee sur le futur resultat escompte. "
        "Directives de style CRITIQUES : "
        "Sois direct et professionnel (vouvoie toujours). "
        "Reformule completement les termes techniques comme un vrai coach humain le ferait a l'oral. "
        "Bannis totalement les expressions de robot (ex: 'Voici votre compte-rendu', 'Vous avez recu un message', 'Le systeme indique')."
    )
    user = (
        f"Score global: {int(round(scores.overall_score))}\n"
        f"Voix: {scores.voice_score}/10\n"
        f"Presence: {scores.presence_score}/10\n"
        f"Corps: {scores.body_language_score}/10\n"
        f"Scene: {scores.scene_score}/10\n"
        f"Points forts: {strengths_text}\n"
        f"Axes de progression: {weaknesses_text}\n"
        f"Top recommandation: {top_category}\n"
        f"Message: {top_message}\n"
        f"Conseil actionnable: {top_tip}\n"
        f"Niveau utilisateur: {normalized_level}\n"
        f"Objectif utilisateur: {normalized_goal}\n"
        f"Source pedagogique: {pedagogical_source or 'Non fournie'}"
    )
    return system, user


def _generate_with_model(system: str, user: str, model_name: str) -> str:
    backend = _resolve_backend()
    
    print(f"[AI ENGINE] {backend.upper()} | {model_name}")

    if backend == "groq":
        return call_groq_safe(model_name, system, user, temp=0.2, limit=220)
    elif backend != "ollama":
        logger.warning("Unsupported coaching backend '%s'. Falling back to Ollama.", backend)
    return call_ollama_safe(model_name, system, user, temp=0.2, limit=220)


def generate_coaching_text(
    scores: Scores,
    strengths: List[str],
    weaknesses: List[str],
    recommendations: List[Recommendation],
    fetched_docs: List[Dict[str, Any]],
    language: str,
    model: str = "",
    speaker_name: Optional[str] = None,
    experience_level: Optional[str] = None,
    current_goal: Optional[str] = None,
) -> Optional[Dict[str, str]]:
    del language, speaker_name

    from app.core.config import settings
    default_model = settings.SPEECHCOACH_LLM_MODEL or "qwen2.5:3b-instruct"
    model_name = model or default_model

    fallback_bilan = build_bilan(scores, strengths, recommendations, weaknesses)
    fallback_priority = build_priority(recommendations, weaknesses)
    fallback_encouragement = build_encouragement(strengths, recommendations, weaknesses)

    system, user = _build_prompt_payload(
        scores,
        strengths,
        weaknesses,
        recommendations,
        fetched_docs,
        experience_level=experience_level,
        current_goal=current_goal,
    )

    try:
        raw_output = _generate_with_model(system, user, model_name)
    except Exception as error:
        logger.error("Coaching generation failed before validation: %s", error, exc_info=True)
        raw_output = ""

    payload = _extract_json_payload(raw_output)
    if payload is None:
        logger.warning("Coaching output was not valid JSON. Falling back field by field.")
        return {
            "bilan_global": fallback_bilan,
            "point_prioritaire": fallback_priority,
            "encouragement": fallback_encouragement,
        }

    bilan = _validate_and_sanitize(str(payload.get("bilan_global", "")).strip(), fallback_bilan)
    priority = _validate_and_sanitize(str(payload.get("point_prioritaire", "")).strip(), fallback_priority)
    encouragement = _validate_and_sanitize(str(payload.get("encouragement", "")).strip(), fallback_encouragement)

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
    }
