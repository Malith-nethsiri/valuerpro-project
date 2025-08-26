"""
Rate limiting middleware for API endpoints
"""
import time
from typing import Dict, Optional
from fastapi import HTTPException, Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import logging

logger = logging.getLogger(__name__)

class RateLimitStore:
    """In-memory store for rate limiting data"""
    
    def __init__(self):
        self._store: Dict[str, Dict[str, float]] = {}
    
    def get_request_count(self, key: str, window_start: float) -> int:
        """Get request count for a key within the time window"""
        if key not in self._store:
            return 0
        
        # Clean old entries
        self._store[key] = {
            timestamp: count for timestamp, count in self._store[key].items()
            if float(timestamp) >= window_start
        }
        
        return sum(self._store[key].values())
    
    def increment_request_count(self, key: str, timestamp: float):
        """Increment request count for a key"""
        if key not in self._store:
            self._store[key] = {}
        
        timestamp_key = str(timestamp)
        if timestamp_key not in self._store[key]:
            self._store[key][timestamp_key] = 0
        
        self._store[key][timestamp_key] += 1

# Global rate limit store
rate_limit_store = RateLimitStore()

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware"""
    
    def __init__(
        self,
        app,
        requests_per_minute: int = 60,
        requests_per_hour: int = 1000,
        burst_requests: int = 10,
        burst_window_seconds: int = 60
    ):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests_per_hour = requests_per_hour
        self.burst_requests = burst_requests
        self.burst_window_seconds = burst_window_seconds
    
    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip rate limiting for health checks
        if request.url.path in ["/health", "/docs", "/redoc", "/openapi.json"]:
            return await call_next(request)
        
        # Get client identifier
        client_ip = self._get_client_ip(request)
        current_time = time.time()
        
        try:
            # Check rate limits
            self._check_rate_limits(client_ip, current_time)
            
            # Record the request
            rate_limit_store.increment_request_count(f"{client_ip}:minute", current_time)
            rate_limit_store.increment_request_count(f"{client_ip}:hour", current_time)
            rate_limit_store.increment_request_count(f"{client_ip}:burst", current_time)
            
            # Process request
            response = await call_next(request)
            
            # Add rate limit headers
            response.headers["X-RateLimit-Requests-Per-Minute"] = str(self.requests_per_minute)
            response.headers["X-RateLimit-Requests-Per-Hour"] = str(self.requests_per_hour)
            
            return response
            
        except HTTPException as e:
            # Rate limit exceeded
            logger.warning(f"Rate limit exceeded for IP {client_ip}: {e.detail}")
            raise e
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address from request"""
        # Check for forwarded headers (proxy/load balancer)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(',')[0].strip()
        
        forwarded = request.headers.get("X-Forwarded")
        if forwarded:
            return forwarded.split(',')[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fallback to direct client IP
        if hasattr(request, 'client') and request.client:
            return request.client.host
        
        return "unknown"
    
    def _check_rate_limits(self, client_ip: str, current_time: float):
        """Check if client has exceeded rate limits"""
        
        # Check burst rate (quick successive requests)
        burst_window_start = current_time - self.burst_window_seconds
        burst_count = rate_limit_store.get_request_count(
            f"{client_ip}:burst", 
            burst_window_start
        )
        
        if burst_count >= self.burst_requests:
            raise HTTPException(
                status_code=429,
                detail=f"Too many requests. Maximum {self.burst_requests} requests per minute allowed.",
                headers={"Retry-After": str(self.burst_window_seconds)}
            )
        
        # Check per-minute rate
        minute_window_start = current_time - 60
        minute_count = rate_limit_store.get_request_count(
            f"{client_ip}:minute", 
            minute_window_start
        )
        
        if minute_count >= self.requests_per_minute:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. Maximum {self.requests_per_minute} requests per minute allowed.",
                headers={"Retry-After": "60"}
            )
        
        # Check per-hour rate
        hour_window_start = current_time - 3600
        hour_count = rate_limit_store.get_request_count(
            f"{client_ip}:hour", 
            hour_window_start
        )
        
        if hour_count >= self.requests_per_hour:
            raise HTTPException(
                status_code=429,
                detail=f"Hourly rate limit exceeded. Maximum {self.requests_per_hour} requests per hour allowed.",
                headers={"Retry-After": "3600"}
            )

# API endpoint specific rate limits
API_RATE_LIMITS = {
    "/api/v1/auth/login": {"requests_per_minute": 5, "requests_per_hour": 20},
    "/api/v1/auth/register": {"requests_per_minute": 3, "requests_per_hour": 10},
    "/api/v1/ocr/extract_text": {"requests_per_minute": 10, "requests_per_hour": 100},
    "/api/v1/ai/analyze_document": {"requests_per_minute": 5, "requests_per_hour": 50},
    "/api/v1/reports/": {"requests_per_minute": 30, "requests_per_hour": 200},
}

def check_endpoint_rate_limit(request: Request, endpoint_path: str):
    """Check rate limits for specific API endpoints"""
    if endpoint_path not in API_RATE_LIMITS:
        return
    
    limits = API_RATE_LIMITS[endpoint_path]
    client_ip = request.client.host if request.client else "unknown"
    current_time = time.time()
    
    # Check minute limit
    minute_window_start = current_time - 60
    minute_count = rate_limit_store.get_request_count(
        f"{client_ip}:{endpoint_path}:minute", 
        minute_window_start
    )
    
    if minute_count >= limits["requests_per_minute"]:
        raise HTTPException(
            status_code=429,
            detail=f"Endpoint rate limit exceeded. Maximum {limits['requests_per_minute']} requests per minute for this endpoint.",
            headers={"Retry-After": "60"}
        )
    
    # Check hour limit
    hour_window_start = current_time - 3600
    hour_count = rate_limit_store.get_request_count(
        f"{client_ip}:{endpoint_path}:hour", 
        hour_window_start
    )
    
    if hour_count >= limits["requests_per_hour"]:
        raise HTTPException(
            status_code=429,
            detail=f"Hourly endpoint rate limit exceeded. Maximum {limits['requests_per_hour']} requests per hour for this endpoint.",
            headers={"Retry-After": "3600"}
        )
    
    # Record the request
    rate_limit_store.increment_request_count(f"{client_ip}:{endpoint_path}:minute", current_time)
    rate_limit_store.increment_request_count(f"{client_ip}:{endpoint_path}:hour", current_time)

# Security headers middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses"""
    
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Remove server header for security
        if "server" in response.headers:
            del response.headers["server"]
        
        return response