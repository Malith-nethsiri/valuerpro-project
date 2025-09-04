"""
Advanced security hardening middleware for production environments.
Implements additional security layers beyond basic measures.
"""

import hashlib
import hmac
import time
import secrets
import logging
from typing import Dict, List, Optional, Set, Any
from datetime import datetime, timedelta
from collections import defaultdict, deque
import re
import ipaddress
from urllib.parse import urlparse

from fastapi import Request, Response, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
import jwt

from app.core.config import settings

logger = logging.getLogger(__name__)


class SecurityMetrics:
    """Security event tracking and monitoring."""
    
    def __init__(self, max_events: int = 1000):
        self.max_events = max_events
        self.suspicious_requests = deque(maxlen=max_events)
        self.blocked_ips = defaultdict(int)
        self.attack_patterns = defaultdict(int)
        self.failed_auth_attempts = defaultdict(deque)  # IP -> attempts
        self.rate_limit_violations = defaultdict(int)
        
    def record_suspicious_activity(
        self, 
        ip: str, 
        activity_type: str, 
        details: Dict = None,
        severity: str = 'medium'
    ):
        """Record suspicious security activity."""
        event = {
            'timestamp': datetime.utcnow().isoformat(),
            'ip': ip,
            'type': activity_type,
            'severity': severity,
            'details': details or {}
        }
        
        self.suspicious_requests.append(event)
        self.attack_patterns[activity_type] += 1
        
        logger.warning(
            f"Security Event: {activity_type} from {ip} - "
            f"Severity: {severity} - Details: {details}"
        )
    
    def record_auth_failure(self, ip: str):
        """Record failed authentication attempt."""
        now = datetime.utcnow()
        if ip not in self.failed_auth_attempts:
            self.failed_auth_attempts[ip] = deque(maxlen=100)
        
        self.failed_auth_attempts[ip].append(now)
        
        # Clean old attempts (older than 1 hour)
        hour_ago = now - timedelta(hours=1)
        while (self.failed_auth_attempts[ip] and 
               self.failed_auth_attempts[ip][0] < hour_ago):
            self.failed_auth_attempts[ip].popleft()
    
    def get_failed_auth_count(self, ip: str, minutes: int = 15) -> int:
        """Get failed authentication count for IP in last N minutes."""
        if ip not in self.failed_auth_attempts:
            return 0
        
        cutoff = datetime.utcnow() - timedelta(minutes=minutes)
        return sum(1 for attempt in self.failed_auth_attempts[ip] if attempt > cutoff)
    
    def should_block_ip(self, ip: str) -> bool:
        """Check if IP should be temporarily blocked."""
        # Block if too many failed auth attempts
        recent_failures = self.get_failed_auth_count(ip, 15)
        if recent_failures >= 5:
            return True
        
        # Block if too many rate limit violations
        if self.rate_limit_violations.get(ip, 0) >= 10:
            return True
        
        return False


# Global security metrics
security_metrics = SecurityMetrics()


class IPWhitelist:
    """IP address whitelist management."""
    
    def __init__(self):
        self.whitelisted_ips: Set[str] = set()
        self.whitelisted_networks: List[ipaddress.IPv4Network] = []
        
        # Add common development IPs
        if settings.ENVIRONMENT == 'development':
            self.whitelisted_ips.update(['127.0.0.1', '::1', 'localhost'])
            self.whitelisted_networks.append(ipaddress.IPv4Network('192.168.0.0/16'))
            self.whitelisted_networks.append(ipaddress.IPv4Network('10.0.0.0/8'))
    
    def is_whitelisted(self, ip: str) -> bool:
        """Check if IP is whitelisted."""
        if ip in self.whitelisted_ips:
            return True
        
        try:
            ip_obj = ipaddress.IPv4Address(ip)
            return any(ip_obj in network for network in self.whitelisted_networks)
        except ipaddress.AddressValueError:
            return False
    
    def add_ip(self, ip: str):
        """Add IP to whitelist."""
        self.whitelisted_ips.add(ip)
    
    def add_network(self, network: str):
        """Add network range to whitelist."""
        self.whitelisted_networks.append(ipaddress.IPv4Network(network))


