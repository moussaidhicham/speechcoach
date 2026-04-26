import os
import shutil
import sys
import uuid as uuid_lib
import json
import time
import datetime
from typing import Any, Dict, List

# Silence noisy libraries BEFORE they are imported anywhere else
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['ABSL_LOGGING_LEVEL'] = 'error'
os.environ['HF_HUB_DISABLE_PROGRESS_BARS'] = '1'
os.environ['HF_HUB_VERBOSITY'] = 'error'
os.environ['HF_HUB_DISABLE_TELEMETRY'] = '1'
os.environ['TRANSFORMERS_VERBOSITY'] = 'error'

import logging
# Set external libraries to ERROR level to eliminate noisy ML prints
logging.getLogger("urllib3").setLevel(logging.ERROR)
logging.getLogger("huggingface_hub").setLevel(logging.ERROR)
logging.getLogger("huggingface_hub.utils._http").setLevel(logging.ERROR)
logging.getLogger("sentence_transformers").setLevel(logging.ERROR)
logging.getLogger("sentence_transformers.SentenceTransformer").setLevel(logging.ERROR)
logging.getLogger("whisper").setLevel(logging.ERROR)
logging.getLogger("transformers").setLevel(logging.ERROR)
logging.getLogger("httpx").setLevel(logging.ERROR)
logging.getLogger("httpcore").setLevel(logging.ERROR)

# Add backend/ folder to sys.path to allow imports from `ml` and `db` cleanly
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../'))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.worker.celery_app import celery_app
from app.db.database import SessionLocal
from app.db.models import VideoSession, AnalysisResult, CoachingFeedback, Profile, User
from sqlmodel import select
from app.analytics.engine.metrics.schema import Recommendation, Scores

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def update_session_status(
    session_id: str, 
    status: str, 
    step: str | None = None, 
    progress: float | None = None,
    started_now: bool = False
):
    """Synchronous status update for the Celery worker."""
    with SessionLocal() as db:
        session = db.get(VideoSession, uuid_lib.UUID(session_id))
        if session:
            session.status = status
            if step is not None:
                session.current_step = step
            if progress is not None:
                session.progress_percent = progress
            if started_now:
                session.processing_started_at = datetime.datetime.utcnow()
            db.commit()
            logger.info(f"Session {session_id} [{status}] -> {step or 'no-step'} ({progress or 0}%)")

def save_analysis_result(session_id: str, report_dict: dict, overall_score: int) -> bool:
    """Synchronous saving of analysis results."""
    with SessionLocal() as db:
        session = db.get(VideoSession, uuid_lib.UUID(session_id))
        if not session:
            logger.warning(f"Session {session_id} no longer exists. Skipping analysis save.")
            return False

        # Extract duration from metadata if present
        duration = report_dict.get('metadata', {}).get('duration_seconds', 0)
        session.duration_seconds = float(duration)

        analysis = AnalysisResult(
            video_session_id=uuid_lib.UUID(session_id),
            overall_score=int(overall_score),
            metrics_json=report_dict
        )
        db.add(analysis)
        db.commit()
        db.refresh(analysis)
        
        # Save nested coaching feedback if it exists
        if 'llm_coaching' in report_dict and report_dict['llm_coaching']:
            coaching = report_dict['llm_coaching']
            feedback = CoachingFeedback(
                analysis_result_id=analysis.id,
                bilan=coaching.get('bilan_global', ''),
                conseil=coaching.get('point_prioritaire', ''),
                motivation=coaching.get('encouragement', '')
            )
            db.add(feedback)
            db.commit()
            logger.info(f"Coaching feedback saved for session {session_id}")
        return True


def update_analysis_enrichment(session_id: str, report_dict: Dict[str, Any]):
    """Updates an existing analysis result with enrichment data and syncs coaching feedback."""
    with SessionLocal() as db:
        statement = select(AnalysisResult).where(AnalysisResult.video_session_id == uuid_lib.UUID(session_id))
        analysis = db.execute(statement).scalar_one_or_none()
        if not analysis:
            logger.warning(f"No analysis found to enrich for session {session_id}")
            return

        analysis.metrics_json = report_dict
        db.add(analysis)
        db.commit()
        db.refresh(analysis)

        coaching = report_dict.get('llm_coaching')
        if coaching:
            feedback_stmt = select(CoachingFeedback).where(CoachingFeedback.analysis_result_id == analysis.id)
            feedback = db.execute(feedback_stmt).scalar_one_or_none()
            if not feedback:
                feedback = CoachingFeedback(analysis_result_id=analysis.id, bilan='', conseil='', motivation='')

            feedback.bilan = coaching.get('bilan_global', '')
            feedback.conseil = coaching.get('point_prioritaire', '')
            feedback.motivation = coaching.get('encouragement', '')
            db.add(feedback)
            db.commit()
            logger.info(f"Coaching enrichment updated for session {session_id}")


