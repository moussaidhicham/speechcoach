import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.analytics.report_formatter import (
    _families_in_text,
    _is_multi_focus_text,
    _llm_exercise_conflicts_with_primary,
    _normalize_focus_tag,
)


def test_image_priority_is_not_false_multi_axis():
    text = (
        "L'amélioration de la netteté de l'image est essentielle pour une meilleure communication visuelle. "
        "Il est important de s'assurer que la caméra est propre et que l'éclairage est adapté."
    )
    assert _families_in_text(text) == {"scene"}
    assert _is_multi_focus_text(text) is False


def test_image_exercise_with_scene_focus_tag_is_considered_coherent():
    title = "Améliorer la netteté de l'image"
    consigne = (
        "Placez-vous face à une source de lumière naturelle ou artificielle pour optimiser l'éclairage de votre visage. | "
        "Vérifiez que vos deux yeux sont bien éclairés et qu'il n'y a pas d'ombre masquant vos expressions. | "
        "Nettoyez la lentille de votre caméra pour éviter les images floues et améliorer la qualité visuelle."
    )
    assert (
        _llm_exercise_conflicts_with_primary(
            primary_focus="Qualite / Cadrage",
            title=title,
            consigne=consigne,
            llm_focus_family="scene",
        )
        is False
    )


def test_focus_tag_mismatch_is_detected():
    title = "Améliorer la netteté"
    consigne = "Nettoyez la lentille et vérifiez la lumière."
    assert (
        _llm_exercise_conflicts_with_primary(
            primary_focus="Qualite / Cadrage",
            title=title,
            consigne=consigne,
            llm_focus_family="voice",
        )
        is True
    )


def test_focus_tag_normalization_accepts_aliases():
    assert _normalize_focus_tag("scene") == "scene"
    assert _normalize_focus_tag("cadrage") == "scene"
    assert _normalize_focus_tag("Voix") == "voice"
    assert _normalize_focus_tag("unknown-tag") == ""