class SecurityPatternDetector:
    """Detect common attack patterns in requests."""
    
    # SQL Injection patterns
    SQL_INJECTION_PATTERNS = [
        r"(\b(select|union|insert|delete|update|drop|create|alter|exec|execute)\b)",
        r"(--|;|\/\*|\*\/)",
        r"(\bor\b.*=.*\bor\b)",
        r"(\bunion\b.*\bselect\b)",
        r"(\b1=1\b|\b1=2\b)"
    ]
    
    # XSS patterns
    XSS_PATTERNS = [
        r"(<script[^>]*>.*?</script>)",
        r"(javascript:)",
        r"(on\w+\s*=)",
        r"(<iframe[^>]*>)",
        r"(eval\s*\()",
        r"(expression\s*\()"
    ]
    
    # Command injection patterns
    COMMAND_INJECTION_PATTERNS = [
        r"(;|\||\&\&|\|\|)",
        r"(\b(cat|ls|pwd|whoami|id|uname|wget|curl|nc|netcat)\b)",
        r"(\.\.\/|\.\.\\)",
        r"(\/etc\/passwd|\/etc\/shadow)",
        r"(\$\(|\`)"
    ]
    
    # Path traversal patterns
    PATH_TRAVERSAL_PATTERNS = [
        r"(\.\.\/|\.\.\\)",
        r"(%2e%2e%2f|%2e%2e%5c)",
        r"(\/etc\/|\/proc\/|\/sys\/)",
        r"(\.\.%2f|\.\.%5c)"
    ]
    
    def __init__(self):
        # Compile patterns for better performance
        self.sql_regex = [re.compile(pattern, re.IGNORECASE) for pattern in self.SQL_INJECTION_PATTERNS]
        self.xss_regex = [re.compile(pattern, re.IGNORECASE) for pattern in self.XSS_PATTERNS]
        self.cmd_regex = [re.compile(pattern, re.IGNORECASE) for pattern in self.COMMAND_INJECTION_PATTERNS]
        self.path_regex = [re.compile(pattern, re.IGNORECASE) for pattern in self.PATH_TRAVERSAL_PATTERNS]
    
    def detect_sql_injection(self, text: str) -> Optional[str]:
        """Detect SQL injection attempts."""
        for pattern in self.sql_regex:
            if pattern.search(text):
                return f"SQL injection pattern detected: {pattern.pattern}"
        return None
    
    def detect_xss(self, text: str) -> Optional[str]:
        """Detect XSS attempts."""
        for pattern in self.xss_regex:
            if pattern.search(text):
                return f"XSS pattern detected: {pattern.pattern}"
        return None
    
    def detect_command_injection(self, text: str) -> Optional[str]:
        """Detect command injection attempts."""
        for pattern in self.cmd_regex:
            if pattern.search(text):
                return f"Command injection pattern detected: {pattern.pattern}"
        return None
    
    def detect_path_traversal(self, text: str) -> Optional[str]:
        """Detect path traversal attempts."""
        for pattern in self.path_regex:
            if pattern.search(text):
                return f"Path traversal pattern detected: {pattern.pattern}"
        return None
    
    def scan_request(self, request_data: str) -> List[str]:
        """Scan request data for all attack patterns."""
        threats = []
        
        # Check each attack type
        for detector in [
            self.detect_sql_injection,
            self.detect_xss,
            self.detect_command_injection,
            self.detect_path_traversal
        ]:
            threat = detector(request_data)
            if threat:
                threats.append(threat)
        
        return threats


