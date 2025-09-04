"""
Environment configuration validation and security checks.
"""
import os
import warnings
from typing import Optional, Dict, Any, List
import logging
from pydantic import BaseSettings, Field, validator
from pathlib import Path

logger = logging.getLogger(__name__)


class SecurityValidator:
    """Validates security-related environment configurations."""
    
    @staticmethod
    def validate_secret_key(secret_key: str) -> None:
        """Validate SECRET_KEY strength and security."""
        if not secret_key:
            raise ValueError("SECRET_KEY is required")
        
        if len(secret_key) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters long")
        
        # Check for default/weak keys
        weak_keys = [
            "your-very-secure-secret-key-change-in-production",
            "secret",
            "password",
            "12345",
            "changeme",
            "default"
        ]
        
        if any(weak in secret_key.lower() for weak in weak_keys):
            raise ValueError("SECRET_KEY appears to be a default or weak value. Use a strong, random key.")
        
        # In production, ensure it looks random
        if os.getenv("ENVIRONMENT") == "production":
            if secret_key.isalnum() and len(set(secret_key)) < 16:
                warnings.warn(
                    "SECRET_KEY may not be sufficiently random for production use",
                    UserWarning
                )
    
    @staticmethod
    def validate_database_url(url: str) -> None:
        """Validate database URL security."""
        if not url:
            raise ValueError("DATABASE_URL is required")
        
        # Check for development defaults in production
        if os.getenv("ENVIRONMENT") == "production":
            insecure_patterns = ["postgres:postgres", "localhost", "127.0.0.1", ":5432"]
            if any(pattern in url for pattern in insecure_patterns):
                warnings.warn(
                    "DATABASE_URL contains potentially insecure values for production",
                    UserWarning
                )
    
    @staticmethod
    def validate_cors_origins(origins: List[str]) -> None:
        """Validate CORS origins configuration."""
        if not origins:
            warnings.warn("No CORS origins configured", UserWarning)
            return
        
        if os.getenv("ENVIRONMENT") == "production":
            dangerous_origins = ["*", "http://localhost", "http://127.0.0.1"]
            for origin in origins:
                if any(dangerous in str(origin) for dangerous in dangerous_origins):
                    raise ValueError(
                        f"Dangerous CORS origin '{origin}' not allowed in production"
                    )


class EnvironmentValidator(BaseSettings):
    """Comprehensive environment validation."""
    
    # Required settings
    database_url: str = Field(..., env="DATABASE_URL")
    secret_key: str = Field(..., env="SECRET_KEY")
    environment: str = Field("development", env="ENVIRONMENT")
    
    # Security settings
    algorithm: str = Field("HS256", env="ALGORITHM")
    access_token_expire_minutes: int = Field(30, env="ACCESS_TOKEN_EXPIRE_MINUTES")
    
    # CORS settings
    allowed_origins: List[str] = Field(default_factory=list, env="ALLOWED_ORIGINS")
    
    # Storage settings
    storage_dir: str = Field("./storage", env="STORAGE_DIR")
    max_file_size: int = Field(10485760, env="MAX_FILE_SIZE")  # 10MB
    
    # Optional API keys (validate if present)
    google_maps_api_key: Optional[str] = Field(None, env="GOOGLE_MAPS_API_KEY")
    openai_api_key: Optional[str] = Field(None, env="OPENAI_API_KEY")
    aws_access_key_id: Optional[str] = Field(None, env="AWS_ACCESS_KEY_ID")
    aws_secret_access_key: Optional[str] = Field(None, env="AWS_SECRET_ACCESS_KEY")
    
    class Config:
        env_file = ".env"
        case_sensitive = False
    
    @validator("secret_key")
    def validate_secret_key(cls, v):
        SecurityValidator.validate_secret_key(v)
        return v
    
    @validator("database_url")
    def validate_database_url(cls, v):
        SecurityValidator.validate_database_url(v)
        return v
    
    @validator("allowed_origins")
    def validate_allowed_origins(cls, v):
        SecurityValidator.validate_cors_origins(v)
        return v
    
    @validator("storage_dir")
    def validate_storage_dir(cls, v):
        """Ensure storage directory exists and is secure."""
        path = Path(v)
        path.mkdir(parents=True, exist_ok=True)
        
        # Check permissions in production
        if os.getenv("ENVIRONMENT") == "production":
            if path.stat().st_mode & 0o077:
                warnings.warn(
                    f"Storage directory '{v}' has overly permissive permissions",
                    UserWarning
                )
        
        return v
    
    @validator("environment")
    def validate_environment(cls, v):
        """Validate environment setting."""
        valid_envs = ["development", "staging", "production", "test"]
        if v not in valid_envs:
            raise ValueError(f"Environment must be one of: {valid_envs}")
        
        # Production-specific checks
        if v == "production":
            logger.info("Production environment detected - enabling security checks")
        
        return v


def validate_environment() -> Dict[str, Any]:
    """
    Validate all environment variables and return configuration.
    
    Raises:
        ValueError: If required variables are missing or invalid
        UserWarning: For potentially insecure configurations
    
    Returns:
        Dict containing validated configuration
    """
    try:
        config = EnvironmentValidator()
        
        # Additional security checks
        if config.environment == "production":
            _check_production_security()
        
        # Log validation success
        logger.info(f"Environment validation successful for '{config.environment}' environment")
        
        return config.dict()
    
    except Exception as e:
        logger.error(f"Environment validation failed: {e}")
        raise


def _check_production_security():
    """Additional security checks for production environment."""
    
    # Check for debug flags
    if os.getenv("DEBUG", "").lower() in ("true", "1", "yes"):
        raise ValueError("DEBUG mode is not allowed in production")
    
    # Check SSL/TLS requirements
    if not os.getenv("FORCE_HTTPS", "").lower() in ("true", "1", "yes"):
        warnings.warn("FORCE_HTTPS is not enabled in production", UserWarning)
    
    # Check logging configuration
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    if log_level in ("DEBUG", "TRACE"):
        warnings.warn(
            f"Log level '{log_level}' may expose sensitive information in production",
            UserWarning
        )
    
    # Check for test/development artifacts
    test_vars = [
        "TEST_DATABASE_URL",
        "DEV_API_KEY",
        "MOCK_SERVICES"
    ]
    
    for var in test_vars:
        if os.getenv(var):
            warnings.warn(
                f"Test/development variable '{var}' found in production environment",
                UserWarning
            )


def generate_secure_secret_key(length: int = 64) -> str:
    """Generate a cryptographically secure secret key."""
    import secrets
    import string
    
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for _ in range(length))


if __name__ == "__main__":
    # CLI utility for environment validation
    import sys
    
    try:
        config = validate_environment()
        print("✅ Environment validation successful!")
        print(f"Environment: {config['environment']}")
        print(f"Database configured: {'Yes' if config['database_url'] else 'No'}")
        print(f"CORS origins: {len(config['allowed_origins'])} configured")
        
    except ValueError as e:
        print(f"❌ Environment validation failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)