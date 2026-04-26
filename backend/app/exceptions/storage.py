"""
Storage related exceptions.
"""

from .base import SpeechCoachException


class StorageError(SpeechCoachException):
    """Raised when a storage operation fails."""

    pass


class FileNotFoundError(StorageError):
    """Raised when a file cannot be found in storage."""

    pass


class FileUploadError(StorageError):
    """Raised when file upload fails."""

    pass
