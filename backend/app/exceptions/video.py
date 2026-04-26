"""
Video processing related exceptions.
"""

from .base import SpeechCoachException


class VideoProcessingError(SpeechCoachException):
    """Raised when video processing fails."""

    pass


class VideoUploadError(SpeechCoachException):
    """Raised when video upload fails."""

    pass


class UnsupportedVideoFormatError(VideoUploadError):
    """Raised when an unsupported video format is uploaded."""

    pass


class VideoNotFoundError(SpeechCoachException):
    """Raised when a video file cannot be found."""

    pass
