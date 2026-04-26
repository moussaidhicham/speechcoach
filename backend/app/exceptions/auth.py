"""
Authentication and authorization related exceptions.
"""

from .base import SpeechCoachException


class AuthenticationError(SpeechCoachException):
    """Raised when authentication fails."""

    pass


class AuthorizationError(SpeechCoachException):
    """Raised when a user is not authorized to perform an action."""

    pass


class InvalidTokenError(AuthenticationError):
    """Raised when a JWT token is invalid or expired."""

    pass


class UserNotFoundError(AuthenticationError):
    """Raised when a user cannot be found."""

    pass
