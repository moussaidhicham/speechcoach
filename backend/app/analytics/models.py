import uuid
import datetime
from typing import Optional, Dict, Any, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship, JSON, Column

if TYPE_CHECKING:
    from app.users.models import User

class VideoSession(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id")
    video_url: str
    status: str = Field(default="pending") # pending, processing, completed, failed
    current_step: Optional[str] = Field(default=None)
    progress_percent: float = Field(default=0.0)
    duration_seconds: float = Field(default=0.0)
    title: Optional[str] = Field(default=None)
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)
    processing_started_at: Optional[datetime.datetime] = Field(default=None)
    
    user: Optional["User"] = Relationship(back_populates="video_sessions")
    analysis_result: Optional["AnalysisResult"] = Relationship(back_populates="video_session")


class AnalysisResult(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    video_session_id: uuid.UUID = Field(foreign_key="videosession.id")
    overall_score: int = Field(default=0)
    # Storing complex nested data as JSON
    metrics_json: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    
    video_session: Optional[VideoSession] = Relationship(back_populates="analysis_result")
    coaching_feedback: Optional["CoachingFeedback"] = Relationship(back_populates="analysis_result")


class CoachingFeedback(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    analysis_result_id: uuid.UUID = Field(foreign_key="analysisresult.id")
    bilan: str
    conseil: str
    motivation: str
    
    analysis_result: Optional[AnalysisResult] = Relationship(back_populates="coaching_feedback")


class PlatformFeedback(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id")
    rating: int = Field(ge=1, le=5)
    comments: Optional[str] = None
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)
    
    user: Optional["User"] = Relationship(back_populates="platform_feedback")
