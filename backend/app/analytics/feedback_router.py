import uuid
import logging
import datetime
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


def normalize_feedback_created_at(value):
    if value in (None, "", "0000-00-00 00:00:00", "0000-00-00"):
        return None

    if isinstance(value, datetime.datetime):
        return value

    if isinstance(value, str):
        try:
            return datetime.datetime.fromisoformat(value.replace(" ", "T"))
        except ValueError:
            logger.warning("Unsupported legacy feedback created_at value: %s", value)
            return None

    return None

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
    feedback_items = results.scalars().all()

    response: list[PlatformFeedbackRead] = []
    for feedback in feedback_items:
        response.append(
            PlatformFeedbackRead(
                id=feedback.id,
                user_id=feedback.user_id,
                rating=feedback.rating,
                comments=feedback.comments,
                created_at=normalize_feedback_created_at(getattr(feedback, "created_at", None)),
            )
        )

    return response

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

    created_at_exists = False
    try:
        created_at_check = await db.execute(
            text(
                """
                SELECT COUNT(*)
                FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'platformfeedback'
                  AND COLUMN_NAME = 'created_at'
                """
            )
        )
        created_at_exists = bool(created_at_check.scalar())
    except Exception as exc:
        logger.warning("Could not inspect platformfeedback.created_at column: %s", exc)

    feedback_query = """
        SELECT pf.id, pf.user_id, pf.rating, pf.comments,
               {created_at_select}
               p.full_name, p.avatar_url
        FROM platformfeedback pf
        LEFT JOIN profile p ON p.user_id = pf.user_id
        ORDER BY pf.id DESC
    """.format(
        created_at_select="pf.created_at," if created_at_exists else "NULL AS created_at,"
    )

    feedback_rows = await db.execute(text(feedback_query))
    rows = feedback_rows.fetchall()

    response: list[PlatformFeedbackRead] = []
    for row in rows:
        feedback_id = row.id
        user_id = row.user_id
        if isinstance(feedback_id, bytes):
            feedback_id = uuid.UUID(bytes=feedback_id)
        if isinstance(user_id, bytes):
            user_id = uuid.UUID(bytes=user_id)

        user_profile = None
        if row.full_name or row.avatar_url:
            user_profile = UserProfileRead(
                full_name=row.full_name,
                avatar_url=row.avatar_url,
            )

        response.append(
            PlatformFeedbackRead(
                id=feedback_id,
                user_id=user_id,
                rating=row.rating,
                comments=row.comments,
                created_at=normalize_feedback_created_at(row.created_at),
                user_profile=user_profile,
            )
        )

    return response
