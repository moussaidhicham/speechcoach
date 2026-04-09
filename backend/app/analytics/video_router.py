import os
import uuid
import shutil
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession

from app.auth.router import current_active_user
from app.users.models import User
from app.analytics.models import VideoSession
from app.db.database import get_session
from app.worker.tasks import process_video_task

video_router = APIRouter()

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../storage/uploads'))
os.makedirs(UPLOAD_DIR, exist_ok=True)

@video_router.post("/upload")
async def upload_video(
    file: UploadFile = File(...),
    device_type: str = Form("unknown"),
    language: str = Form("auto"),
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_session)
):
    allowed_extensions = (".mp4", ".webm", ".mov", ".mkv")
    filename = file.filename or ""
    ext = os.path.splitext(filename)[1].lower()
    
    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Unsupported video format. Allowed: MP4, WebM, MOV, MKV.")
        
    # Generate unique filename for safety while preserving extension
    file_id = str(uuid.uuid4())
    safe_filename = f"{file_id}{ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
        
    # Save file locally (in a real app, this would be an S3 bucket)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Create session entry in database
    # Default title: use filename or "Analyse du [Date]"
    import datetime
    default_title = filename if filename else f"Analyse du {datetime.datetime.now().strftime('%d/%m/%Y %H:%M')}"
    
    # Store relative URL for the frontend
    relative_video_url = f"/storage/uploads/{safe_filename}"
    
    session = VideoSession(
        user_id=user.id,
        video_url=relative_video_url, 
        status="pending",
        title=default_title
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    
    # Trigger Celery Task safely
    try:
        output_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../storage/processing'))
        os.makedirs(output_dir, exist_ok=True)
        
        # pass session ID as string because celery needs JSON primitives
        process_video_task.delay(str(session.id), file_path, output_dir, device_type, filename, language)
    except Exception as e:
        # If celery fails to trigger (e.g., redis not running)
        session.status = "failed"
        await db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to trigger processing: {str(e)}")

    return {"message": "Video uploaded and processing started", "session_id": str(session.id)}
