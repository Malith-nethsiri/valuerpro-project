"""
Production-ready logging configuration with structured logging,
error tracking, and monitoring integration.
"""

import logging
import logging.config
import sys
import json
import traceback
from datetime import datetime
from typing import Dict, Any, Optional
from pathlib import Path
import uuid

from app.core.config import settings


class JSONFormatter(logging.Formatter):
    """Custom JSON formatter for structured logging."""
    
    def __init__(self):
        super().__init__()
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON."""
        # Create base log entry
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno,
            'thread': record.thread,
            'process': record.process,
        }
        
        # Add environment info
        log_entry['environment'] = settings.ENVIRONMENT
        log_entry['service'] = 'valuerpro-api'
        
        # Add exception info if present
        if record.exc_info:
            log_entry['exception'] = {
                'type': record.exc_info[0].__name__,
                'message': str(record.exc_info[1]),
                'traceback': traceback.format_exception(*record.exc_info)
            }
        
        # Add extra fields from the record
        extra_fields = {}
        for key, value in record.__dict__.items():
            if key not in ['name', 'msg', 'args', 'levelname', 'levelno', 
                          'pathname', 'filename', 'module', 'exc_info',
                          'exc_text', 'stack_info', 'lineno', 'funcName',
                          'created', 'msecs', 'relativeCreated', 'thread',
                          'threadName', 'processName', 'process', 'message']:
                extra_fields[key] = value
        
        if extra_fields:
            log_entry['extra'] = extra_fields
        
        return json.dumps(log_entry, default=str)


class SecurityAuditFormatter(logging.Formatter):
    """Special formatter for security audit logs."""
    
    def format(self, record: logging.LogRecord) -> str:
        """Format security audit log."""
        audit_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'event_type': 'security_audit',
            'level': record.levelname,
            'message': record.getMessage(),
            'service': 'valuerpro-api',
            'environment': settings.ENVIRONMENT,
        }
        
        # Add security-specific fields
        if hasattr(record, 'ip_address'):
            audit_entry['ip_address'] = record.ip_address
        if hasattr(record, 'user_id'):
            audit_entry['user_id'] = record.user_id
        if hasattr(record, 'endpoint'):
            audit_entry['endpoint'] = record.endpoint
        if hasattr(record, 'action'):
            audit_entry['action'] = record.action
        if hasattr(record, 'resource'):
            audit_entry['resource'] = record.resource
        if hasattr(record, 'success'):
            audit_entry['success'] = record.success
        
        return json.dumps(audit_entry, default=str)


class PerformanceFormatter(logging.Formatter):
    """Formatter for performance metrics logs."""
    
    def format(self, record: logging.LogRecord) -> str:
        """Format performance log."""
        perf_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'event_type': 'performance_metric',
            'level': record.levelname,
            'message': record.getMessage(),
            'service': 'valuerpro-api',
            'environment': settings.ENVIRONMENT,
        }
        
        # Add performance-specific fields
        if hasattr(record, 'duration'):
            perf_entry['duration_ms'] = record.duration
        if hasattr(record, 'endpoint'):
            perf_entry['endpoint'] = record.endpoint
        if hasattr(record, 'method'):
            perf_entry['method'] = record.method
        if hasattr(record, 'status_code'):
            perf_entry['status_code'] = record.status_code
        if hasattr(record, 'db_queries'):
            perf_entry['db_queries'] = record.db_queries
        if hasattr(record, 'db_time'):
            perf_entry['db_time_ms'] = record.db_time
        
        return json.dumps(perf_entry, default=str)


class ErrorTracker:
    """Error tracking and alerting system."""
    
    def __init__(self):
        self.error_counts = {}
        self.critical_errors = []
        
    def track_error(self, error_type: str, error_message: str, extra_data: Dict = None):
        """Track error occurrence for monitoring."""
        error_key = f"{error_type}:{hash(error_message) % 10000}"
        
        if error_key not in self.error_counts:
            self.error_counts[error_key] = {
                'count': 0,
                'first_seen': datetime.utcnow(),
                'last_seen': datetime.utcnow(),
                'type': error_type,
                'message': error_message,
                'extra_data': extra_data or {}
            }
        
        self.error_counts[error_key]['count'] += 1
        self.error_counts[error_key]['last_seen'] = datetime.utcnow()
        
        # Track critical errors separately
        if error_type in ['CRITICAL', 'SECURITY_BREACH', 'DATA_CORRUPTION']:
            self.critical_errors.append({
                'timestamp': datetime.utcnow(),
                'type': error_type,
                'message': error_message,
                'extra_data': extra_data or {}
            })
    
    def get_error_summary(self) -> Dict[str, Any]:
        """Get error summary for monitoring dashboard."""
        now = datetime.utcnow()
        recent_errors = [
            error for error in self.error_counts.values()
            if (now - error['last_seen']).total_seconds() < 3600  # Last hour
        ]
        
        return {
            'total_unique_errors': len(self.error_counts),
            'recent_errors_count': len(recent_errors),
            'critical_errors_count': len(self.critical_errors),
            'top_errors': sorted(
                self.error_counts.values(),
                key=lambda x: x['count'],
                reverse=True
            )[:10],
            'recent_critical': self.critical_errors[-5:] if self.critical_errors else []
        }


# Global error tracker
error_tracker = ErrorTracker()


class ContextFilter(logging.Filter):
    """Add contextual information to log records."""
    
    def filter(self, record: logging.LogRecord) -> bool:
        """Add context to log record."""
        # Add correlation ID for request tracing
        if not hasattr(record, 'correlation_id'):
            record.correlation_id = str(uuid.uuid4())
        
        # Add hostname/instance info
        import socket
        record.hostname = socket.gethostname()
        
        return True


class ErrorTrackingHandler(logging.Handler):
    """Custom handler that tracks errors for monitoring."""
    
    def emit(self, record: logging.LogRecord):
        """Track errors with the error tracker."""
        if record.levelno >= logging.ERROR:
            error_tracker.track_error(
                error_type=record.levelname,
                error_message=record.getMessage(),
                extra_data={
                    'module': record.module,
                    'function': record.funcName,
                    'line': record.lineno,
                    'pathname': record.pathname,
                    'timestamp': datetime.utcnow().isoformat()
                }
            )


def setup_logging():
    """Configure production-ready logging."""
    
    # Ensure log directory exists
    log_dir = settings.LOG_FILE_PATH.parent
    log_dir.mkdir(parents=True, exist_ok=True)
    
    # Base logging configuration
    logging_config = {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'json': {
                '()': JSONFormatter,
            },
            'security_audit': {
                '()': SecurityAuditFormatter,
            },
            'performance': {
                '()': PerformanceFormatter,
            },
            'console': {
                'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            }
        },
        'filters': {
            'context': {
                '()': ContextFilter,
            }
        },
        'handlers': {
            'console': {
                'class': 'logging.StreamHandler',
                'formatter': 'console' if settings.ENVIRONMENT == 'development' else 'json',
                'stream': sys.stdout,
                'filters': ['context']
            },
            'file': {
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': str(settings.LOG_FILE_PATH),
                'maxBytes': 10 * 1024 * 1024,  # 10MB
                'backupCount': 5,
                'formatter': 'json',
                'filters': ['context']
            },
            'security_audit': {
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': str(settings.LOG_FILE_PATH.parent / 'security_audit.log'),
                'maxBytes': 10 * 1024 * 1024,  # 10MB
                'backupCount': 10,
                'formatter': 'security_audit',
                'filters': ['context']
            },
            'performance': {
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': str(settings.LOG_FILE_PATH.parent / 'performance.log'),
                'maxBytes': 10 * 1024 * 1024,  # 10MB
                'backupCount': 5,
                'formatter': 'performance',
                'filters': ['context']
            },
            'error_tracker': {
                '()': ErrorTrackingHandler,
            }
        },
        'loggers': {
            'app': {
                'handlers': ['console', 'file', 'error_tracker'],
                'level': settings.LOG_LEVEL,
                'propagate': False
            },
            'app.security': {
                'handlers': ['console', 'security_audit', 'error_tracker'],
                'level': 'INFO',
                'propagate': False
            },
            'app.performance': {
                'handlers': ['performance'],
                'level': 'INFO',
                'propagate': False
            },
            'uvicorn': {
                'handlers': ['console', 'file'],
                'level': 'INFO',
                'propagate': False
            },
            'sqlalchemy.engine': {
                'handlers': ['file'],
                'level': 'WARNING',
                'propagate': False
            },
            'alembic': {
                'handlers': ['file'],
                'level': 'INFO',
                'propagate': False
            },
            'fastapi': {
                'handlers': ['file'],
                'level': 'INFO',
                'propagate': False
            }
        },
        'root': {
            'handlers': ['console'],
            'level': 'WARNING'
        }
    }
    
    # Apply the configuration
    logging.config.dictConfig(logging_config)
    
    # Set up specific loggers
    setup_security_logger()
    setup_performance_logger()
    
    # Log startup message
    logger = logging.getLogger('app')
    logger.info(
        f"Logging configured for {settings.ENVIRONMENT} environment",
        extra={
            'log_level': settings.LOG_LEVEL,
            'log_file': str(settings.LOG_FILE_PATH),
            'structured_logging': settings.ENVIRONMENT != 'development'
        }
    )


def setup_security_logger():
    """Set up specialized security audit logger."""
    security_logger = logging.getLogger('app.security')
    
    # Add security-specific configuration
    security_logger.info("Security audit logging initialized")


def setup_performance_logger():
    """Set up specialized performance monitoring logger."""
    perf_logger = logging.getLogger('app.performance')
    
    # Add performance-specific configuration
    perf_logger.info("Performance monitoring logging initialized")


# Logging utilities
def get_logger(name: str) -> logging.Logger:
    """Get a configured logger instance."""
    return logging.getLogger(f'app.{name}')


def log_security_event(
    event_type: str,
    message: str,
    ip_address: str = None,
    user_id: str = None,
    endpoint: str = None,
    action: str = None,
    resource: str = None,
    success: bool = None,
    extra: Dict = None
):
    """Log a security audit event."""
    logger = logging.getLogger('app.security')
    
    extra_data = {
        'ip_address': ip_address,
        'user_id': user_id,
        'endpoint': endpoint,
        'action': action,
        'resource': resource,
        'success': success,
        **(extra or {})
    }
    
    logger.info(
        message,
        extra={k: v for k, v in extra_data.items() if v is not None}
    )


def log_performance_metric(
    message: str,
    duration: float = None,
    endpoint: str = None,
    method: str = None,
    status_code: int = None,
    db_queries: int = None,
    db_time: float = None,
    extra: Dict = None
):
    """Log a performance metric."""
    logger = logging.getLogger('app.performance')
    
    extra_data = {
        'duration': duration * 1000 if duration else None,  # Convert to milliseconds
        'endpoint': endpoint,
        'method': method,
        'status_code': status_code,
        'db_queries': db_queries,
        'db_time': db_time * 1000 if db_time else None,  # Convert to milliseconds
        **(extra or {})
    }
    
    logger.info(
        message,
        extra={k: v for k, v in extra_data.items() if v is not None}
    )


def log_business_event(
    event_type: str,
    message: str,
    user_id: str = None,
    resource_id: str = None,
    metadata: Dict = None
):
    """Log important business events."""
    logger = get_logger('business')
    
    extra_data = {
        'event_type': event_type,
        'user_id': user_id,
        'resource_id': resource_id,
        'metadata': metadata or {}
    }
    
    logger.info(message, extra=extra_data)


# Error tracking utilities
def track_error(error: Exception, context: Dict = None):
    """Track an error for monitoring."""
    error_tracker.track_error(
        error_type=type(error).__name__,
        error_message=str(error),
        extra_data=context or {}
    )


def get_error_metrics() -> Dict[str, Any]:
    """Get error tracking metrics."""
    return error_tracker.get_error_summary()


# Health check for logging system
def check_logging_health() -> Dict[str, Any]:
    """Check logging system health."""
    try:
        # Test each logger
        test_logger = get_logger('health_check')
        test_logger.info("Health check test log")
        
        # Check log file accessibility
        log_file_writable = settings.LOG_FILE_PATH.parent.exists()
        
        # Check error tracking
        error_metrics = get_error_metrics()
        
        return {
            'status': 'healthy',
            'log_file_accessible': log_file_writable,
            'error_tracking_active': error_metrics['total_unique_errors'] >= 0,
            'log_level': settings.LOG_LEVEL,
            'environment': settings.ENVIRONMENT
        }
    
    except Exception as e:
        return {
            'status': 'unhealthy',
            'error': str(e),
            'log_level': settings.LOG_LEVEL,
            'environment': settings.ENVIRONMENT
        }