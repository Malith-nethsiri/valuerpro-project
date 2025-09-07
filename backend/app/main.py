from contextlib import asynccontextmanager
from typing import Any
import logging
from datetime import datetime

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import PlainTextResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import time

from app.core.config import settings
from app.api.api_v1.api import api_router
from app.middleware.security import SecurityMiddleware
from app.middleware.rate_limiting import RateLimitMiddleware
from app.middleware.advanced_rate_limiting import (
    AdvancedRateLimiter, 
    RateLimitMiddleware as AdvancedRateLimitMiddleware,
    RedisRateLimitStore,
    InMemoryRateLimitStore,
    RateLimitRule,
    RateLimitType,
    AI_ENDPOINT_CONFIGS
)
from app.middleware.error_handling import ErrorHandlingMiddleware
from app.middleware.performance_monitoring import PerformanceMiddleware
from app.middleware.security_hardening import SecurityHardeningMiddleware
from app.core.logging_config import setup_logging

# Set up production-ready logging
setup_logging()
logger = logging.getLogger('app.main')


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management with proper startup/shutdown."""
    # Startup
    logger.info("Starting ValuerPro API server...")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Debug mode: {settings.DEBUG}")
    logger.info(f"API Version: {settings.APP_VERSION}")
    
    # Create necessary directories
    settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    settings.LOG_FILE_PATH.parent.mkdir(parents=True, exist_ok=True)
    
    # Initialize database connections, cache, etc. here
    # await database.connect()
    # await cache.connect()
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down ValuerPro API server...")
    # await database.disconnect()
    # await cache.disconnect()


# Create FastAPI application with modern configuration
app = FastAPI(
    title=settings.APP_NAME,
    description=settings.APP_DESCRIPTION,
    version=settings.APP_VERSION,
    openapi_url=settings.OPENAPI_URL,
    docs_url=settings.DOCS_URL if settings.is_development else None,
    redoc_url=settings.REDOC_URL if settings.is_development else None,
    lifespan=lifespan,
    # Enhanced metadata
    contact={
        "name": "ValuerPro Support",
        "email": "support@valuerpro.com",
    },
    license_info={
        "name": "Proprietary",
    },
)

# Error Handling Middleware - Must be first to catch all errors
app.add_middleware(ErrorHandlingMiddleware)

# Security Hardening Middleware - Advanced security measures
app.add_middleware(SecurityHardeningMiddleware, enable_pattern_detection=settings.is_production)

# Performance Monitoring Middleware - Fixed async issue in SQLAlchemy event handler (reload trigger)
app.add_middleware(PerformanceMiddleware, enable_db_monitoring=True)

# Security Middleware - Add basic security headers
app.add_middleware(SecurityMiddleware)

# Advanced Rate Limiting Middleware for AI endpoints
if settings.RATE_LIMIT_ENABLED:
    # Initialize appropriate store based on environment
    if settings.ENVIRONMENT == "development":
        rate_limit_store = InMemoryRateLimitStore()
    else:
        # Use Redis for production
        redis_url = settings.get_rate_limit_redis_url()
        rate_limit_store = RedisRateLimitStore(redis_url)
    
    # Create advanced rate limiter with endpoint-specific configs
    advanced_limiter = AdvancedRateLimiter(
        store=rate_limit_store,
        default_rules=[
            RateLimitRule(RateLimitType.REQUESTS_PER_MINUTE, 60 if settings.ENVIRONMENT == "development" else 20, 60),
            RateLimitRule(RateLimitType.REQUESTS_PER_HOUR, 1000 if settings.ENVIRONMENT == "development" else 200, 3600),
            RateLimitRule(RateLimitType.CONCURRENT_REQUESTS, 10 if settings.ENVIRONMENT == "development" else 3, 300),
        ]
    )
    
    # Configure endpoint-specific limits
    for endpoint_pattern, rules in AI_ENDPOINT_CONFIGS.items():
        advanced_limiter.configure_endpoint(endpoint_pattern, rules)
    
    # Add the advanced rate limiting middleware
    app.add_middleware(
        AdvancedRateLimitMiddleware,
        limiter=advanced_limiter,
        ai_endpoint_patterns=["/api/v1/ai/", "/api/v1/ocr/"]
    )

# Trusted Host Middleware - Prevent host header attacks
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "*.valuerpro.com"] + settings.CORS_ORIGINS
)

# GZip Compression Middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Enhanced CORS Configuration - More permissive for development
if settings.ENVIRONMENT == "development":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Allow all origins in development
        allow_credentials=False,  # Cannot use credentials with wildcard origin
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Total-Count", "X-Rate-Limit-Remaining", "X-Rate-Limit-Reset"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
        allow_methods=settings.CORS_ALLOW_METHODS,
        allow_headers=settings.CORS_ALLOW_HEADERS,
        expose_headers=["X-Total-Count", "X-Rate-Limit-Remaining", "X-Rate-Limit-Reset"],
    )

# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Add response time to headers."""
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    
    # Log slow requests
    if process_time > 1.0:
        logger.warning(f"Slow request: {request.method} {request.url.path} took {process_time:.2f}s")
    
    return response

