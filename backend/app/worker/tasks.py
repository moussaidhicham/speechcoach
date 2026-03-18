import os
import sys
import uuid as uuid_lib
import logging

# Add backend/ folder to sys.path to allow imports from `ml` and `db` cleanly
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../'))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.worker.celery_app import celery_app
from app.db.database import SessionLocal
from app.analytics.models import VideoSession, AnalysisResult, CoachingFeedback
from app.users.models import Profile, User
from sqlmodel import select

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
    
    try:
        self.update_state(state='PROGRESS', meta={'step': 'Ingestion...'})
        
        from app.analytics.engine.process_video import process_video
        
        video_name = os.path.splitext(os.path.basename(video_path))[0]
        session_dir = os.path.join(output_dir, video_name)
        
        self.update_state(state='PROGRESS', meta={'step': f'Analyzing Audio & Vision ({preferred_lang or "auto"})...'})
        
        # Full ML pipeline (Synchronous)
        process_video(video_path, output_dir, forced_language=preferred_lang)
        
        # Read generated report
        self.update_state(state='PROGRESS', meta={'step': 'Saving results...'})
        import json
        report_path = os.path.join(session_dir, "report.json")
        with open(report_path, 'r', encoding='utf-8') as f:
            report_dict = json.load(f)
            
        overall_score = report_dict.get('scores', {}).get('overall_score', 0)
        
        save_analysis_result(session_id, report_dict, overall_score)
        update_session_status(session_id, "completed")
        
        logger.info(f"Task completed successfully for session: {session_id}")
        return {"session_id": session_id, "status": "completed"}
        
    except Exception as e:
        logger.error(f"Task failed for session {session_id}: {str(e)}", exc_info=True)
        update_session_status(session_id, "failed")
        return {"session_id": session_id, "status": "failed", "error": str(e)}
