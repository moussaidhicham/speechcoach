from pydantic import BaseModel, Field
from typing import Optional
import uuid
import datetime

class UserProfileRead(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

class PlatformFeedbackCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comments: Optional[str] = None

class PlatformFeedbackUpdate(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=5)
    comments: Optional[str] = None

class PlatformFeedbackRead(PlatformFeedbackCreate):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: Optional[datetime.datetime] = None
    user_profile: Optional[UserProfileRead] = None
    
    class Config:
        from_attributes = True
