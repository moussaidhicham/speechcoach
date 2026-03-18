from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
import uuid as uuid_lib

from app.auth.router import current_active_user
from app.users.models import User
from app.analytics.models import VideoSession, AnalysisResult
from app.db.database import get_session

status_router = APIRouter()

@status_router.get("/status/{session_id}")
async def get_session_status(
    session_id: str,
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_session)
):
    try:
        session_uuid = uuid_lib.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid session ID format")
    
    session = await db.get(VideoSession, session_uuid)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if session.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this session")
        
    return {
        "session_id": str(session.id),
        "status": session.status,
    }

@status_router.get("/result/{session_id}")
async def get_session_result(
    session_id: str,
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_session)
):
    try:
        session_uuid = uuid_lib.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid session ID format")

    session = await db.get(VideoSession, session_uuid)
    if not session or session.user_id != user.id:
        raise HTTPException(status_code=404, detail="Session not found")
        
    from sqlmodel import select
    statement = select(AnalysisResult).where(AnalysisResult.video_session_id == session.id)
    result = await db.execute(statement)
    analysis = result.scalars().first()
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis result not ready yet")
    
    # Unpack the nested metrics_json (which is a full SpeechCoachReport dict)
    m = analysis.metrics_json or {}
    scores = m.get('scores', {})
    audio = m.get('audio_metrics', {})
    vision = m.get('vision_metrics', {})
    llm_coaching = m.get('llm_coaching') or {}
    strengths = m.get('strengths', [])
    weaknesses = m.get('weaknesses', [])
    recommendations = m.get('recommendations', [])
    
    # Build feedback text from LLM coaching or fallback to strengths/weaknesses
    feedback_parts = []
    if llm_coaching.get('bilan_global'):
        feedback_parts.append(llm_coaching['bilan_global'])
    if llm_coaching.get('point_prioritaire'):
        feedback_parts.append(f"Point prioritaire : {llm_coaching['point_prioritaire']}")
    if llm_coaching.get('encouragement'):
        feedback_parts.append(f"💡 {llm_coaching['encouragement']}")
    if not feedback_parts and strengths:
        feedback_parts = [f"✅ {s}" for s in strengths[:3]]
        feedback_parts += [f"📈 {w}" for w in weaknesses[:3]]
    feedback_text = "\n\n".join(feedback_parts) if feedback_parts else "Analyse complète. Consultez vos métriques ci-dessous."

    return {
        "id": str(session.id),
        "title": session.title or f"Analyse #{str(session.id)[:8]}",
        "video_url": session.video_url, # Pass the URL to the frontend player
        "overall_score": int(analysis.overall_score),
        "voice_score": round(scores.get('voice_score', 0) * 10),       # /10 → /100
        "body_language_score": round(scores.get('body_language_score', 0) * 10),
        "scene_score": round(scores.get('scene_score', 0) * 10),
        "presence_score": round(scores.get('presence_score', 0) * 10),
        "wpm": round(audio.get('wpm', 0)),
        "pause_count": audio.get('pause_count', 0),
        "filler_count": audio.get('filler_count', 0),
        "face_presence_ratio": round(vision.get('face_presence_ratio', 0) * 100),
        "eye_contact_ratio": round(vision.get('eye_contact_ratio', 0) * 100),
        "feedback_text": feedback_text,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "recommendations": [
            {
                "category": r.get('category', ''),
                "severity": r.get('severity', ''),
                "message": r.get('message', ''),
                "tip": r.get('actionable_tip', '')
            }
            for r in recommendations[:5]
        ],
    }

