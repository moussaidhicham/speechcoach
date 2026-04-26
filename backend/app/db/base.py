# Import all models here for Alembic metadata
from sqlmodel import SQLModel
from app.db.models import User, Profile, VideoSession, AnalysisResult, CoachingFeedback, PlatformFeedback

# Export SQLModel metadata
metadata = SQLModel.metadata
