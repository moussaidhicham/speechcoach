import uuid
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException

logger = logging.getLogger(__name__)
from sqlmodel.ext.asyncio.session import AsyncSession
from app.auth.router import current_active_user
from app.users.models import User
from app.analytics.models import PlatformFeedback
from app.analytics.schemas import PlatformFeedbackCreate, PlatformFeedbackRead, PlatformFeedbackUpdate
from app.db.database import get_session

feedback_router = APIRouter()

@feedback_router.post("/platform", response_model=PlatformFeedbackRead, status_code=201)
async def create_platform_feedback(
    feedback_in: PlatformFeedbackCreate,
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_session)
):
    """
    Submits feedback for the application (rating + comments).
    """
    feedback = PlatformFeedback(
        user_id=user.id,
        rating=feedback_in.rating,
        comments=feedback_in.comments
    )
    db.add(feedback)
    await db.commit()
    await db.refresh(feedback)
    return feedback

@feedback_router.get("/platform/mine", response_model=list[PlatformFeedbackRead])
async def get_my_feedback(
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_session)
):
    """
    Retrieves the current user's past feedback.
    """
    from sqlmodel import select
    statement = select(PlatformFeedback).where(PlatformFeedback.user_id == user.id)
    results = await db.execute(statement)
    return results.scalars().all()

@feedback_router.get("/platform/check")
async def check_feedback_status(
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_session)
):
    """
    Checks if the user has already provided at least one feedback.
    """
    from sqlmodel import select, func
    statement = select(func.count()).select_from(PlatformFeedback).where(PlatformFeedback.user_id == user.id)
    result = await db.execute(statement)
    count = result.scalar()
    return {"has_feedback": count > 0}

@feedback_router.patch("/platform/{feedback_id}", response_model=PlatformFeedbackRead)
async def update_platform_feedback(
    feedback_id: uuid.UUID,
    feedback_in: PlatformFeedbackUpdate,
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_session)
):
    """
    Updates a user's own feedback.
    """
    from sqlmodel import select
    statement = select(PlatformFeedback).where(PlatformFeedback.id == feedback_id, PlatformFeedback.user_id == user.id)
    result = await db.execute(statement)
    feedback = result.scalar_one_or_none()
    
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found or not owned by user.")
    
    update_data = feedback_in.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(feedback, key, value)
    
    db.add(feedback)
    await db.commit()
    await db.refresh(feedback)
    return feedback

@feedback_router.delete("/platform/{feedback_id}", status_code=204)
async def delete_platform_feedback(
    feedback_id: uuid.UUID,
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_session)
):
    """
    Deletes a user's own feedback.
    """
    from sqlmodel import select
    statement = select(PlatformFeedback).where(PlatformFeedback.id == feedback_id, PlatformFeedback.user_id == user.id)
    result = await db.execute(statement)
    feedback = result.scalar_one_or_none()
    
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found or not owned by user.")
    
    await db.delete(feedback)
    await db.commit()
    return None

@feedback_router.get("/platform/stats")
async def get_feedback_stats(
    db: AsyncSession = Depends(get_session)
):
    """
    Returns global feedback statistics.
    """
    from sqlmodel import select, func
    statement = select(func.avg(PlatformFeedback.rating), func.count(PlatformFeedback.id)).select_from(PlatformFeedback)
    result = await db.execute(statement)
    avg_rating, total_count = result.one()
    avg_val = float(avg_rating) if avg_rating is not None else 0.0
    
    return {
        "average_rating": round(avg_val, 1),
        "total_reviews": total_count or 0
    }

@feedback_router.get("/platform/all", response_model=list[PlatformFeedbackRead])
async def get_all_feedback(
    db: AsyncSession = Depends(get_session)
):
    from sqlalchemy import text
    from app.analytics.schemas import UserProfileRead

    # Use raw SQL to fully bypass any ORM relationship/UUID issues.
    # We join directly on user_id. MySQL handles BINARY(16) equality correctly.
    feedback_rows = await db.execute(text("""
        SELECT pf.id, pf.user_id, pf.rating, pf.comments, pf.created_at,
               p.full_name, p.avatar_url
        FROM platformfeedback pf
        LEFT JOIN profile p ON p.user_id = pf.user_id
        ORDER BY pf.id DESC
    """))
    rows = feedback_rows.fetchall()

    response = []
    for row in rows:
        user_prof = None
        if row.full_name or row.avatar_url:
            user_prof = UserProfileRead(
                full_name=row.full_name,
                avatar_url=row.avatar_url
            )
        
        # Convert user_id to string if it's binary
        u_id = row.user_id
        if isinstance(u_id, bytes):
            import uuid
            u_id = uuid.UUID(bytes=u_id)

        response.append(PlatformFeedbackRead(
            id=row.id,
            user_id=u_id,
            rating=row.rating,
            comments=row.comments,
            created_at=row.created_at,
            user_profile=user_prof
        ))

    return response



