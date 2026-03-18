import uuid
from typing import Optional, List, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship
import datetime

if TYPE_CHECKING:
    from app.analytics.models import VideoSession, PlatformFeedback

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