def get_user_preferences(session_id: str):
    """Fetches user preference fields from profile."""
    with SessionLocal() as db:
        session = db.get(VideoSession, uuid_lib.UUID(session_id))
        if session and session.user_id:
            statement = select(Profile).where(Profile.user_id == session.user_id)
            profile = db.execute(statement).scalar_one_or_none()
            if profile:
                return {
                    "preferred_language": profile.preferred_language,
                    "experience_level": profile.experience_level,
                    "current_goal": profile.current_goal,
                    "weak_points": profile.weak_points,
                }
    return {}


def get_user_recent_history(session_id: str, limit: int = 3) -> str:
    """Retrieves a summary of the user's last X completed sessions for trend analysis."""
    def _axis_tuple(result: AnalysisResult) -> tuple[float, float, float, float]:
        metrics = result.metrics_json or {}
        score_data = metrics.get('scores') or {}
        return (
            float(score_data.get('voice_score', 0.0) or 0.0),
            float(score_data.get('presence_score', 0.0) or 0.0),
            float(score_data.get('body_language_score', 0.0) or 0.0),
            float(score_data.get('scene_score', 0.0) or 0.0),
        )

    def _delta_label(delta: float, tolerance: float = 0.2) -> str:
        if delta > tolerance:
            return "hausse"
        if delta < -tolerance:
            return "baisse"
        return "stable"

    try:
        with SessionLocal() as db:
            current_session = db.get(VideoSession, uuid_lib.UUID(session_id))
            if not current_session or not current_session.user_id:
                return "Première session."

            # Query the last X completed analyses for this user, excluding current session
            stmt = (
                select(AnalysisResult)
                .join(VideoSession)
                .where(VideoSession.user_id == current_session.user_id)
                .where(VideoSession.id != current_session.id)
                .where(VideoSession.status == 'completed')
                .order_by(VideoSession.created_at.desc())
                .limit(limit)
            )
            results = db.execute(stmt).scalars().all()
            
            if not results:
                return "Première session SpeechCoach."

            ordered = list(reversed(results))
            chronology_parts: List[str] = []
            for idx, res in enumerate(ordered, start=1):
                voice, presence, body, scene = _axis_tuple(res)
                chronology_parts.append(
                    "Session {idx}: Global {global_score}/100 | "
                    "Voix {voice:.1f}/10 | Presence {presence:.1f}/10 | "
                    "Gestes {body:.1f}/10 | Cadrage {scene:.1f}/10".format(
                        idx=idx,
                        global_score=int(res.overall_score or 0),
                        voice=voice,
                        presence=presence,
                        body=body,
                        scene=scene,
                    )
                )

            first = ordered[0]
            last = ordered[-1]
            first_voice, first_presence, first_body, first_scene = _axis_tuple(first)
            last_voice, last_presence, last_body, last_scene = _axis_tuple(last)
            trend_summary = (
                "Tendance recente ({count} sessions): "
                "Global {global_trend}, Voix {voice_trend}, Presence {presence_trend}, "
                "Gestes {body_trend}, Cadrage {scene_trend}."
            ).format(
                count=len(ordered),
                global_trend=_delta_label(float(last.overall_score or 0) - float(first.overall_score or 0), tolerance=1.0),
                voice_trend=_delta_label(last_voice - first_voice),
                presence_trend=_delta_label(last_presence - first_presence),
                body_trend=_delta_label(last_body - first_body),
                scene_trend=_delta_label(last_scene - first_scene),
            )

            return f"{trend_summary} Historique detaille: {' || '.join(chronology_parts)}"
    except Exception as e:
        logger.error(f"Error fetching history: {e}")
        return "Historique indisponible."


def _build_scores(metrics_json: Dict[str, Any]) -> Scores:
    score_data = metrics_json.get('scores') or {}
    return Scores(
        voice_score=float(score_data.get('voice_score', 0.0) or 0.0),
        presence_score=float(score_data.get('presence_score', 0.0) or 0.0),
        body_language_score=float(score_data.get('body_language_score', 0.0) or 0.0),
        scene_score=float(score_data.get('scene_score', 0.0) or 0.0),
        overall_score=float(score_data.get('overall_score', 0.0) or 0.0),
    )


