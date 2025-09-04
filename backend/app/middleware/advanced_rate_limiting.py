"""
Advanced Rate Limiting Middleware for AI Endpoints
Implements multiple rate limiting strategies with Redis backing and user-based limits.
"""
import asyncio
import time
import json
from datetime import datetime, timedelta
from typing import Dict, Optional, Callable, Any, List
from dataclasses import dataclass, asdict
from enum import Enum
import logging

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import redis.asyncio as redis

logger = logging.getLogger(__name__)


class RateLimitType(Enum):
    REQUESTS_PER_MINUTE = "rpm"
    REQUESTS_PER_HOUR = "rph"  
    REQUESTS_PER_DAY = "rpd"
    TOKENS_PER_MINUTE = "tpm"
    TOKENS_PER_HOUR = "tph"
    CONCURRENT_REQUESTS = "concurrent"


@dataclass
class RateLimitRule:
    """Rate limit rule configuration"""
    limit_type: RateLimitType
    limit: int
    window_seconds: int
    burst_limit: Optional[int] = None
    cost_per_request: int = 1


@dataclass
class RateLimitStatus:
    """Current rate limit status for a user/endpoint"""
    used: int
    limit: int
    remaining: int
    reset_time: datetime
    retry_after: Optional[int] = None


class RateLimitStore:
    """Abstract rate limit storage interface"""
    
    async def get_usage(self, key: str) -> int:
        raise NotImplementedError
    
    async def increment(self, key: str, cost: int, ttl: int) -> int:
        raise NotImplementedError
    
    async def get_concurrent_count(self, key: str) -> int:
        raise NotImplementedError
    
    async def acquire_slot(self, key: str, ttl: int = 300) -> bool:
        raise NotImplementedError
    
    async def release_slot(self, key: str) -> None:
        raise NotImplementedError


class RedisRateLimitStore(RateLimitStore):
    """Redis-backed rate limit store"""
    
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis_url = redis_url
        self._redis: Optional[redis.Redis] = None
    
    async def _get_redis(self) -> redis.Redis:
        if self._redis is None:
            self._redis = redis.from_url(self.redis_url)
        return self._redis
    
    async def get_usage(self, key: str) -> int:
        r = await self._get_redis()
        try:
            value = await r.get(key)
            return int(value) if value else 0
        except Exception as e:
            logger.error(f"Redis get_usage error: {e}")
            return 0
    
    async def increment(self, key: str, cost: int, ttl: int) -> int:
        r = await self._get_redis()
        try:
            pipe = r.pipeline()
            pipe.multi()
            pipe.incrby(key, cost)
            pipe.expire(key, ttl)
            results = await pipe.execute()
            return int(results[0])
        except Exception as e:
            logger.error(f"Redis increment error: {e}")
            return cost
    
    async def get_concurrent_count(self, key: str) -> int:
        r = await self._get_redis()
        try:
            return await r.scard(key)
        except Exception as e:
            logger.error(f"Redis get_concurrent_count error: {e}")
            return 0
    
    async def acquire_slot(self, key: str, ttl: int = 300) -> bool:
        r = await self._get_redis()
        try:
            # Use a unique identifier for this request
            slot_id = f"{time.time()}-{id(asyncio.current_task())}"
            pipe = r.pipeline()
            pipe.multi()
            pipe.sadd(key, slot_id)
            pipe.expire(key, ttl)
            await pipe.execute()
            return True
        except Exception as e:
            logger.error(f"Redis acquire_slot error: {e}")
            return False
    
    async def release_slot(self, key: str) -> None:
        r = await self._get_redis()
        try:
            # Remove all members (simple cleanup approach)
            await r.delete(key)
        except Exception as e:
            logger.error(f"Redis release_slot error: {e}")


class InMemoryRateLimitStore(RateLimitStore):
    """In-memory rate limit store (for development/testing)"""
    
    def __init__(self):
        self._counters: Dict[str, Dict[str, Any]] = {}
        self._concurrent: Dict[str, set] = {}
    
    def _cleanup_expired(self, key: str):
        """Remove expired entries"""
        now = time.time()
        if key in self._counters:
            expired_keys = [
                k for k, v in self._counters[key].items() 
                if v.get('expires', 0) < now
            ]
            for expired_key in expired_keys:
                del self._counters[key][expired_key]
    
    async def get_usage(self, key: str) -> int:
        self._cleanup_expired(key)
        if key not in self._counters:
            return 0
        return sum(v.get('count', 0) for v in self._counters[key].values())
    
    async def increment(self, key: str, cost: int, ttl: int) -> int:
        now = time.time()
        expires = now + ttl
        
        if key not in self._counters:
            self._counters[key] = {}
        
        # Use current timestamp as sub-key to handle sliding windows
        time_key = str(int(now))
        
        if time_key not in self._counters[key]:
            self._counters[key][time_key] = {'count': 0, 'expires': expires}
        
        self._counters[key][time_key]['count'] += cost
        self._cleanup_expired(key)
        
        return await self.get_usage(key)
    
    async def get_concurrent_count(self, key: str) -> int:
        return len(self._concurrent.get(key, set()))
    
    async def acquire_slot(self, key: str, ttl: int = 300) -> bool:
        if key not in self._concurrent:
            self._concurrent[key] = set()
        
        slot_id = f"{time.time()}-{id(asyncio.current_task())}"
        self._concurrent[key].add(slot_id)
        return True
    
    async def release_slot(self, key: str) -> None:
        if key in self._concurrent:
            self._concurrent[key].clear()


