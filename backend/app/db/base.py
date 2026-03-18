# Import all models here for Alembic metadata
from sqlmodel import SQLModel
from app.users.models import User, Profile
from app.analytics.models import VideoSession, AnalysisResult, CoachingFeedback, PlatformFeedback

# Export SQLModel metadata
metadata = SQLModel.metadata
