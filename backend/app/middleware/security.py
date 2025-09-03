"""
Security middleware and utilities
"""
import re
import html
import bleach
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, Request
from pydantic import BaseModel, validator
import logging

logger = logging.getLogger(__name__)

class InputSanitizer:
    """Input sanitization utilities"""
    
    # Allowed HTML tags for rich text fields
    ALLOWED_TAGS = [
        'p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote'
    ]
    
    ALLOWED_ATTRIBUTES = {
        '*': ['class'],
        'a': ['href', 'title'],
        'img': ['src', 'alt', 'title'],
    }
    
    # Dangerous patterns to detect
    DANGEROUS_PATTERNS = [
        r'<script[^>]*>.*?</script>',  # Script tags
        r'javascript:',               # JavaScript URLs
        r'on\w+\s*=',                # Event handlers
        r'<iframe[^>]*>',            # Iframes
        r'<object[^>]*>',            # Object tags
        r'<embed[^>]*>',             # Embed tags
        r'data:text/html',           # Data URLs with HTML
        r'vbscript:',                # VBScript URLs
    ]
    
    @classmethod
    def sanitize_html(cls, text: str) -> str:
        """Sanitize HTML input while preserving safe formatting"""
        if not text:
            return text
        
        # Check for dangerous patterns
        for pattern in cls.DANGEROUS_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                logger.warning(f"Dangerous pattern detected in input: {pattern}")
                raise HTTPException(
                    status_code=400,
                    detail="Invalid input detected. Please remove any scripts or unsafe HTML."
                )
        
        # Sanitize using bleach
        cleaned = bleach.clean(
            text,
            tags=cls.ALLOWED_TAGS,
            attributes=cls.ALLOWED_ATTRIBUTES,
            strip=True
        )
        
        return cleaned
    
    @classmethod
    def sanitize_text(cls, text: str) -> str:
        """Sanitize plain text input"""
        if not text:
            return text
        
        # HTML escape
        sanitized = html.escape(text)
        
        # Remove null bytes
        sanitized = sanitized.replace('\x00', '')
        
        # Limit length to prevent DoS
        if len(sanitized) > 10000:  # 10KB limit
            raise HTTPException(
                status_code=400,
                detail="Input text is too long. Maximum 10,000 characters allowed."
            )
        
        return sanitized
    
    @classmethod
    def validate_email(cls, email: str) -> str:
        """Validate and sanitize email"""
        if not email:
            raise HTTPException(status_code=400, detail="Email is required")
        
        # Basic email validation
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            raise HTTPException(status_code=400, detail="Invalid email format")
        
        # Length check
        if len(email) > 254:
            raise HTTPException(status_code=400, detail="Email is too long")
        
        return email.lower().strip()
    
    @classmethod
    def validate_filename(cls, filename: str) -> str:
        """Validate and sanitize filename"""
        if not filename:
            raise HTTPException(status_code=400, detail="Filename is required")
        
        # Remove dangerous characters
        dangerous_chars = ['/', '\\', '..', '<', '>', ':', '"', '|', '?', '*']
        for char in dangerous_chars:
            if char in filename:
                raise HTTPException(
                    status_code=400,
                    detail=f"Filename contains invalid character: {char}"
                )
        
        # Length check
        if len(filename) > 255:
            raise HTTPException(status_code=400, detail="Filename is too long")
        
        return filename.strip()
    
    @classmethod
    def validate_coordinates(cls, lat: Optional[float], lng: Optional[float]) -> tuple[float, float]:
        """Validate GPS coordinates"""
        if lat is None or lng is None:
            raise HTTPException(
                status_code=400,
                detail="Both latitude and longitude are required"
            )
        
        # Validate latitude range
        if not -90 <= lat <= 90:
            raise HTTPException(
                status_code=400,
                detail="Latitude must be between -90 and 90 degrees"
            )
        
        # Validate longitude range
        if not -180 <= lng <= 180:
            raise HTTPException(
                status_code=400,
                detail="Longitude must be between -180 and 180 degrees"
            )
        
        # For Sri Lanka, additional validation
        # Sri Lanka is roughly between 5.9°N-9.9°N and 79.7°E-81.9°E
        if not (5.0 <= lat <= 10.0 and 79.0 <= lng <= 82.0):
            logger.warning(f"Coordinates outside Sri Lanka: {lat}, {lng}")
            # Don't raise error, just log warning as property might be elsewhere
        
        return lat, lng

class SecureBaseModel(BaseModel):
    """Base model with input sanitization"""
    
    @validator('*', pre=True)
    def sanitize_strings(cls, v):
        """Sanitize all string inputs"""
        if isinstance(v, str):
            return InputSanitizer.sanitize_text(v)
        return v

