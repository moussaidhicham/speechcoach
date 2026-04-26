"""
Base exception class for all SpeechCoach exceptions.
"""


class SpeechCoachException(Exception):
    """Base exception for all SpeechCoach application errors."""

    def __init__(self, message: str, details: str | None = None):
        self.message = message
        self.details = details
        super().__init__(self.message)

    def __str__(self) -> str:
        if self.details:
            return f"{self.message}: {self.details}"
        return self.message