class AdvancedRateLimiter:
    """Advanced rate limiter with multiple strategies and user-specific limits"""
    
    def __init__(
        self, 
        store: Optional[RateLimitStore] = None,
        default_rules: Optional[List[RateLimitRule]] = None
    ):
        self.store = store or InMemoryRateLimitStore()
        self.default_rules = default_rules or [
            # Default AI endpoint limits
            RateLimitRule(RateLimitType.REQUESTS_PER_MINUTE, 10, 60),
            RateLimitRule(RateLimitType.REQUESTS_PER_HOUR, 100, 3600),
            RateLimitRule(RateLimitType.CONCURRENT_REQUESTS, 3, 300),
        ]
        self.endpoint_rules: Dict[str, List[RateLimitRule]] = {}
        self.user_multipliers: Dict[str, float] = {}
        self._active_requests: Dict[str, set] = {}
    
    def configure_endpoint(self, endpoint_pattern: str, rules: List[RateLimitRule]):
        """Configure specific rules for an endpoint pattern"""
        self.endpoint_rules[endpoint_pattern] = rules
    
    def configure_user_limits(self, user_id: str, multiplier: float):
        """Configure user-specific limit multipliers"""
        self.user_multipliers[user_id] = multiplier
    
    def _get_rules_for_endpoint(self, endpoint: str) -> List[RateLimitRule]:
        """Get applicable rules for an endpoint"""
        # Check for exact match first
        if endpoint in self.endpoint_rules:
            return self.endpoint_rules[endpoint]
        
        # Check for pattern matches
        for pattern, rules in self.endpoint_rules.items():
            if pattern in endpoint or endpoint.endswith(pattern):
                return rules
        
        return self.default_rules
    
    def _get_rate_limit_key(self, user_id: str, endpoint: str, rule: RateLimitRule) -> str:
        """Generate rate limit key for storage"""
        window = rule.window_seconds
        current_window = int(time.time() / window) * window
        return f"rl:{user_id}:{endpoint}:{rule.limit_type.value}:{current_window}"
    
    async def check_rate_limit(
        self, 
        user_id: str, 
        endpoint: str, 
        cost: int = 1
    ) -> Dict[str, RateLimitStatus]:
        """Check if request is within rate limits"""
        rules = self._get_rules_for_endpoint(endpoint)
        user_multiplier = self.user_multipliers.get(user_id, 1.0)
        statuses = {}
        
        for rule in rules:
            # Apply user multiplier to limits
            effective_limit = int(rule.limit * user_multiplier)
            
            if rule.limit_type == RateLimitType.CONCURRENT_REQUESTS:
                # Handle concurrent requests separately
                key = f"concurrent:{user_id}:{endpoint}"
                current_count = await self.store.get_concurrent_count(key)
                
                statuses[rule.limit_type.value] = RateLimitStatus(
                    used=current_count,
                    limit=effective_limit,
                    remaining=max(0, effective_limit - current_count),
                    reset_time=datetime.now() + timedelta(seconds=rule.window_seconds)
                )
                
                if current_count >= effective_limit:
                    statuses[rule.limit_type.value].retry_after = rule.window_seconds
                
            else:
                # Handle rate-based limits
                key = self._get_rate_limit_key(user_id, endpoint, rule)
                current_usage = await self.store.get_usage(key)
                
                statuses[rule.limit_type.value] = RateLimitStatus(
                    used=current_usage,
                    limit=effective_limit,
                    remaining=max(0, effective_limit - current_usage - cost),
                    reset_time=datetime.now() + timedelta(seconds=rule.window_seconds)
                )
                
                if current_usage + cost > effective_limit:
                    statuses[rule.limit_type.value].retry_after = rule.window_seconds
        
        return statuses
    
    async def consume_quota(
        self, 
        user_id: str, 
        endpoint: str, 
        cost: int = 1
    ) -> bool:
        """Consume quota if within limits"""
        # Check limits first
        statuses = await self.check_rate_limit(user_id, endpoint, cost)
        
        # Check if any limits are exceeded
        for status in statuses.values():
            if status.retry_after is not None:
                return False
        
        # Consume quota for all applicable rules
        rules = self._get_rules_for_endpoint(endpoint)
        for rule in rules:
            if rule.limit_type == RateLimitType.CONCURRENT_REQUESTS:
                key = f"concurrent:{user_id}:{endpoint}"
                await self.store.acquire_slot(key, rule.window_seconds)
            else:
                key = self._get_rate_limit_key(user_id, endpoint, rule)
                await self.store.increment(key, cost, rule.window_seconds)
        
        return True
    
    async def release_concurrent_slot(self, user_id: str, endpoint: str):
        """Release concurrent request slot"""
        key = f"concurrent:{user_id}:{endpoint}"
        await self.store.release_slot(key)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """FastAPI middleware for rate limiting"""
    
    def __init__(
        self,
        app,
        limiter: AdvancedRateLimiter,
        ai_endpoint_patterns: List[str] = None
    ):
        super().__init__(app)
        self.limiter = limiter
        self.ai_endpoint_patterns = ai_endpoint_patterns or [
            "/ai/", "/ocr/", "/analyze", "/extract", "/parse"
        ]
    
    def _is_ai_endpoint(self, path: str) -> bool:
        """Check if request is to an AI endpoint"""
        return any(pattern in path for pattern in self.ai_endpoint_patterns)
    
    def _get_user_id(self, request: Request) -> Optional[str]:
        """Extract user ID from request"""
        # Try to get user from authentication
        user = getattr(request.state, 'user', None)
        if user:
            return str(user.id)
        
        # Fallback to IP address for unauthenticated requests
        client_ip = request.client.host if request.client else "unknown"
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        
        return f"ip:{client_ip}"
    
    async def dispatch(self, request: Request, call_next):
        # Only apply rate limiting to AI endpoints
        if not self._is_ai_endpoint(request.url.path):
            return await call_next(request)
        
        user_id = self._get_user_id(request)
        endpoint = request.url.path
        
        # Check and consume quota
        can_proceed = await self.limiter.consume_quota(user_id, endpoint)
        
        if not can_proceed:
            # Get current status for error response
            statuses = await self.limiter.check_rate_limit(user_id, endpoint)
            
            # Find the most restrictive limit
            retry_after = min(
                (status.retry_after for status in statuses.values() 
                 if status.retry_after is not None),
                default=60
            )
            
            # Prepare rate limit headers
            headers = {}
            for limit_type, status in statuses.items():
                headers[f"X-RateLimit-{limit_type}-Limit"] = str(status.limit)
                headers[f"X-RateLimit-{limit_type}-Remaining"] = str(status.remaining)
                headers[f"X-RateLimit-{limit_type}-Reset"] = str(int(status.reset_time.timestamp()))
            
            headers["Retry-After"] = str(retry_after)
            
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": "Rate limit exceeded",
                    "message": f"Too many requests. Please try again in {retry_after} seconds.",
                    "retry_after": retry_after,
                    "rate_limits": {
                        k: asdict(v) for k, v in statuses.items()
                    }
                },
                headers=headers
            )
        
        # Process the request
        try:
            response = await call_next(request)
            
            # Add rate limit headers to successful responses
            statuses = await self.limiter.check_rate_limit(user_id, endpoint, 0)
            for limit_type, status in statuses.items():
                response.headers[f"X-RateLimit-{limit_type}-Limit"] = str(status.limit)
                response.headers[f"X-RateLimit-{limit_type}-Remaining"] = str(status.remaining)
                response.headers[f"X-RateLimit-{limit_type}-Reset"] = str(int(status.reset_time.timestamp()))
            
            return response
            
        finally:
            # Release concurrent slots
            await self.limiter.release_concurrent_slot(user_id, endpoint)


# Predefined configurations for different AI endpoints
AI_ENDPOINT_CONFIGS = {
    "/ai/analyze_document": [
        RateLimitRule(RateLimitType.REQUESTS_PER_MINUTE, 5, 60),
        RateLimitRule(RateLimitType.REQUESTS_PER_HOUR, 50, 3600),
        RateLimitRule(RateLimitType.CONCURRENT_REQUESTS, 2, 300),
        RateLimitRule(RateLimitType.TOKENS_PER_MINUTE, 10000, 60),
    ],
    "/ai/extract_text": [
        RateLimitRule(RateLimitType.REQUESTS_PER_MINUTE, 10, 60),
        RateLimitRule(RateLimitType.REQUESTS_PER_HOUR, 100, 3600),
        RateLimitRule(RateLimitType.CONCURRENT_REQUESTS, 3, 300),
    ],
    "/ai/parse": [
        RateLimitRule(RateLimitType.REQUESTS_PER_MINUTE, 8, 60),
        RateLimitRule(RateLimitType.REQUESTS_PER_HOUR, 80, 3600),
        RateLimitRule(RateLimitType.CONCURRENT_REQUESTS, 3, 300),
    ],
}