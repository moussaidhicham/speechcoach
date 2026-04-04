import os
import sys
import uuid as uuid_lib
import logging
import json
import time
from typing import Any, Dict, List

# Add backend/ folder to sys.path to allow imports from `ml` and `db` cleanly
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../'))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.worker.celery_app import celery_app
from app.db.database import SessionLocal
from app.analytics.models import VideoSession, AnalysisResult, CoachingFeedback
from app.users.models import Profile, User
from sqlmodel import select
from app.analytics.engine.metrics.schema import Recommendation, Scores

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def update_session_status(session_id: str, status: str):
    """Synchronous status update for the Celery worker."""
    with SessionLocal() as db:
        session = db.get(VideoSession, uuid_lib.UUID(session_id))
        if session:
            session.status = status
            db.commit()
            logger.info(f"Session {session_id} status updated to: {status}")

def save_analysis_result(session_id: str, report_dict: dict, overall_score: int):
    """Synchronous saving of analysis results."""
    with SessionLocal() as db:
        session = db.get(VideoSession, uuid_lib.UUID(session_id))
        if session:
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
    """Fetches user preferred language from profile."""
    with SessionLocal() as db:
        session = db.get(VideoSession, uuid_lib.UUID(session_id))
        if session and session.user_id:
            statement = select(Profile).where(Profile.user_id == session.user_id)
            profile = db.execute(statement).scalar_one_or_none()
            if profile:
                return profile.preferred_language
    return None


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


def run_report_enrichment(report_dict: Dict[str, Any]) -> Dict[str, Any]:
    """Adds RAG + LLM coaching on top of an existing fast report payload."""
    started_at = time.perf_counter()
    strengths = [str(item).strip() for item in (report_dict.get('strengths') or []) if str(item).strip()]
    weaknesses = [str(item).strip() for item in (report_dict.get('weaknesses') or []) if str(item).strip()]
    recommendations = _build_recommendations(report_dict)
    scores = _build_scores(report_dict)
    metadata = report_dict.get('metadata') or {}
    language = str(metadata.get('detected_language') or 'unknown').strip() or 'unknown'

    fetched_docs: List[Dict[str, Any]] = []
    rag_ready = False
    try:
        from app.analytics.engine.rag.retriever import RAGRetriever
        retriever = RAGRetriever()
        rag_ready = True
    except ImportError:
        logger.warning("RAG Retriever could not be loaded during enrichment. Skipping RAG.")

    if rag_ready and recommendations:
        rag_started_at = time.perf_counter()
        top_rec = recommendations[0]
        query = f"{top_rec.category} {top_rec.message}"
        logger.info(f"Enrichment RAG query: {query}")
        fetched_docs = retriever.retrieve(query, top_k=2)
        retriever.release()
        logger.info("RAG retrieval completed in %.2fs", time.perf_counter() - rag_started_at)

    from app.analytics.engine.agent.agent_coach import generate_coaching_text

    llm_started_at = time.perf_counter()
    llm_coaching = generate_coaching_text(
        scores=scores,
        strengths=strengths,
        weaknesses=weaknesses,
        recommendations=recommendations,
        fetched_docs=fetched_docs,
        language=language,
        model=os.getenv("SPEECHCOACH_LLM_MODEL", ""),
    )
    logger.info("LLM coaching generation completed in %.2fs", time.perf_counter() - llm_started_at)

    report_dict['retrieved_documents'] = fetched_docs
    report_dict['enrichment_status'] = 'completed' if llm_coaching else 'failed'
    if llm_coaching:
        report_dict['llm_coaching'] = llm_coaching

    logger.info("Total enrichment pipeline completed in %.2fs", time.perf_counter() - started_at)
    return report_dict

@celery_app.task(bind=True, name="process_video_task")
def process_video_task(self, session_id: str, video_path: str, output_dir: str):
    """
    Background worker: runs the full SpeechCoach analysis pipeline and saves results to DB.
    Uses synchronous DB calls to avoid asyncio/proactor issues on Windows.
    """
    logger.info(f"Task started for session: {session_id}")
    
    update_session_status(session_id, "processing")
    
    # Get user preferred language
    preferred_lang = get_user_preferences(session_id)
    forced_language = preferred_lang if preferred_lang in {"fr", "en", "ar"} else None
    
    try:
        self.update_state(state='PROGRESS', meta={'step': 'Ingestion...'})
        
        from app.analytics.engine.process_video import process_video
        
        # Use session_id as the folder name instead of file_id for consistency
        session_dir = os.path.join(output_dir, session_id)
        
        self.update_state(state='PROGRESS', meta={'step': f'Analyzing Audio & Vision ({forced_language or "auto"})...'})
        
        # Full ML pipeline (Synchronous)
        process_video(
            video_path,
            output_dir,
            forced_language=forced_language,
            include_enrichment=False,
            custom_session_id=session_id,
        )
        
        # Read generated report
        self.update_state(state='PROGRESS', meta={'step': 'Saving results...'})
        report_path = os.path.join(session_dir, "report.json")
        with open(report_path, 'r', encoding='utf-8') as f:
            report_dict = json.load(f)

        report_dict['enrichment_status'] = 'pending'
            
        overall_score = report_dict.get('scores', {}).get('overall_score', 0)
        
        save_analysis_result(session_id, report_dict, overall_score)
        update_session_status(session_id, "completed")
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

        enriched_report = run_report_enrichment(report_dict)

        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(enriched_report, f, indent=2, ensure_ascii=False)

        update_analysis_enrichment(session_id, enriched_report)
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