def _build_recommendations(metrics_json: Dict[str, Any]) -> List[Recommendation]:
    items = metrics_json.get('recommendations') or []
    recommendations: List[Recommendation] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        recommendations.append(
            Recommendation(
                category=str(item.get('category', 'General')),
                severity=str(item.get('severity', 'Info')),
                message=str(item.get('message', '')),
                actionable_tip=str(item.get('actionable_tip', item.get('tip', ''))),
                exercise_key=str(item.get('exercise_key', '')),
            )
        )
    return recommendations


def run_report_enrichment(session_id: str, report_dict: Dict[str, Any]) -> Dict[str, Any]:
    """Adds RAG + LLM coaching on top of an existing fast report payload."""
    started_at = time.perf_counter()
    update_session_status(session_id, "completed", step="Intelligence Artificielle : Initialisation...", progress=78)
    
    strengths = [str(item).strip() for item in (report_dict.get('strengths') or []) if str(item).strip()]
    weaknesses = [str(item).strip() for item in (report_dict.get('weaknesses') or []) if str(item).strip()]
    recommendations = _build_recommendations(report_dict)
    scores = _build_scores(report_dict)
    metadata = report_dict.get('metadata') or {}
    language = str(metadata.get('detected_language') or 'unknown').strip() or 'unknown'
    experience_level = metadata.get('experience_level')
    current_goal = metadata.get('current_goal')
    weak_points = str(metadata.get('weak_points') or '').strip() or None
    if not weak_points:
        prefs = get_user_preferences(session_id)
        weak_points = str(prefs.get('weak_points') or '').strip() or None

    fetched_docs: List[Dict[str, Any]] = []
    rag_ready = False
    try:
        from app.analytics.engine.rag.retriever import RAGRetriever
        retriever = RAGRetriever()
        rag_ready = True
    except ImportError:
        logger.warning("RAG Retriever could not be loaded during enrichment. Skipping RAG.")

    if rag_ready and recommendations:
        update_session_status(session_id, "completed", step="Recherche de conseils personnalisés (RAG)...", progress=82)
        rag_started_at = time.perf_counter()
        top_rec = recommendations[0]
        query = f"{top_rec.category} {top_rec.message}"
        logger.info(f"Enrichment RAG query: {query}")
        fetched_docs = retriever.retrieve(query, top_k=2)
        retriever.release()
        logger.info("RAG retrieval completed in %.2fs", time.perf_counter() - rag_started_at)

    update_session_status(session_id, "completed", step="Génération du coaching IA en cours...", progress=90)
    from app.analytics.engine.agent.agent_coach import generate_coaching_text

    # Fetch trend/history context
    history_context = get_user_recent_history(session_id)
    logger.info(f"Contextual History for LLM: {history_context}")

    llm_started_at = time.perf_counter()
    llm_coaching = None
    eq_metrics = report_dict.get('eq_metrics') if isinstance(report_dict.get('eq_metrics'), dict) else None
    try:
        llm_coaching = generate_coaching_text(
            scores=scores,
            strengths=strengths,
            weaknesses=weaknesses,
            recommendations=recommendations,
            fetched_docs=fetched_docs,
            language=language,
            model=os.getenv("SPEECHCOACH_LLM_MODEL", ""),
            experience_level=experience_level,
            current_goal=current_goal,
            weak_points=weak_points,
            history_context=history_context,
            eq_metrics=eq_metrics,
        )
    except Exception as e:
        logger.error(f"LLM Enrichment failed: {e}")
        # Graceful degradation: we will rely on the deterministic fallback in the next steps

    logger.info("LLM coaching generation completed in %.2fs", time.perf_counter() - llm_started_at)

    report_dict['retrieved_documents'] = fetched_docs
    report_dict['enrichment_status'] = 'completed' if llm_coaching else 'failed'
    if llm_coaching:
        report_dict['llm_coaching'] = llm_coaching

    logger.info("Total enrichment pipeline completed in %.2fs", time.perf_counter() - started_at)
    return report_dict

