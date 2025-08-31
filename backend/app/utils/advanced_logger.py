"""
Advanced logging and monitoring system for expert-level debugging and analytics
"""

import logging
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional, List
from functools import wraps
import traceback
import sys
from pathlib import Path

class ExpertLogger:
    """Advanced logging with structured data and performance metrics"""
    
    def __init__(self, name: str = "valuerpro"):
        self.logger = logging.getLogger(name)
        self.setup_advanced_logging()
        self.performance_metrics = {}
        self.error_counts = {}
        
    def setup_advanced_logging(self):
        """Setup advanced logging configuration"""
        
        # Create logs directory if it doesn't exist
        logs_dir = Path("logs")
        logs_dir.mkdir(exist_ok=True)
        
        # Configure logger level
        self.logger.setLevel(logging.DEBUG)
        
        # Prevent duplicate handlers
        if self.logger.handlers:
            return
            
        # Create formatters
        detailed_formatter = logging.Formatter(
            '%(asctime)s | %(name)s | %(levelname)s | %(funcName)s:%(lineno)d | %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        
        json_formatter = JsonFormatter()
        
        # Console handler with color coding
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)
        console_handler.setFormatter(detailed_formatter)
        
        # File handler for detailed logs
        file_handler = logging.FileHandler(logs_dir / "valuerpro_detailed.log")
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(detailed_formatter)
        
        # JSON file handler for structured logs (for analytics)
        json_handler = logging.FileHandler(logs_dir / "valuerpro_analytics.jsonl")
        json_handler.setLevel(logging.INFO)
        json_handler.setFormatter(json_formatter)
        
        # Error-specific handler
        error_handler = logging.FileHandler(logs_dir / "valuerpro_errors.log")
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(detailed_formatter)
        
        # Add handlers
        self.logger.addHandler(console_handler)
        self.logger.addHandler(file_handler)
        self.logger.addHandler(json_handler)
        self.logger.addHandler(error_handler)
    
    def log_ai_extraction_attempt(self, document_type: str, text_length: int, model: str = "gpt-4o"):
        """Log AI extraction attempt with metadata"""
        self.logger.info("AI extraction started", extra={
            'event_type': 'ai_extraction_start',
            'document_type': document_type,
            'text_length': text_length,
            'model': model,
            'timestamp': datetime.now().isoformat()
        })
    
    def log_ai_extraction_success(self, document_type: str, extraction_time: float, 
                                 fields_extracted: int, validation_errors: int = 0):
        """Log successful AI extraction with performance metrics"""
        self.logger.info("AI extraction completed successfully", extra={
            'event_type': 'ai_extraction_success',
            'document_type': document_type,
            'extraction_time_seconds': extraction_time,
            'fields_extracted': fields_extracted,
            'validation_errors': validation_errors,
            'timestamp': datetime.now().isoformat()
        })
        
        # Update performance metrics
        if document_type not in self.performance_metrics:
            self.performance_metrics[document_type] = []
        self.performance_metrics[document_type].append(extraction_time)
    
    def log_ai_extraction_failure(self, document_type: str, error: str, extraction_time: float = 0):
        """Log AI extraction failure with error details"""
        self.logger.error("AI extraction failed", extra={
            'event_type': 'ai_extraction_failure',
            'document_type': document_type,
            'error_message': error,
            'extraction_time_seconds': extraction_time,
            'timestamp': datetime.now().isoformat(),
            'stack_trace': traceback.format_exc()
        })
        
        # Update error counts
        self.error_counts[document_type] = self.error_counts.get(document_type, 0) + 1
    
    def log_data_validation_results(self, section: str, errors: List[str], warnings: List[str] = None):
        """Log data validation results"""
        level = logging.WARNING if errors else logging.INFO
        self.logger.log(level, f"Data validation completed for {section}", extra={
            'event_type': 'data_validation',
            'section': section,
            'error_count': len(errors),
            'errors': errors,
            'warning_count': len(warnings or []),
            'warnings': warnings or [],
            'timestamp': datetime.now().isoformat()
        })
    
    def log_cache_performance(self, operation: str, cache_hit: bool, lookup_time: float):
        """Log cache performance metrics"""
        self.logger.debug(f"Cache {operation}: {'HIT' if cache_hit else 'MISS'}", extra={
            'event_type': 'cache_performance',
            'operation': operation,
            'cache_hit': cache_hit,
            'lookup_time_ms': lookup_time * 1000,
            'timestamp': datetime.now().isoformat()
        })
    
    def log_user_workflow_step(self, user_id: str, report_id: str, step_name: str, step_data: Dict[str, Any]):
        """Log user workflow steps for analytics"""
        self.logger.info(f"User workflow: {step_name}", extra={
            'event_type': 'user_workflow',
            'user_id': user_id,
            'report_id': report_id,
            'step_name': step_name,
            'step_data_size': len(json.dumps(step_data)),
            'timestamp': datetime.now().isoformat()
        })
    
    def log_system_performance_alert(self, metric: str, current_value: float, threshold: float):
        """Log system performance alerts"""
        self.logger.warning(f"Performance alert: {metric} = {current_value} (threshold: {threshold})", extra={
            'event_type': 'performance_alert',
            'metric': metric,
            'current_value': current_value,
            'threshold': threshold,
            'timestamp': datetime.now().isoformat()
        })
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get performance summary for monitoring dashboard"""
        summary = {
            'timestamp': datetime.now().isoformat(),
            'extraction_performance': {},
            'error_rates': {},
            'total_extractions': 0,
            'total_errors': 0
        }
        
        # Calculate average extraction times by document type
        for doc_type, times in self.performance_metrics.items():
            if times:
                summary['extraction_performance'][doc_type] = {
                    'average_time_seconds': sum(times) / len(times),
                    'min_time_seconds': min(times),
                    'max_time_seconds': max(times),
                    'total_extractions': len(times)
                }
                summary['total_extractions'] += len(times)
        
        # Calculate error rates
        for doc_type, error_count in self.error_counts.items():
            total_attempts = len(self.performance_metrics.get(doc_type, [])) + error_count
            if total_attempts > 0:
                summary['error_rates'][doc_type] = {
                    'error_count': error_count,
                    'total_attempts': total_attempts,
                    'error_rate_percentage': (error_count / total_attempts) * 100
                }
                summary['total_errors'] += error_count
        
        return summary
    
    def create_monitoring_decorator(self, operation_name: str):
        """Create a monitoring decorator for any function"""
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                start_time = time.time()
                
                try:
                    # Log operation start
                    self.logger.debug(f"Operation started: {operation_name}")
                    
                    result = func(*args, **kwargs)
                    
                    # Log successful operation
                    execution_time = time.time() - start_time
                    self.logger.info(f"Operation completed: {operation_name}", extra={
                        'event_type': 'operation_success',
                        'operation_name': operation_name,
                        'execution_time_seconds': execution_time,
                        'timestamp': datetime.now().isoformat()
                    })
                    
                    return result
                    
                except Exception as e:
                    # Log operation failure
                    execution_time = time.time() - start_time
                    self.logger.error(f"Operation failed: {operation_name}", extra={
                        'event_type': 'operation_failure',
                        'operation_name': operation_name,
                        'execution_time_seconds': execution_time,
                        'error_message': str(e),
                        'stack_trace': traceback.format_exc(),
                        'timestamp': datetime.now().isoformat()
                    })
                    raise
            
            return wrapper
        return decorator

class JsonFormatter(logging.Formatter):
    """Custom JSON formatter for structured logging"""
    
    def format(self, record):
        log_entry = {
            'timestamp': datetime.fromtimestamp(record.created).isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno,
            'message': record.getMessage()
        }
        
        # Add extra fields if they exist
        if hasattr(record, 'event_type'):
            log_entry.update({
                key: value for key, value in record.__dict__.items()
                if key not in ['name', 'msg', 'args', 'levelname', 'levelno', 'pathname', 
                              'filename', 'module', 'lineno', 'funcName', 'created', 
                              'msecs', 'relativeCreated', 'thread', 'threadName', 
                              'processName', 'process', 'getMessage']
            })
        
        return json.dumps(log_entry)

# Global logger instance
expert_logger = ExpertLogger()

# Convenience functions for easy use
def log_ai_extraction_start(document_type: str, text_length: int):
    """Quick log AI extraction start"""
    expert_logger.log_ai_extraction_attempt(document_type, text_length)

def log_ai_extraction_end(document_type: str, extraction_time: float, success: bool, error: str = None):
    """Quick log AI extraction end"""
    if success:
        expert_logger.log_ai_extraction_success(document_type, extraction_time, fields_extracted=0)
    else:
        expert_logger.log_ai_extraction_failure(document_type, error or "Unknown error", extraction_time)

def monitor_operation(operation_name: str):
    """Quick monitoring decorator"""
    return expert_logger.create_monitoring_decorator(operation_name)

def get_system_health() -> Dict[str, Any]:
    """Get overall system health metrics"""
    return expert_logger.get_performance_summary()