# Global exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with detailed response."""
    return JSONResponse(
        status_code=422,
        content={
            "error": "Validation Error",
            "detail": exc.errors(),
            "body": str(exc.body) if hasattr(exc, 'body') else None,
            "timestamp": datetime.utcnow().isoformat(),
            "path": str(request.url.path),
        },
    )

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions with consistent format."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code,
            "timestamp": datetime.utcnow().isoformat(),
            "path": str(request.url.path),
        },
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    
    if settings.is_development:
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal Server Error",
                "detail": str(exc),
                "type": type(exc).__name__,
                "timestamp": datetime.utcnow().isoformat(),
                "path": str(request.url.path),
            },
        )
    else:
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal Server Error",
                "message": "An unexpected error occurred",
                "timestamp": datetime.utcnow().isoformat(),
            },
        )

# Include API routers
app.include_router(api_router, prefix=settings.API_V1_STR)

# Health check endpoints
@app.get("/health", tags=["system"])
async def health_check():
    """Enhanced health check endpoint with system information."""
    return {
        "status": "healthy",
        "service": "valuerpro-backend",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.utcnow().isoformat(),
        "uptime": "running",
    }

@app.get("/health/detailed", tags=["system"])
async def detailed_health_check():
    """Detailed health check with dependency status."""
    # In production, add checks for database, cache, external APIs
    checks = {
        "database": "healthy",  # await check_database()
        "storage": "healthy" if settings.STORAGE_DIR.exists() else "unhealthy",
        "external_apis": {
            "google_maps": "configured" if settings.GOOGLE_MAPS_API_KEY else "not_configured",
            "openai": "configured" if settings.OPENAI_API_KEY else "not_configured",
        }
    }
    
    overall_status = "healthy" if all(
        check == "healthy" for check in checks.values() if isinstance(check, str)
    ) else "degraded"
    
    return {
        "status": overall_status,
        "service": "valuerpro-backend",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.utcnow().isoformat(),
        "checks": checks,
    }

@app.get("/robots.txt", response_class=PlainTextResponse, tags=["system"])
async def robots_txt():
    """Robots.txt for web crawlers with proper configuration."""
    if settings.is_production:
        robots_content = """User-agent: *
Disallow: /api/
Disallow: /docs
Disallow: /redoc
Disallow: /openapi.json

User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /"""
    else:
        robots_content = """User-agent: *
Disallow: /"""
    
    return robots_content

@app.get("/version", tags=["system"])
async def get_version():
    """Get API version information."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "description": settings.APP_DESCRIPTION,
        "environment": settings.ENVIRONMENT,
    }