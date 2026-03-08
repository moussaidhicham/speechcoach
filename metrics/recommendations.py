from typing import List, Dict, Any, Tuple
from metrics.schema import AudioMetrics, VisionMetrics, Scores, Recommendation

def generate_recommendations(audio: AudioMetrics, vision: VisionMetrics, scores: Scores) -> List[Recommendation]:
    """
    Generates a prioritized list of actionable recommendations based on raw metrics and scores.
    Returns the top 3 recommendations based on predefined severity and conditions.
    """
    all_recs: List[Tuple[int, Recommendation]] = [] # list of (priority_score, Recommendation)
    # priority_score: higher meaning more critical

    # --- VOICE RULES ---
    if audio.wpm < 100:
        all_recs.append((
            80, 
            Recommendation(
                category="Voix & Débit",
                severity="Critical",
                message="Votre débit de parole est trop lent (moins de 100 mots par minute), ce qui peut endormir l'auditoire.",
                actionable_tip="Entraînez-vous à lire un texte court d'une minute avec un chronomètre. L'objectif est d'atteindre entre 130 et 150 mots."
            )
        ))
    elif audio.wpm > 160:
        all_recs.append((
            85,
            Recommendation(
                category="Voix & Débit",
                severity="Critical",
                message="Votre débit de parole est trop rapide (plus de 160 mots par minute), risquant de perdre votre public.",
                actionable_tip="Forcez-vous à marquer une pause de 2 secondes à chaque fin de phrase importante pour laisser le temps à l'audience d'assimiler."
            )
        ))

    # Guess duration in minutes for fillers per minute
    estimated_mins = audio.wpm / 150.0 if audio.wpm > 0 else 1.0
    fillers_per_min = audio.filler_count / estimated_mins
    
    if fillers_per_min > 5:
        all_recs.append((
            75,
            Recommendation(
                category="Voix & Fluidité",
                severity="Warning",
                message=f"Trop de mots parasites détectés ({audio.filler_count} 'euh', 'hum'). Cela nuit à votre crédibilité.",
                actionable_tip="Remplacez les 'euh' par des silences assumés. Enregistrez-vous sur des audios de 2 minutes en vous forçant à ne faire que des pauses silencieuses."
            )
        ))

    # --- PRESENCE & VISION RULES ---
    if vision.eye_contact_ratio < 0.4:
        all_recs.append((
            90, # very high priority
            Recommendation(
                category="Présence & Regard",
                severity="Critical",
                message="Votre contact visuel est trop faible (moins de 40% du temps).",
                actionable_tip="Collez un post-it à côté de l'objectif de votre caméra avec un visage souriant pour y accrocher votre regard."
            )
        ))
    elif vision.eye_contact_ratio < 0.7:
        all_recs.append((
            60,
            Recommendation(
                category="Présence & Regard",
                severity="Warning",
                message="Contact visuel moyen. L'audience pourrait se sentir un peu délaissée.",
                actionable_tip="Essayez de regarder la caméra spécifiquement lorsque vous énoncez les mots-clés de votre présentation."
            )
        ))

    if vision.face_presence_ratio < 0.8:
        all_recs.append((
            95, # basic framing is crucial
            Recommendation(
                category="Cadre & Posture",
                severity="Critical",
                message="Votre visage sort parfois du cadre.",
                actionable_tip="Ajustez votre caméra pour que vos épaules et votre tête soient toujours visibles, et calez-vous bien dans votre siège avant de commencer."
            )
        ))

    # --- BODY LANGUAGE RULES ---
    if vision.hands_visibility_ratio < 0.2:
        all_recs.append((
            70,
            Recommendation(
                category="Gestuelle",
                severity="Warning",
                message="Vos mains restent invisibles ou inactives, rendant la présentation un peu figée.",
                actionable_tip="Reculez légèrement de la caméra pour inclure vos bras dans le cadre et utilisez des gestes ouverts pour appuyer vos énumérations."
            )
        ))
    elif vision.hands_activity_score > 8.0:
        all_recs.append((
            65,
            Recommendation(
                category="Gestuelle",
                severity="Warning",
                message="Vos mouvements de mains sont très agités et peuvent distraire.",
                actionable_tip="Ancrez vos mains (par exemple en tenant un stylo) ou croisez-les souplement sur la table lorsque vous ne devez pas appuyer un point clé."
            )
        ))

    # --- SCENE RULES ---
    if vision.avg_brightness < 70:
        all_recs.append((
            50,
            Recommendation(
                category="Environnement",
                severity="Info",
                message="La pièce semble trop sombre, réduisant la qualité visuelle globale.",
                actionable_tip="Ajoutez une source de lumière (lampe de bureau ou anneau lumineux) face à vous, jamais derrière vous."
            )
        ))

    if vision.avg_blur < 10:
         all_recs.append((
            55,
            Recommendation(
                category="Environnement",
                severity="Info",
                message="L'image est assez floue.",
                actionable_tip="Nettoyez l'objectif de votre webcam et assurez-vous que l'autofocus est bien activé."
            )
        ))

    # Sort descending by priority score
    all_recs.sort(key=lambda x: x[0], reverse=True)

    # Return top 3 recommendations
    top_3 = [rec for score, rec in all_recs[:3]]

    # Fallback if the presentation was almost perfect
    if len(top_3) == 0:
         top_3.append(Recommendation(
             category="Maintien",
             severity="Info",
             message="Excellente prestation globale. Peu de points majeurs à corriger.",
             actionable_tip="Continuez de pratiquer régulièrement pour maintenir cette aisance. Essayez d'intégrer des variations de ton."
         ))

    return top_3


def generate_training_plan(recommendations: List[Recommendation]) -> str:
    """
    Generates a generic 7-day practice schedule styled in Markdown,
    tailored around the top recommendations provided.
    """
    if not recommendations:
        return "Aucune recommandation critique. Continuez de pratiquer !"

    # Prioritize themes from recommendations
    themes = [rec.category.split(" & ")[0] for rec in recommendations] # e.g. "Voix", "Présence", "Gestuelle"
    primary_theme = themes[0] if len(themes) > 0 else "Général"
    secondary_theme = themes[1] if len(themes) > 1 else "Pratique globale"

    plan = f"""### 📅 Plan d'Entraînement sur 7 Jours

**Focus Principal :** {primary_theme}
**Focus Secondaire :** {secondary_theme}

* **Jour 1-2 : Appropriation des Conseils**
  - Relisez attentivement les recommandations prioritaires.
  - Faites 2 enregistrements vidéo de 1 minute axés *uniquement* sur l'amélioration de "{primary_theme}". Ne vous souciez pas du reste.
  
* **Jour 3-4 : Intégration du Focus Secondaire**
  - Entraînez-vous avec les exercices d'action suggérés pour "{secondary_theme}".
  - Présentez 3 minutes de votre discours sans regarder vos notes.

* **Jour 5 : Pratique en Conditions Réelles**
  - Enchaînez 5 à 10 minutes de présentation.
  - Essayez d'appliquer l'astuce : *"{recommendations[0].actionable_tip}"*

* **Jour 6 : Relecture et Auto-évaluation**
  - Enregistrez une présentation complète.
  - Visionnez-la sans le son (pour juger la gestuelle et le regard) puis sans l'image (pour juger la voix).
  
* **Jour 7 : Repos ou Refinage**
  - Relâchez la pression. Le cerveau assimile les automatismes.
"""
    return plan