@celery_app.task(bind=True, name="process_video_task")
def process_video_task(
    self,
    session_id: str,
    video_path: str,
    output_dir: str,
    device_type: str = "unknown",
    source_name: str = "",
    language: str = "auto"
):
    """
    Background worker: runs the full SpeechCoach analysis pipeline and saves results to DB.
    """
    # Clean terminal start
    logger.info("--- [START] Session %s (%s) ---", session_id[:8], source_name or 'upload')
    
    update_session_status(session_id, "processing", step="Démarrage...", progress=5, started_now=True)
    
    # Precedence: 
    # 1. Studio/API Choice (if not auto)
    # 2. Profile Preference (if auto)
    # 3. Automatic Detection (None)
    user_preferences = get_user_preferences(session_id)
    forced_language = None
    if language in {"fr", "en", "ar"}:
        forced_language = language
    else:
        preferred_lang = user_preferences.get("preferred_language")
        if preferred_lang in {"fr", "en", "ar"}:
            forced_language = preferred_lang
    
    try:
        update_session_status(session_id, "processing", step="Préparation des fichiers...", progress=10)
        self.update_state(state='PROGRESS', meta={'step': 'Ingestion...'})

        from app.analytics.engine.process_video import process_video

        # Use session_id as the folder name instead of file_id for consistency
        session_dir = os.path.join(output_dir, session_id)

        update_session_status(
            session_id,
            "processing",
            step=f"Analyse Audio & Vision (L:{forced_language or 'auto'}, D:{device_type})...",
            progress=25
        )
        self.update_state(state='PROGRESS', meta={'step': f'Analyzing Audio & Vision ({forced_language or "auto"})...'})

        # Progress callback wrapper
        def progress_callback(sid, progress, step):
            update_session_status(sid, "processing", step=step, progress=progress)

        # Full ML pipeline (Synchronous)
        process_video(
            video_path,
            output_dir,
            forced_language=forced_language,
            include_enrichment=False,
            custom_session_id=session_id,
            device_type=device_type,
            source_name=source_name,
            experience_level=user_preferences.get("experience_level"),
            current_goal=user_preferences.get("current_goal"),
            weak_points=user_preferences.get("weak_points"),
            progress_callback=progress_callback,
        )
        
        # Read generated report
        self.update_state(state='PROGRESS', meta={'step': 'Saving results...'})
        report_path = os.path.join(session_dir, "report.json")
        with open(report_path, 'r', encoding='utf-8') as f:
            report_dict = json.load(f)

        report_dict['enrichment_status'] = 'pending'
            
        overall_score = report_dict.get('scores', {}).get('overall_score', 0)
        
        saved = save_analysis_result(session_id, report_dict, overall_score)
        if not saved:
            if os.path.exists(session_dir):
                try:
                    shutil.rmtree(session_dir)
                except Exception:
                    logger.exception(f"Failed to clean processing dir for deleted session {session_id}")
            return {"session_id": session_id, "status": "deleted"}

        update_session_status(session_id, "completed", step="Rapport prêt", progress=75)
        enrich_report_task.apply_async(args=[session_id, report_path], queue='ai_processing')
        logger.info(f"Task completed successfully for session: {session_id}")
        return {"session_id": session_id, "status": "completed"}
        
    except Exception as e:
        logger.error(f"Task failed for session {session_id}: {str(e)}", exc_info=True)
        update_session_status(session_id, "failed")
        return {"session_id": session_id, "status": "failed", "error": str(e)}


@celery_app.task(bind=True, name="enrich_report_task")
def enrich_report_task(self, session_id: str, report_path: str):
    """Secondary task: enriches an already-generated report with RAG + LLM coaching."""
    logger.info(f"Enrichment task started for session: {session_id}")
    try:
        if not os.path.exists(report_path):
            raise FileNotFoundError(f"Report file not found: {report_path}")

        with open(report_path, 'r', encoding='utf-8') as f:
            report_dict = json.load(f)

        update_session_status(session_id, "completed", step="Enrichissement IA (RAG & Analyse)...", progress=75)
        enriched_report = run_report_enrichment(session_id, report_dict)

        update_session_status(session_id, "completed", step="Génération du coaching IA...", progress=90)

        update_session_status(session_id, "completed", step="Finalisation du coaching...", progress=95)
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(enriched_report, f, indent=2, ensure_ascii=False)

        update_analysis_enrichment(session_id, enriched_report)
        update_session_status(session_id, "completed", step="Terminé", progress=100)
        logger.info(f"Enrichment task completed for session: {session_id}")
        return {"session_id": session_id, "status": enriched_report.get('enrichment_status', 'completed')}
    except Exception as e:
        logger.error(f"Enrichment task failed for session {session_id}: {str(e)}", exc_info=True)
        try:
            if os.path.exists(report_path):
                with open(report_path, 'r', encoding='utf-8') as f:
                    report_dict = json.load(f)
                report_dict['enrichment_status'] = 'failed'
                with open(report_path, 'w', encoding='utf-8') as f:
                    json.dump(report_dict, f, indent=2, ensure_ascii=False)
                update_analysis_enrichment(session_id, report_dict)
        except Exception:
            logger.exception(f"Failed to mark enrichment failure for session {session_id}")
        return {"session_id": session_id, "status": "failed", "error": str(e)}