# File upload security
class FileUploadValidator:
    """File upload security validation"""
    
    ALLOWED_MIME_TYPES = {
        'application/pdf',
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'image/bmp',
        'image/webp'
    }
    
    # Maximum file sizes by type (in bytes)
    MAX_FILE_SIZES = {
        'application/pdf': 50 * 1024 * 1024,  # 50MB for PDFs
        'image/jpeg': 20 * 1024 * 1024,       # 20MB for images
        'image/jpg': 20 * 1024 * 1024,
        'image/png': 20 * 1024 * 1024,
        'image/gif': 10 * 1024 * 1024,        # 10MB for GIFs
        'image/bmp': 20 * 1024 * 1024,
        'image/webp': 20 * 1024 * 1024,
    }
    
    # File signature validation (magic bytes)
    FILE_SIGNATURES = {
        'application/pdf': [b'%PDF-'],
        'image/jpeg': [b'\xff\xd8\xff'],
        'image/png': [b'\x89PNG\r\n\x1a\n'],
        'image/gif': [b'GIF87a', b'GIF89a'],
        'image/bmp': [b'BM'],
        'image/webp': [b'RIFF', b'WEBP'],
    }
    
    @classmethod
    def validate_file(cls, file_content: bytes, filename: str, mime_type: str) -> Dict[str, Any]:
        """Comprehensive file validation"""
        errors = []
        
        # Validate filename
        try:
            safe_filename = InputSanitizer.validate_filename(filename)
        except HTTPException as e:
            errors.append(f"Filename error: {e.detail}")
            safe_filename = filename
        
        # Check MIME type
        if mime_type not in cls.ALLOWED_MIME_TYPES:
            errors.append(f"File type '{mime_type}' is not allowed")
        
        # Check file size
        file_size = len(file_content)
        max_size = cls.MAX_FILE_SIZES.get(mime_type, 10 * 1024 * 1024)  # Default 10MB
        
        if file_size > max_size:
            max_mb = max_size / (1024 * 1024)
            errors.append(f"File size ({file_size / (1024 * 1024):.1f}MB) exceeds maximum allowed ({max_mb:.1f}MB)")
        
        # Validate file signature (magic bytes)
        if mime_type in cls.FILE_SIGNATURES:
            valid_signature = False
            for signature in cls.FILE_SIGNATURES[mime_type]:
                if file_content.startswith(signature):
                    valid_signature = True
                    break
            
            if not valid_signature:
                errors.append(f"File signature doesn't match declared type '{mime_type}'")
        
        # Check for embedded scripts in PDFs (basic check)
        if mime_type == 'application/pdf':
            dangerous_pdf_content = [b'/JavaScript', b'/JS', b'/OpenAction', b'/AA']
            for dangerous in dangerous_pdf_content:
                if dangerous in file_content:
                    errors.append("PDF contains potentially dangerous JavaScript content")
                    break
        
        # Check for suspicious patterns in any file
        suspicious_patterns = [
            b'<script',
            b'javascript:',
            b'vbscript:',
            b'data:text/html',
        ]
        
        for pattern in suspicious_patterns:
            if pattern in file_content.lower():
                errors.append("File contains suspicious content patterns")
                break
        
        if errors:
            raise HTTPException(
                status_code=400,
                detail=f"File validation failed: {'; '.join(errors)}"
            )
        
        return {
            'filename': safe_filename,
            'size': file_size,
            'mime_type': mime_type,
            'validation_passed': True
        }

# Request size limiting
def validate_request_size(request: Request, max_size_mb: int = 100):
    """Validate request content length"""
    content_length = request.headers.get('content-length')
    if content_length:
        size = int(content_length)
        max_size_bytes = max_size_mb * 1024 * 1024
        
        if size > max_size_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"Request too large. Maximum {max_size_mb}MB allowed."
            )

# SQL injection prevention helpers
def escape_sql_like(pattern: str) -> str:
    """Escape special characters in LIKE patterns"""
    return pattern.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')

def validate_sort_field(field: str, allowed_fields: List[str]) -> str:
    """Validate sort field name to prevent SQL injection"""
    if field not in allowed_fields:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid sort field. Allowed fields: {', '.join(allowed_fields)}"
        )
    return field

# Import required modules for middleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

# Security headers middleware
class SecurityMiddleware(BaseHTTPMiddleware):
    """Comprehensive security middleware with headers and validation"""
    
    def __init__(self, app):
        super().__init__(app)
    
    async def dispatch(self, request: Request, call_next) -> Response:
        # Pre-request security checks
        self._validate_request_security(request)
        
        # Process request
        response = await call_next(request)
        
        # Add security headers
        self._add_security_headers(response, request)
        
        return response
    
    def _validate_request_security(self, request: Request) -> None:
        """Validate request for security issues"""
        # Check for common attack patterns in URL
        dangerous_patterns = [
            '../', '..\\', 
            '<script', '</script>',
            'javascript:', 'vbscript:',
            'data:text/html',
            'eval(', 'alert(',
        ]
        
        url_path = str(request.url)
        for pattern in dangerous_patterns:
            if pattern.lower() in url_path.lower():
                raise HTTPException(
                    status_code=400,
                    detail="Request contains suspicious patterns"
                )
        
        # Validate request size
        content_length = request.headers.get('content-length')
        if content_length:
            try:
                size = int(content_length)
                max_size = 100 * 1024 * 1024  # 100MB
                if size > max_size:
                    raise HTTPException(
                        status_code=413,
                        detail=f"Request too large. Maximum {max_size // (1024*1024)}MB allowed."
                    )
            except ValueError:
                pass
    
    def _add_security_headers(self, response: Response, request: Request) -> None:
        """Add comprehensive security headers"""
        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"
        
        # XSS protection
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # HSTS (only for HTTPS)
        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        
        # Referrer policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Content Security Policy
        csp_directives = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: https:",
            "connect-src 'self'",
            "frame-ancestors 'none'",
        ]
        response.headers["Content-Security-Policy"] = "; ".join(csp_directives)
        
        # Permissions policy
        permissions_policy = [
            "geolocation=(self)",
            "microphone=()",
            "camera=()",
            "payment=()",
            "usb=()",
        ]
        response.headers["Permissions-Policy"] = ", ".join(permissions_policy)
        
        # Remove server header for security
        if "server" in response.headers:
            del response.headers["server"]
        
        # Add custom security headers
        response.headers["X-Powered-By"] = "ValuerPro"
        response.headers["X-API-Version"] = "2.0.0"