class SecurityHardeningMiddleware(BaseHTTPMiddleware):
    """Advanced security middleware for production environments."""
    
    def __init__(self, app, enable_pattern_detection: bool = True):
        super().__init__(app)
        self.ip_whitelist = IPWhitelist()
        self.pattern_detector = SecurityPatternDetector()
        self.enable_pattern_detection = enable_pattern_detection
        
        # Security configuration
        self.max_request_size = 10 * 1024 * 1024  # 10MB
        self.max_header_count = 50
        self.max_header_length = 8192
        self.blocked_user_agents = [
            'sqlmap', 'nikto', 'nmap', 'masscan', 'zap', 'burpsuite'
        ]
    
    def _get_client_ip(self, request: Request) -> str:
        """Get the real client IP address."""
        # Check for forwarded IP headers
        forwarded_for = request.headers.get('X-Forwarded-For')
        if forwarded_for:
            # Get the first IP in the chain (original client)
            return forwarded_for.split(',')[0].strip()
        
        real_ip = request.headers.get('X-Real-IP')
        if real_ip:
            return real_ip
        
        # Fallback to direct client IP
        return request.client.host if request.client else 'unknown'
    
    def _validate_headers(self, request: Request) -> Optional[str]:
        """Validate request headers for security issues."""
        headers = dict(request.headers)
        
        # Check header count
        if len(headers) > self.max_header_count:
            return f"Too many headers: {len(headers)} > {self.max_header_count}"
        
        # Check header lengths
        for name, value in headers.items():
            if len(value) > self.max_header_length:
                return f"Header too long: {name} = {len(value)} bytes"
        
        # Check for suspicious User-Agent
        user_agent = request.headers.get('User-Agent', '').lower()
        for blocked_agent in self.blocked_user_agents:
            if blocked_agent in user_agent:
                return f"Blocked user agent: {blocked_agent}"
        
        # Check for HTTP method override attacks
        method_override = request.headers.get('X-HTTP-Method-Override')
        if method_override and method_override.upper() not in ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']:
            return f"Invalid method override: {method_override}"
        
        return None
    
    async def _scan_request_data(self, request: Request) -> List[str]:
        """Scan request data for attack patterns."""
        if not self.enable_pattern_detection:
            return []
        
        threats = []
        
        # Scan URL and query parameters
        url_data = str(request.url)
        threats.extend(self.pattern_detector.scan_request(url_data))
        
        # Scan headers
        for name, value in request.headers.items():
            if name.lower() not in ['authorization', 'cookie']:  # Skip sensitive headers
                header_data = f"{name}:{value}"
                threats.extend(self.pattern_detector.scan_request(header_data))
        
        # Scan request body (if present and not too large)
        try:
            if hasattr(request, '_body'):
                body = request._body
                if body and len(body) < 10000:  # Only scan small bodies
                    body_text = body.decode('utf-8', errors='ignore')
                    threats.extend(self.pattern_detector.scan_request(body_text))
        except Exception:
            pass  # Skip body scanning if there are issues
        
        return threats
    
    def _add_security_headers(self, response: Response):
        """Add security headers to response."""
        if settings.is_production:
            # Strict security headers for production
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["X-XSS-Protection"] = "1; mode=block"
            response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
            response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "font-src 'self'; "
                "connect-src 'self'; "
                "frame-ancestors 'none'"
            )
        else:
            # Relaxed headers for development
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["X-Frame-Options"] = "SAMEORIGIN"
    
    async def dispatch(self, request: Request, call_next):
        client_ip = self._get_client_ip(request)
        
        # Skip security checks for whitelisted IPs in development
        if settings.ENVIRONMENT == 'development' and self.ip_whitelist.is_whitelisted(client_ip):
            response = await call_next(request)
            self._add_security_headers(response)
            return response
        
        # Check if IP should be blocked
        if security_metrics.should_block_ip(client_ip):
            security_metrics.record_suspicious_activity(
                client_ip, 
                'blocked_ip', 
                {'reason': 'too_many_failures'},
                'high'
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="IP temporarily blocked due to suspicious activity"
            )
        
        # Validate request size
        content_length = request.headers.get('Content-Length')
        if content_length and int(content_length) > self.max_request_size:
            security_metrics.record_suspicious_activity(
                client_ip,
                'large_request',
                {'size': content_length},
                'medium'
            )
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Request too large"
            )
        
        # Validate headers
        header_error = self._validate_headers(request)
        if header_error:
            security_metrics.record_suspicious_activity(
                client_ip,
                'invalid_headers',
                {'error': header_error},
                'medium'
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid request headers"
            )
        
        # Scan for attack patterns
        threats = await self._scan_request_data(request)
        if threats:
            security_metrics.record_suspicious_activity(
                client_ip,
                'attack_patterns',
                {'threats': threats},
                'high'
            )
            
            # Block obvious attacks in production
            if settings.is_production and len(threats) > 2:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Request blocked by security filter"
                )
            
            # Log but allow in development
            logger.warning(f"Security threats detected from {client_ip}: {threats}")
        
        try:
            # Process request
            response = await call_next(request)
            
            # Add security headers
            self._add_security_headers(response)
            
            # Add security monitoring headers in development
            if settings.ENVIRONMENT == 'development':
                response.headers["X-Security-Scan"] = "passed"
                if threats:
                    response.headers["X-Security-Threats"] = str(len(threats))
            
            return response
            
        except HTTPException as e:
            # Record security-related HTTP exceptions
            if e.status_code in [400, 401, 403, 404, 429]:
                security_metrics.record_suspicious_activity(
                    client_ip,
                    f'http_{e.status_code}',
                    {'detail': str(e.detail)},
                    'low'
                )
            raise
        
        except Exception as e:
            # Record unexpected errors
            security_metrics.record_suspicious_activity(
                client_ip,
                'server_error',
                {'error': str(e)},
                'low'
            )
            raise


