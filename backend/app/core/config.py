from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "SpeechCoach API"
    SECRET_KEY: str = "very_secret_key"

    @field_validator('SECRET_KEY')
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        if v == "very_secret_key" or len(v) < 32:
            raise ValueError(
                "SECRET_KEY must be set to a strong random value of at least 32 characters. "
                "Please set it in your .env file. See .env.example for details."
            )
        return v
    
    MYSQL_USER: str = "root"
    MYSQL_PASSWORD: str = ""
    MYSQL_SERVER: str = "localhost"
    MYSQL_PORT: int = 3306
    MYSQL_DB: str = "speechcoach"
    
    # Frontend URL for links in emails
    FRONTEND_URL: str = "http://localhost:3000"
    
    # Email Settings
    MAIL_USERNAME: str = "your_mailtrap_user"
    MAIL_PASSWORD: str = "your_mailtrap_password"
    MAIL_FROM: str = "noreply@speechcoach.com"
    MAIL_FROM_NAME: str = "SpeechCoach"
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "sandbox.smtp.mailtrap.io"
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False
    
    @property
    def ASYNC_DATABASE_URL(self) -> str:
        return f"mysql+aiomysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}@{self.MYSQL_SERVER}:{self.MYSQL_PORT}/{self.MYSQL_DB}"

    @property
    def SYNC_DATABASE_URL(self) -> str:
        return f"mysql+pymysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}@{self.MYSQL_SERVER}:{self.MYSQL_PORT}/{self.MYSQL_DB}"

    SPEECHCOACH_COACHING_BACKEND: str = "ollama"
    SPEECHCOACH_LLM_MODEL: str = "speechcoach"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
