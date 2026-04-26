"""
API v1 Router Aggregator

Aggregates all API v1 endpoints.
"""

from fastapi import APIRouter
from app.api.v1.endpoints import users, videos, sessions, feedback

api_router = APIRouter()

# Include routers
api_router.include_router(users.router, prefix="/user", tags=["profile"])
api_router.include_router(videos.router, prefix="/video", tags=["video"])
api_router.include_router(sessions.router, prefix="/tracker", tags=["tracker"])
api_router.include_router(feedback.router, prefix="/feedback", tags=["feedback"])

# TODO: Add remaining routers in Phase 2
# from app.api.v1.endpoints import auth
# api_router.include_router(auth.router, prefix="/auth", tags=["auth"])

__all__ = ["api_router"]