class TokenSecurity:
    """Enhanced JWT token security utilities."""
    
    @staticmethod
    def create_secure_token(payload: Dict, secret: str = None) -> str:
        """Create a secure JWT token with additional claims."""
        secret = secret or settings.SECRET_KEY
        
        # Add security claims
        now = datetime.utcnow()
        secure_payload = {
            **payload,
            'iat': now,
            'exp': now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
            'jti': secrets.token_urlsafe(32),  # Unique token ID
            'iss': 'valuerpro-api',  # Issuer
            'aud': 'valuerpro-client',  # Audience
        }
        
        return jwt.encode(secure_payload, secret, algorithm=settings.ALGORITHM)
    
    @staticmethod
    def validate_token_security(token: str, secret: str = None) -> Dict:
        """Validate token with enhanced security checks."""
        secret = secret or settings.SECRET_KEY
        
        try:
            # Decode with audience and issuer validation
            payload = jwt.decode(
                token, 
                secret, 
                algorithms=[settings.ALGORITHM],
                audience='valuerpro-client',
                issuer='valuerpro-api'
            )
            
            # Additional security validations
            required_claims = ['sub', 'iat', 'exp', 'jti']
            missing_claims = [claim for claim in required_claims if claim not in payload]
            if missing_claims:
                raise jwt.InvalidTokenError(f"Missing claims: {missing_claims}")
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.InvalidTokenError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {str(e)}"
            )


# Utility functions
def get_security_report() -> Dict[str, Any]:
    """Get comprehensive security monitoring report."""
    return {
        'timestamp': datetime.utcnow().isoformat(),
        'suspicious_requests_count': len(security_metrics.suspicious_requests),
        'blocked_ips_count': len(security_metrics.blocked_ips),
        'attack_patterns': dict(security_metrics.attack_patterns),
        'recent_events': list(security_metrics.suspicious_requests)[-10:],  # Last 10 events
        'top_attack_sources': dict(sorted(
            security_metrics.blocked_ips.items(), 
            key=lambda x: x[1], 
            reverse=True
        )[:10])
    }