@status_router.get("/history")
async def get_session_history(
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_session)
):
    from sqlmodel import select
    # Fetch all video sessions for the user, ordered by creation date descending
    statement = select(VideoSession).where(VideoSession.user_id == user.id).order_by(VideoSession.id.desc())
    result = await db.execute(statement)
    sessions = result.scalars().all()
    
    if not sessions:
        return []
        
    history = []
    for session in sessions:
        # Fetch associated analysis result if completed
        analysis = None
        if session.status == "completed":
            analysis_stmt = select(AnalysisResult).where(AnalysisResult.video_session_id == session.id)
            analysis_res = await db.execute(analysis_stmt)
            analysis = analysis_res.scalars().first()
            
        import datetime
        # Fallback date if created_at is missing (common in some migration states)
        created_val = None
        if hasattr(session, 'created_at') and session.created_at:
            created_val = session.created_at.isoformat()
        else:
            created_val = datetime.datetime.now().isoformat()

        session_data = {
            "session_id": str(session.id),
            "title": session.title or f"Analyse #{str(session.id)[:8]}",
            "created_at": created_val,
            "status": session.status,
            "duration": session.duration_seconds,
            "video_url": session.video_url
        }
        
        if analysis and analysis.metrics_json:
            m = analysis.metrics_json
            session_data["overall_score"] = int(analysis.overall_score)
            session_data["wpm"] = round(m.get('audio_metrics', {}).get('wpm', 0))
            session_data["voice_score"] = round(m.get('scores', {}).get('voice_score', 0) * 10)
            session_data["body_language_score"] = round(m.get('scores', {}).get('body_language_score', 0) * 10)
            
            # Fallback for duration if session record lacks it
            if not session_data["duration"] or session_data["duration"] == 0:
                # Try metadata first, then audio_metrics if available
                session_data["duration"] = m.get('metadata', {}).get('duration_seconds', 0) or \
                                          m.get('audio_metrics', {}).get('total_duration', 0) or \
                                          m.get('audio_metrics', {}).get('duration', 0)
            
            # Ensure duration is rounded for clean UI display
            if session_data["duration"]:
                session_data["duration"] = round(session_data["duration"])
        
        history.append(session_data)
        
    return history


@status_router.delete("/session/{session_id}")
async def delete_session(
    session_id: str,
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_session)
):
    try:
        session_uuid = uuid_lib.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid session ID format")

    session = await db.get(VideoSession, session_uuid)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if session.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this session")
        
    # --- Physical File Cleanup ---
    import os
    BASE_STORAGE = os.path.abspath(os.path.join(os.path.dirname(__file__), "../storage"))
    
    # 1. Delete Video File
    if session.video_url and session.video_url.startswith("/storage/"):
        # Convert /storage/uploads/file.mp4 to absolute path
        rel_path = session.video_url.replace("/storage/", "")
        abs_path = os.path.join(BASE_STORAGE, rel_path)
        if os.path.exists(abs_path):
            try:
                os.remove(abs_path)
            except Exception as e:
                print(f"Failed to delete video file: {e}")

    # 2. Delete Processing Output (JSON/WAV etc) if session.id is known
    processing_dir = os.path.join(BASE_STORAGE, "processing", str(session.id))
    if os.path.exists(processing_dir):
        import shutil
        try:
            shutil.rmtree(processing_dir)
        except Exception as e:
            print(f"Failed to delete processing dir: {e}")

    # --- Database Cleanup ---
    from sqlmodel import delete, select
    from app.analytics.models import CoachingFeedback
    
    # 1. Delete CoachingFeedback
    analysis_ids_stmt = select(AnalysisResult.id).where(AnalysisResult.video_session_id == session.id)
    analysis_ids_res = await db.execute(analysis_ids_stmt)
    analysis_ids = analysis_ids_res.scalars().all()
    
    if analysis_ids:
        feedback_stmt = delete(CoachingFeedback).where(CoachingFeedback.analysis_result_id.in_(analysis_ids))
        await db.execute(feedback_stmt)
    
    # 2. Delete AnalysisResults
    result_stmt = delete(AnalysisResult).where(AnalysisResult.video_session_id == session.id)
    await db.execute(result_stmt)
    
    # 3. Delete the session
    await db.delete(session)
    await db.commit()
    
    return {"status": "deleted", "session_id": session_id}



from pydantic import BaseModel
class SessionUpdate(BaseModel):
    title: str

@status_router.patch("/session/{session_id}")
async def update_session(
    session_id: str,
    update_data: SessionUpdate,
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_session)
):
    try:
        session_uuid = uuid_lib.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid session ID format")

    session = await db.get(VideoSession, session_uuid)
    if not session or session.user_id != user.id:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session.title = update_data.title
    db.add(session)
    await db.commit()
    await db.refresh(session)
    
    return {"status": "updated", "session_id": session_id, "title": session.title}
