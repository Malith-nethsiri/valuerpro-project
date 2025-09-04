"""
Comprehensive file validation service for uploads.
Validates file types, sizes, content, and security threats.
"""

import hashlib
import logging
from typing import Dict, List, Optional, Tuple, Any
from pathlib import Path
from datetime import datetime
import re
import os
import io

from fastapi import UploadFile, HTTPException
from PIL import Image, ImageFile
import fitz  # PyMuPDF

from app.core.config import settings

logger = logging.getLogger(__name__)

# Allow truncated images for PIL
ImageFile.LOAD_TRUNCATED_IMAGES = True


class ValidationError(Exception):
    """Custom validation error."""
    pass


class FileValidator:
    """Comprehensive file validation with security checks."""
    
    # Malicious file patterns
    MALICIOUS_PATTERNS = [
        rb'<script',
        rb'javascript:',
        rb'vbscript:',
        rb'on\w+\s*=',
        rb'<iframe',
        rb'<object',
        rb'<embed',
        rb'<?php',
        rb'<%',
        rb'exec\(',
        rb'eval\(',
        rb'system\(',
        rb'shell_exec\(',
    ]
    
    # Safe MIME types with their magic bytes
    MIME_TYPE_SIGNATURES = {
        'application/pdf': [b'%PDF-'],
        'image/jpeg': [b'\xff\xd8\xff'],
        'image/png': [b'\x89PNG\r\n\x1a\n'],
        'image/gif': [b'GIF87a', b'GIF89a'],
        'image/tiff': [b'II*\x00', b'MM\x00*'],
        'image/webp': [b'RIFF'],
        'application/zip': [b'PK\x03\x04', b'PK\x05\x06', b'PK\x07\x08'],
        'application/msword': [b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
            b'PK\x03\x04'  # DOCX is ZIP-based
        ],
    }
    
    # Maximum dimensions for images
    MAX_IMAGE_WIDTH = 10000
    MAX_IMAGE_HEIGHT = 10000
    
    def __init__(self):
        # Try to initialize python-magic, fall back to simple validation if not available
        # Disable python-magic for now due to library issues on Windows
        logger.info("Using basic file type detection (python-magic disabled)")
        self.magic_mime = None
        self.magic_type = None
        self.has_magic = False
    
    def validate_filename(self, filename: str) -> Dict[str, Any]:
        """Validate filename for security issues."""
        results = {
            'valid': True,
            'errors': [],
            'warnings': []
        }
        
        # Check for empty filename
        if not filename or filename.strip() == '':
            results['valid'] = False
            results['errors'].append('Filename cannot be empty')
            return results
        
        # Check for path traversal
        if '..' in filename or filename.startswith('/') or filename.startswith('\\'):
            results['valid'] = False
            results['errors'].append('Filename contains path traversal characters')
        
        # Check for dangerous characters
        dangerous_chars = ['<', '>', ':', '"', '|', '?', '*', '\x00']
        for char in dangerous_chars:
            if char in filename:
                results['valid'] = False
                results['errors'].append(f'Filename contains dangerous character: {char}')
        
        # Check filename length
        if len(filename) > 255:
            results['valid'] = False
            results['errors'].append('Filename too long (max 255 characters)')
        
        # Check for double extensions (potential malware)
        parts = filename.lower().split('.')
        if len(parts) > 2:
            executable_extensions = [
                'exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar',
                'app', 'deb', 'pkg', 'rpm', 'dmg', 'iso', 'msi'
            ]
            for part in parts[:-1]:  # All but the last extension
                if part in executable_extensions:
                    results['warnings'].append(
                        f'Filename contains potentially dangerous extension: .{part}'
                    )
        
        # Check for hidden files (Unix-style)
        if filename.startswith('.'):
            results['warnings'].append('Hidden file detected')
        
        return results
    
    def validate_file_signature(
        self, 
        content: bytes, 
        declared_mime_type: str
    ) -> Dict[str, Any]:
        """Validate file signature matches declared MIME type."""
        results = {
            'valid': True,
            'detected_mime_type': None,
            'mime_type_match': False,
            'errors': []
        }
        
        if len(content) < 64:
            results['errors'].append('File too small to validate signature')
            return results
        
        try:
            # Detect actual MIME type using python-magic if available
            if self.has_magic:
                detected_mime = self.magic_mime.from_buffer(content)
                results['detected_mime_type'] = detected_mime
                results['mime_type_match'] = detected_mime == declared_mime_type
            else:
                # Fallback to basic signature checking
                results['detected_mime_type'] = None
                results['mime_type_match'] = True  # Assume correct if magic not available
            
            # Check against known signatures
            file_header = content[:64]
            expected_signatures = self.MIME_TYPE_SIGNATURES.get(declared_mime_type, [])
            
            signature_match = False
            for signature in expected_signatures:
                if file_header.startswith(signature):
                    signature_match = True
                    break
                # For WEBP, check for WEBP marker after RIFF
                if declared_mime_type == 'image/webp' and signature == b'RIFF':
                    if file_header.startswith(b'RIFF') and b'WEBP' in content[:20]:
                        signature_match = True
                        break
            
            if expected_signatures and not signature_match:
                results['valid'] = False
                results['errors'].append(
                    f'File signature does not match declared type {declared_mime_type}'
                )
            
            # Additional validation for specific types
            if declared_mime_type == 'application/pdf':
                if not self._validate_pdf_content(content):
                    results['valid'] = False
                    results['errors'].append('Invalid or corrupted PDF file')
            
            elif declared_mime_type.startswith('image/'):
                image_validation = self._validate_image_content(content)
                if not image_validation['valid']:
                    results['valid'] = False
                    results['errors'].extend(image_validation['errors'])
        
        except Exception as e:
            logger.error(f"File signature validation error: {e}")
            results['valid'] = False
            results['errors'].append(f'File signature validation failed: {str(e)}')
        
        return results
    
    def _validate_pdf_content(self, content: bytes) -> bool:
        """Validate PDF file structure."""
        try:
            # Use PyMuPDF to validate PDF
            doc = fitz.open(stream=content, filetype="pdf")
            page_count = doc.page_count
            doc.close()
            return page_count >= 0
        except Exception as e:
            logger.error(f"PDF validation error: {e}")
            return False
    
    def _validate_image_content(self, content: bytes) -> Dict[str, Any]:
        """Validate image file content and properties."""
        results = {
            'valid': True,
            'errors': [],
            'properties': {}
        }
        
        try:
            # Open and validate image with PIL
            image = Image.open(io.BytesIO(content))
            
            # Get image properties
            results['properties'] = {
                'width': image.width,
                'height': image.height,
                'format': image.format,
                'mode': image.mode,
                'has_transparency': 'transparency' in image.info or 'A' in image.mode
            }
            
            # Check image dimensions
            if image.width > self.MAX_IMAGE_WIDTH or image.height > self.MAX_IMAGE_HEIGHT:
                results['valid'] = False
                results['errors'].append(
                    f'Image dimensions too large: {image.width}x{image.height} '
                    f'(max: {self.MAX_IMAGE_WIDTH}x{self.MAX_IMAGE_HEIGHT})'
                )
            
            # Check for minimum dimensions
            if image.width < 1 or image.height < 1:
                results['valid'] = False
                results['errors'].append('Image has invalid dimensions')
            
            # Verify image can be processed
            image.verify()
            
        except Exception as e:
            logger.error(f"Image validation error: {e}")
            results['valid'] = False
            results['errors'].append(f'Invalid or corrupted image: {str(e)}')
        
        return results
    
    def scan_for_malicious_content(self, content: bytes) -> Dict[str, Any]:
        """Scan file content for malicious patterns."""
        results = {
            'threats_found': [],
            'is_safe': True,
            'risk_level': 'low'
        }
        
        content_lower = content.lower()
        
        for pattern in self.MALICIOUS_PATTERNS:
            if pattern in content_lower:
                threat_name = pattern.decode('utf-8', errors='ignore')
                results['threats_found'].append(f'Suspicious pattern: {threat_name}')
                results['is_safe'] = False
        
        # Check for suspicious file embedded in content
        if b'PK\x03\x04' in content and len(content) > 1000:
            # Could be embedded ZIP/Office document
            zip_count = content.count(b'PK\x03\x04')
            if zip_count > 3:  # Multiple ZIP signatures could indicate nested archives
                results['threats_found'].append('Multiple embedded archives detected')
                results['risk_level'] = 'medium'
        
        # Check for excessive metadata or EXIF data
        if content.count(b'\x00') > len(content) * 0.3:  # Too many null bytes
            results['threats_found'].append('Suspicious null byte density')
            results['risk_level'] = 'medium'
        
        # Determine overall risk level
        if len(results['threats_found']) > 0:
            results['is_safe'] = False
            if len(results['threats_found']) > 2:
                results['risk_level'] = 'high'
            elif results['risk_level'] != 'medium':
                results['risk_level'] = 'medium'
        
        return results
    
    def validate_file_size(self, size: int) -> Dict[str, Any]:
        """Validate file size constraints."""
        results = {
            'valid': True,
            'errors': [],
            'size': size
        }
        
        if size <= 0:
            results['valid'] = False
            results['errors'].append('File size cannot be zero or negative')
        
        if size > settings.MAX_FILE_SIZE:
            results['valid'] = False
            results['errors'].append(
                f'File size ({size} bytes) exceeds maximum allowed '
                f'({settings.MAX_FILE_SIZE} bytes)'
            )
        
        return results
    
    async def validate_upload_file(self, file: UploadFile) -> Dict[str, Any]:
        """Comprehensive validation of an uploaded file."""
        validation_results = {
            'valid': True,
            'errors': [],
            'warnings': [],
            'file_info': {
                'filename': file.filename,
                'content_type': file.content_type,
                'size': file.size
            },
            'security_scan': {},
            'content_validation': {}
        }
        
        try:
            # Validate filename
            filename_validation = self.validate_filename(file.filename or '')
            if not filename_validation['valid']:
                validation_results['valid'] = False
                validation_results['errors'].extend(filename_validation['errors'])
            validation_results['warnings'].extend(filename_validation['warnings'])
            
            # Validate file size
            if file.size is not None:
                size_validation = self.validate_file_size(file.size)
                if not size_validation['valid']:
                    validation_results['valid'] = False
                    validation_results['errors'].extend(size_validation['errors'])
            
            # Validate MIME type is allowed
            if file.content_type not in settings.ALLOWED_MIME_TYPES:
                validation_results['valid'] = False
                validation_results['errors'].append(
                    f'File type not allowed: {file.content_type}'
                )
            
            # Read file content for deeper validation
            content = await file.read()
            await file.seek(0)  # Reset file pointer
            
            # Calculate file hash for deduplication/integrity
            file_hash = hashlib.sha256(content).hexdigest()
            validation_results['file_info']['sha256'] = file_hash
            
            # Validate file signature
            if file.content_type:
                signature_validation = self.validate_file_signature(
                    content, file.content_type
                )
                validation_results['content_validation'] = signature_validation
                
                if not signature_validation['valid']:
                    validation_results['valid'] = False
                    validation_results['errors'].extend(signature_validation['errors'])
            
            # Security scan
            security_scan = self.scan_for_malicious_content(content)
            validation_results['security_scan'] = security_scan
            
            if not security_scan['is_safe']:
                validation_results['valid'] = False
                validation_results['errors'].extend([
                    f"Security threat detected: {threat}" 
                    for threat in security_scan['threats_found']
                ])
            
            # Add risk level to results
            validation_results['risk_level'] = security_scan.get('risk_level', 'low')
            
        except Exception as e:
            logger.error(f"File validation error: {e}")
            validation_results['valid'] = False
            validation_results['errors'].append(f'Validation failed: {str(e)}')
        
        return validation_results
    
    def get_allowed_extensions(self) -> List[str]:
        """Get list of allowed file extensions based on MIME types."""
        extension_map = {
            'application/pdf': ['.pdf'],
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png'],
            'image/gif': ['.gif'],
            'image/tiff': ['.tiff', '.tif'],
            'image/webp': ['.webp'],
            'application/msword': ['.doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
        }
        
        extensions = []
        for mime_type in settings.ALLOWED_MIME_TYPES:
            extensions.extend(extension_map.get(mime_type, []))
        
        return sorted(list(set(extensions)))


# Global validator instance
file_validator = FileValidator()


# Convenience function for FastAPI dependency injection
async def validate_file_upload(file: UploadFile) -> Dict[str, Any]:
    """Validate uploaded file and raise HTTPException if invalid."""
    validation = await file_validator.validate_upload_file(file)
    
    if not validation['valid']:
        error_details = {
            'message': 'File validation failed',
            'errors': validation['errors'],
            'warnings': validation.get('warnings', []),
            'filename': file.filename
        }
        
        # Determine appropriate HTTP status code
        if any('security threat' in error.lower() for error in validation['errors']):
            status_code = 400  # Bad Request for security issues
        elif any('file type not allowed' in error.lower() for error in validation['errors']):
            status_code = 415  # Unsupported Media Type
        elif any('file size' in error.lower() for error in validation['errors']):
            status_code = 413  # Payload Too Large
        else:
            status_code = 400  # Generic Bad Request
        
        raise HTTPException(status_code=status_code, detail=error_details)
    
    return validation