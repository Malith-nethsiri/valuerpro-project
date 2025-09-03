from functools import lru_cache
from typing import Annotated, Literal
from pydantic import Field, computed_field, validator, ConfigDict
from pydantic_settings import BaseSettings, SettingsConfigDict
import secrets
import os
from pathlib import Path


class Settings(BaseSettings):
    """Application settings with modern Pydantic v2 patterns and enhanced validation."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
        validate_assignment=True,
    )
    
    # Environment and Debug
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    DEBUG: bool = Field(default=True, description="Enable debug mode")
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    
    # Application
    APP_NAME: str = "ValuerPro API"
    APP_VERSION: str = "2.0.0"
    APP_DESCRIPTION: str = "AI-Powered Property Valuation Report System"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = Field(
        default_factory=lambda: secrets.token_urlsafe(32),
        description="Secret key for JWT encoding"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, ge=1, le=60*24*7)  # Max 1 week
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=30, ge=1, le=365)  # Max 1 year
    
    # Enhanced CORS Settings
    CORS_ORIGINS: list[str] = Field(
        default=["http://localhost:3000", "http://localhost:3003", "localhost:3003"],
        description="Allowed CORS origins"
    )
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: list[str] = ["*"]
    CORS_ALLOW_HEADERS: list[str] = ["*"]
    
    # Database with connection pooling
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5433/valuerpro"
    DATABASE_POOL_SIZE: int = Field(default=5, ge=1, le=20)
    DATABASE_MAX_OVERFLOW: int = Field(default=10, ge=0, le=50)
    DATABASE_POOL_TIMEOUT: int = Field(default=30, ge=1, le=300)
    DATABASE_POOL_RECYCLE: int = Field(default=3600, ge=300, le=86400)  # 1 hour
    
    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_PER_MINUTE: int = Field(default=60, ge=1, le=1000)
    RATE_LIMIT_BURST: int = Field(default=100, ge=1, le=2000)
    
    # Google Cloud APIs with enhanced validation
    GOOGLE_CLOUD_PROJECT_ID: str = ""
    GOOGLE_APPLICATION_CREDENTIALS: str = ""
    GOOGLE_CLOUD_CREDENTIALS_PATH: str = ""
    GOOGLE_MAPS_API_KEY: str = ""
    
    # OpenAI API with enhanced settings
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"
    OPENAI_MAX_TOKENS: int = Field(default=2000, ge=100, le=4096)
    OPENAI_TEMPERATURE: float = Field(default=0.1, ge=0.0, le=2.0)
    OPENAI_TIMEOUT: int = Field(default=60, ge=5, le=300)
    OPENAI_MAX_RETRIES: int = Field(default=3, ge=0, le=10)
    
    # AWS Settings with validation
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_S3_BUCKET: str = ""
    AWS_REGION: str = ""
    
    # Enhanced File Storage
    STORAGE_DIR: Path = Field(default=Path("./storage"))
    MAX_FILE_SIZE: int = Field(default=10 * 1024 * 1024, ge=1024, le=100 * 1024 * 1024)  # 10MB default, max 100MB
    ALLOWED_MIME_TYPES: list[str] = [
        "application/pdf",
        "image/jpeg", 
        "image/jpg",
        "image/png",
        "image/tiff",
        "image/webp",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ]
    
    # Email Settings with enhanced validation
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = Field(default=587, ge=1, le=65535)
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_TLS: bool = True
    SMTP_USE_SSL: bool = False
    FROM_EMAIL: str = ""
    FROM_NAME: str = "ValuerPro"
    EMAIL_TIMEOUT: int = Field(default=30, ge=5, le=300)
    
    # Background Tasks
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"
    TASK_TIMEOUT: int = Field(default=300, ge=30, le=3600)
    
    # Monitoring and Logging
    SENTRY_DSN: str = ""
    LOG_FILE_PATH: Path = Field(default=Path("./logs/app.log"))
    LOG_ROTATION: str = "1 day"
    LOG_RETENTION: str = "30 days"
    
    # API Documentation
    DOCS_URL: str | None = "/docs"
    REDOC_URL: str | None = "/redoc"
    OPENAPI_URL: str = "/openapi.json"
    
    @computed_field
    @property
    def is_development(self) -> bool:
        """Check if running in development mode."""
        return self.ENVIRONMENT == "development"
    
    @computed_field
    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.ENVIRONMENT == "production"
    
    @validator('STORAGE_DIR', pre=True)
    def create_storage_dir(cls, v):
        """Ensure storage directory exists."""
        path = Path(v) if isinstance(v, str) else v
        path.mkdir(parents=True, exist_ok=True)
        return path
    
    @validator('LOG_FILE_PATH', pre=True)
    def create_log_dir(cls, v):
        """Ensure log directory exists."""
        path = Path(v) if isinstance(v, str) else v
        path.parent.mkdir(parents=True, exist_ok=True)
        return path
    
    @validator('CORS_ORIGINS', pre=True)
    def parse_cors_origins(cls, v):
        """Parse CORS origins from string or list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v
    
    def get_database_url(self) -> str:
        """Get database URL with connection parameters."""
        return self.DATABASE_URL
    
    def get_redis_url(self) -> str:
        """Get Redis URL for caching and sessions."""
        return self.CELERY_BROKER_URL


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Global settings instance
settings = get_settings()