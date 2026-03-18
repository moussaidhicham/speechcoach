import os
import shutil
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from pydantic import BaseModel

from app.db.database import get_session
from app.users.models import User, Profile
from app.auth.router import current_active_user

profile_router = APIRouter()

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    preferred_language: Optional[str] = None
    experience_level: Optional[str] = None
    current_goal: Optional[str] = None
    weak_points: Optional[str] = None
    avatar_url: Optional[str] = None

AVATAR_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../storage/avatars'))
os.makedirs(AVATAR_DIR, exist_ok=True)

@profile_router.get("/profile")
async def get_my_profile(
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_session)
):
    """Retrieve the current user's profile."""
    # Find profile and load it
    statement = select(Profile).where(Profile.user_id == user.id)
    result = await session.execute(statement)
    profile = result.scalar_one_or_none()
    
    if not profile:
        # Create one if it somehow doesn't exist (safety)
        profile = Profile(user_id=user.id)
        session.add(profile)
        await session.commit()
    
    return profile

@profile_router.patch("/profile")
async def update_my_profile(
    update_data: ProfileUpdate,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_session)
):
    """Update specific fields in the user's profile."""
    statement = select(Profile).where(Profile.user_id == user.id)
    result = await session.execute(statement)
    profile = result.scalar_one_or_none()
    
    if not profile:
        profile = Profile(user_id=user.id)
        session.add(profile)
    
    # Apply updates
    data = update_data.dict(exclude_unset=True)
    for key, value in data.items():
        setattr(profile, key, value)
    
    session.add(profile)
    await session.commit()
    await session.refresh(profile)
    
    return profile

@profile_router.post("/profile/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_session)
):
    """Upload a new avatar for the current user."""
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed.")
    
    # Generate unique filename
    ext = os.path.splitext(file.filename or "")[1].lower()
    if not ext: ext = ".jpg"
    filename = f"avatar_{user.id}_{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(AVATAR_DIR, filename)
    
    # Save the file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Update profile in DB
    statement = select(Profile).where(Profile.user_id == user.id)
    result = await session.execute(statement)
    profile = result.scalar_one_or_none()
    
    if not profile:
        profile = Profile(user_id=user.id)
        session.add(profile)
    
    # Construct accessible URL
    profile.avatar_url = f"/storage/avatars/{filename}"
    
    session.add(profile)
    await session.commit()
    await session.refresh(profile)
    
    return {"avatar_url": profile.avatar_url}
@profile_router.delete("/profile/avatar")
async def delete_avatar(
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_session)
):
    """Delete the current user's avatar."""
    statement = select(Profile).where(Profile.user_id == user.id)
    result = await session.execute(statement)
    profile = result.scalar_one_or_none()
    
    if not profile or not profile.avatar_url:
        return {"message": "No avatar to delete."}
    
    # Try to delete the physical file
    try:
        filename = profile.avatar_url.split("/")[-1]
        file_path = os.path.join(AVATAR_DIR, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
    except Exception as e:
        # Log error but proceed to clear DB entry
        print(f"Error deleting physical file: {e}")
    
    # Clear DB entry
    profile.avatar_url = None
    session.add(profile)
    await session.commit()
    await session.refresh(profile)
    
    return {"message": "Avatar deleted successfully."}
