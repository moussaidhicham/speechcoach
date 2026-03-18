import uuid
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.declarative import declarative_base
from sqlmodel import SQLModel, Field, Relationship, JSON, Column
from fastapi_users.db import SQLAlchemyBaseUserTableUUID
import datetime

# FastAPI-Users base requires a declarative base from SQLAlchemy sometimes,
# but SQLModel is also based on SQLAlchemy.
# To ensure maximum compatibility with fastapi-users and SQLModel:
class User(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(unique=True, index=True, max_length=320)
    hashed_password: str = Field(max_length=1024)
    is_active: bool = Field(default=True)
    is_superuser: bool = Field(default=False)
    is_verified: bool = Field(default=False)
    
    profile: Optional["Profile"] = Relationship(back_populates="user")
    video_sessions: List["VideoSession"] = Relationship(back_populates="user")
    platform_feedback: List["PlatformFeedback"] = Relationship(back_populates="user")


class Profile(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id")
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    preferred_language: str = Field(default="fr") # fr, en, ar
    experience_level: Optional[str] = None # Beginner, Intermediate, Advanced
    current_goal: Optional[str] = None # Interview, PFE, Pitch, General
    weak_points: Optional[str] = None # JSON string or comma-separated
    
    user: Optional[User] = Relationship(back_populates="profile")


class VideoSession(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id")
    video_url: str
    status: str = Field(default="pending") # pending, processing, completed, failed
    duration_seconds: float = Field(default=0.0)
    title: Optional[str] = Field(default=None)
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)
    
    user: Optional[User] = Relationship(back_populates="video_sessions")
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
    
    user: Optional[User] = Relationship(back_populates="platform_feedback")
