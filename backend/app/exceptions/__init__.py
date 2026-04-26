"""
Custom exception classes for the SpeechCoach application.
"""

from .base import SpeechCoachException
from .auth import AuthenticationError, AuthorizationError
from .video import VideoProcessingError, VideoUploadError
from .storage import StorageError

__all__ = [
    'SpeechCoachException',
    'AuthenticationError',
    'AuthorizationError',
    'VideoProcessingError',
    'VideoUploadError',
    'StorageError',
]
