"""
Video upload endpoints

Migrated from app/analytics/video_router.py in Phase 2
"""

import os
import uuid
import shutil
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Request
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.auth.router import current_active_user
from app.db.models import User, VideoSession
from app.db.database import get_session
from app.worker.tasks import process_video_task
from app.utils.storage import STORAGE_UPLOADS_DIR, STORAGE_PROCESSING_DIR, UPLOADS_URL_PREFIX

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

UPLOAD_DIR = STORAGE_UPLOADS_DIR

# Security limits
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500MB (for 5-minute video at ~1.7MB/min)
MAX_VIDEO_DURATION_SECONDS = 300  # 5 minutes
MAX_VIDEOS_PER_USER = 10  # User quota
ALLOWED_EXTENSIONS = (".mp4", ".webm", ".mov", ".mkv")
ALLOWED_MIME_TYPES = ("video/mp4", "video/webm", "video/quicktime", "video/x-matroska")

@router.post("/upload")
@limiter.limit("5/hour")  # 5 uploads per hour per user
async def upload_video(
    request: Request,
    file: UploadFile = File(...),
    device_type: str = Form("unknown"),
    language: str = Form("auto"),
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_session)
):
    # 1. Validate file size
    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Fichier trop volumineux. Taille maximale : {MAX_FILE_SIZE / (1024*1024):.0f}MB"
        )
    
    if file_size == 0:
        raise HTTPException(status_code=400, detail="Le fichier est vide")
    
    # 2. Validate file extension
    filename = file.filename or ""
    ext = os.path.splitext(filename)[1].lower()
    
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Format vidéo non pris en charge. Formats autorisés : {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # 3. Validate MIME type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Type de fichier invalide. Fichier vidéo attendu, type reçu : {file.content_type}"
        )
    
    # 4. Validate device_type
    allowed_device_types = ["unknown", "laptop_desktop", "tablet", "smartphone"]
    if device_type not in allowed_device_types:
        raise HTTPException(
            status_code=400,
            detail=f"device_type invalide. Valeurs autorisées : {', '.join(allowed_device_types)}"
        )
    
    # 5. Check user quota
    result = await db.execute(
        select(VideoSession).where(VideoSession.user_id == user.id)
    )
    user_videos = result.all()
    
    if len(user_videos) >= MAX_VIDEOS_PER_USER:
        raise HTTPException(
            status_code=429,
            detail=f"Quota utilisateur dépassé. Maximum {MAX_VIDEOS_PER_USER} vidéos autorisées."
        )
    
    # 6. Generate unique filename for safety while preserving extension
    file_id = str(uuid.uuid4())
    safe_filename = f"{file_id}{ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    # 7. Save file with size limit check
    bytes_written = 0
    with open(file_path, "wb") as buffer:
        while chunk := file.file.read(8192):  # Read in 8KB chunks
            bytes_written += len(chunk)
            if bytes_written > MAX_FILE_SIZE:
                buffer.close()
                os.remove(file_path)
                raise HTTPException(
                    status_code=400,
                    detail=f"Taille du fichier dépassée pendant le téléchargement. Maximum : {MAX_FILE_SIZE / (1024*1024):.0f}MB"
                )
            buffer.write(chunk)
    
    # 8. Validate video duration (using FFmpeg)
    try:
        import subprocess
        cmd = [
            "ffprobe",
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            file_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        
        if result.returncode == 0:
            duration = float(result.stdout.strip())
            if duration > MAX_VIDEO_DURATION_SECONDS:
                os.remove(file_path)
                raise HTTPException(
                    status_code=400,
                    detail=f"Vidéo trop longue. Durée maximale : {MAX_VIDEO_DURATION_SECONDS // 60} minutes"
                )
    except subprocess.TimeoutExpired:
        os.remove(file_path)
        raise HTTPException(status_code=400, detail="Échec de la validation de la durée de la vidéo")
    except Exception as e:
        # If FFmpeg fails, we still proceed but log the error
        print(f"Attention : Impossible de valider la durée de la vidéo : {e}")
    
    # 9. Create session entry in database
    import datetime
    default_title = filename if filename else f"Analyse du {datetime.datetime.now().strftime('%d/%m/%Y %H:%M')}"
    
    # Store relative URL for the frontend
    relative_video_url = f"{UPLOADS_URL_PREFIX}/{safe_filename}"
    
    session = VideoSession(
        user_id=user.id,
        video_url=relative_video_url,
        status="pending",
        title=default_title
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    
    # 10. Trigger Celery Task safely
    try:
        output_dir = STORAGE_PROCESSING_DIR
        
        # pass session ID as string because celery needs JSON primitives
        process_video_task.delay(str(session.id), file_path, output_dir, device_type, filename, language)
    except Exception as e:
        # If celery fails to trigger (e.g., redis not running)
        session.status = "failed"
        await db.commit()
        raise HTTPException(status_code=500, detail=f"Échec du démarrage du traitement : {str(e)}")

    return {"message": "Vidéo téléchargée et traitement démarré", "session_id": str(session.id)}

__all__ = ["router"]
