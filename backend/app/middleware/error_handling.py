"""
Comprehensive error handling middleware for the ValuerPro application.
"""

import logging
import traceback
from typing import Dict, Any, List
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError, DataError, OperationalError
from starlette.middleware.base import BaseHTTPMiddleware

# Configure logging
logger = logging.getLogger(__name__)


class ErrorResponse:
    """Standard error response format"""
    
    def __init__(self, 
                 message: str, 
                 status_code: int = 500,
                 error_type: str = "InternalServerError",
                 details: Dict[str, Any] = None,
                 field_errors: List[Dict[str, str]] = None):
        self.message = message
        self.status_code = status_code
        self.error_type = error_type
        self.details = details or {}
        self.field_errors = field_errors or []

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON response"""
        response = {
            "error": True,
            "error_type": self.error_type,
            "message": self.message,
        }
        
        if self.details:
            response["details"] = self.details
            
        if self.field_errors:
            response["field_errors"] = self.field_errors
            
        return response


def format_validation_errors(errors: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    """Format pydantic validation errors for client consumption"""
    formatted_errors = []
    
    for error in errors:
        field_path = ".".join(str(loc) for loc in error["loc"])
        error_message = error["msg"]
        error_type = error.get("type", "validation_error")
        
        # Clean up common pydantic error messages
        if error_type == "value_error":
            # Extract the actual error message from ValueError
            if error_message.startswith("Value error, "):
                error_message = error_message[13:]
        elif error_type == "missing":
            error_message = "This field is required"
        elif error_type == "string_too_short":
            min_length = error.get("ctx", {}).get("limit_value", "required")
            error_message = f"Must be at least {min_length} characters"
        elif error_type == "string_too_long":
            max_length = error.get("ctx", {}).get("limit_value", "allowed")
            error_message = f"Must be no more than {max_length} characters"
        
        formatted_errors.append({
            "field": field_path,
            "message": error_message,
            "type": error_type
        })
    
    return formatted_errors


def handle_database_error(exc: Exception) -> ErrorResponse:
    """Handle database-related errors"""
    if isinstance(exc, IntegrityError):
        if "duplicate key" in str(exc).lower() or "unique constraint" in str(exc).lower():
            return ErrorResponse(
                message="A record with this information already exists",
                status_code=409,
                error_type="DuplicateError",
                details={"constraint": "unique_constraint"}
            )
        elif "foreign key" in str(exc).lower():
            return ErrorResponse(
                message="Referenced record does not exist",
                status_code=400,
                error_type="ForeignKeyError",
                details={"constraint": "foreign_key"}
            )
        else:
            return ErrorResponse(
                message="Database constraint violation",
                status_code=400,
                error_type="ConstraintError"
            )
    
    elif isinstance(exc, DataError):
        return ErrorResponse(
            message="Invalid data format",
            status_code=400,
            error_type="DataError"
        )
    
    elif isinstance(exc, OperationalError):
        return ErrorResponse(
            message="Database connection error",
            status_code=503,
            error_type="DatabaseError"
        )
    
    return ErrorResponse(
        message="Database error occurred",
        status_code=500,
        error_type="DatabaseError"
    )


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """Middleware to handle all application errors consistently"""

    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
            
        except HTTPException:
            # Re-raise HTTP exceptions to be handled by FastAPI
            raise
            
        except RequestValidationError as exc:
            # Handle FastAPI request validation errors
            logger.warning(f"Request validation error: {exc}")
            
            error_response = ErrorResponse(
                message="Invalid request data",
                status_code=422,
                error_type="ValidationError",
                field_errors=format_validation_errors(exc.errors())
            )
            
            return JSONResponse(
                status_code=error_response.status_code,
                content=error_response.to_dict()
            )
            
        except ValidationError as exc:
            # Handle pydantic validation errors
            logger.warning(f"Pydantic validation error: {exc}")
            
            error_response = ErrorResponse(
                message="Data validation failed",
                status_code=422,
                error_type="ValidationError",
                field_errors=format_validation_errors(exc.errors())
            )
            
            return JSONResponse(
                status_code=error_response.status_code,
                content=error_response.to_dict()
            )
            
        except (IntegrityError, DataError, OperationalError) as exc:
            # Handle database errors
            logger.error(f"Database error: {exc}")
            error_response = handle_database_error(exc)
            
            return JSONResponse(
                status_code=error_response.status_code,
                content=error_response.to_dict()
            )
            
        except Exception as exc:
            # Handle all other exceptions
            logger.error(f"Unhandled exception: {exc}", exc_info=True)
            
            # In production, don't expose internal error details
            error_response = ErrorResponse(
                message="An internal server error occurred",
                status_code=500,
                error_type="InternalServerError",
                details={"trace_id": id(exc)} if logger.isEnabledFor(logging.DEBUG) else {}
            )
            
            return JSONResponse(
                status_code=error_response.status_code,
                content=error_response.to_dict()
            )


# Custom exception classes for business logic errors
class BusinessLogicError(Exception):
    """Base class for business logic errors"""
    def __init__(self, message: str, status_code: int = 400, error_type: str = "BusinessLogicError"):
        self.message = message
        self.status_code = status_code
        self.error_type = error_type
        super().__init__(message)


class ValidationError(BusinessLogicError):
    """Validation error with field-specific details"""
    def __init__(self, message: str, field_errors: List[Dict[str, str]] = None):
        super().__init__(message, 422, "ValidationError")
        self.field_errors = field_errors or []


class NotFoundError(BusinessLogicError):
    """Resource not found error"""
    def __init__(self, resource: str, identifier: str = None):
        message = f"{resource} not found"
        if identifier:
            message += f" (ID: {identifier})"
        super().__init__(message, 404, "NotFoundError")


class PermissionDeniedError(BusinessLogicError):
    """Permission denied error"""
    def __init__(self, action: str, resource: str = None):
        message = f"Permission denied for action: {action}"
        if resource:
            message += f" on {resource}"
        super().__init__(message, 403, "PermissionDeniedError")


class DuplicateResourceError(BusinessLogicError):
    """Duplicate resource error"""
    def __init__(self, resource: str, field: str = None):
        message = f"{resource} already exists"
        if field:
            message += f" with this {field}"
        super().__init__(message, 409, "DuplicateResourceError")


class InvalidOperationError(BusinessLogicError):
    """Invalid operation error"""
    def __init__(self, operation: str, reason: str = None):
        message = f"Invalid operation: {operation}"
        if reason:
            message += f" - {reason}"
        super().__init__(message, 400, "InvalidOperationError")


# Validation helper functions
def validate_report_ownership(report, user):
    """Validate that user owns the report"""
    if report.author_id != user.id:
        raise PermissionDeniedError("access", "report")


def validate_file_ownership(file, user):
    """Validate that user owns the file"""
    if file.uploaded_by != user.id:
        raise PermissionDeniedError("access", "file")


def validate_report_status_transition(current_status: str, new_status: str):
    """Validate report status transitions"""
    valid_transitions = {
        'draft': ['in_review', 'finalized'],
        'in_review': ['draft', 'approved', 'finalized'],
        'approved': ['finalized'],
        'finalized': ['archived'],
        'archived': []  # No transitions from archived
    }
    
    if new_status not in valid_transitions.get(current_status, []):
        raise InvalidOperationError(
            f"status transition from '{current_status}' to '{new_status}'",
            f"Valid transitions from '{current_status}': {', '.join(valid_transitions.get(current_status, []))}"
        )


def validate_file_upload(file, max_size: int = 10 * 1024 * 1024, allowed_types: List[str] = None):
    """Validate uploaded file"""
    if allowed_types is None:
        allowed_types = [
            'application/pdf', 'image/jpeg', 'image/png', 'image/gif',
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]
    
    if file.size > max_size:
        raise ValidationError(
            f"File size exceeds maximum allowed size of {max_size // (1024*1024)}MB",
            [{"field": "file", "message": f"File too large (max {max_size // (1024*1024)}MB)"}]
        )
    
    if file.content_type not in allowed_types:
        raise ValidationError(
            f"File type '{file.content_type}' not allowed",
            [{"field": "file", "message": f"File type not supported. Allowed types: {', '.join(allowed_types)}"}]
        )


# Logging configuration
def setup_error_logging():
    """Setup comprehensive error logging"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler('app_errors.log', mode='a')
        ]
    )
    
    # Set specific loggers
    logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)
    logging.getLogger('uvicorn.access').setLevel(logging.INFO)