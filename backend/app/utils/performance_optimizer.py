"""
Expert-level performance optimization and caching utilities
Maximizes system efficiency and response times
"""

import asyncio
import hashlib
import json
import time
from typing import Any, Dict, List, Optional, Callable
from functools import wraps, lru_cache
from datetime import datetime, timedelta
import logging
from concurrent.futures import ThreadPoolExecutor
import threading

logger = logging.getLogger(__name__)

class PerformanceOptimizer:
    """Advanced performance optimization utilities"""
    
    # In-memory cache for AI extraction results
    _extraction_cache = {}
    _cache_lock = threading.Lock()
    _thread_pool = ThreadPoolExecutor(max_workers=4)
    
    @staticmethod
    def cache_ai_extraction(expiry_minutes: int = 60):
        """
        Decorator to cache AI extraction results to avoid redundant API calls
        """
        def decorator(func: Callable):
            @wraps(func)
            def wrapper(*args, **kwargs):
                # Create cache key from function args
                cache_key = PerformanceOptimizer._create_cache_key(func.__name__, args, kwargs)
                
                with PerformanceOptimizer._cache_lock:
                    # Check if result exists and is still valid
                    if cache_key in PerformanceOptimizer._extraction_cache:
                        cached_result, timestamp = PerformanceOptimizer._extraction_cache[cache_key]
                        if datetime.now() - timestamp < timedelta(minutes=expiry_minutes):
                            logger.info(f"Cache hit for {func.__name__}: {cache_key[:20]}...")
                            return cached_result
                        else:
                            # Remove expired entry
                            del PerformanceOptimizer._extraction_cache[cache_key]
                
                # Execute function and cache result
                start_time = time.time()
                result = func(*args, **kwargs)
                execution_time = time.time() - start_time
                
                with PerformanceOptimizer._cache_lock:
                    PerformanceOptimizer._extraction_cache[cache_key] = (result, datetime.now())
                    
                logger.info(f"Function {func.__name__} executed in {execution_time:.2f}s, result cached")
                return result
            return wrapper
        return decorator
    
    @staticmethod
    def _create_cache_key(func_name: str, args: tuple, kwargs: dict) -> str:
        """Create a unique cache key from function arguments"""
        key_data = {
            'function': func_name,
            'args': str(args),
            'kwargs': str(sorted(kwargs.items()))
        }
        key_string = json.dumps(key_data, sort_keys=True)
        return hashlib.md5(key_string.encode()).hexdigest()
    
    @staticmethod
    def async_process_documents(documents: List[str], processor_func: Callable) -> List[Any]:
        """
        Process multiple documents asynchronously for better performance
        """
        start_time = time.time()
        
        # Submit all documents to thread pool
        futures = []
        for doc in documents:
            future = PerformanceOptimizer._thread_pool.submit(processor_func, doc)
            futures.append(future)
        
        # Collect results
        results = []
        for future in futures:
            try:
                result = future.result(timeout=300)  # 5 minute timeout per document
                results.append(result)
            except Exception as e:
                logger.error(f"Document processing failed: {str(e)}")
                results.append({"error": str(e)})
        
        total_time = time.time() - start_time
        logger.info(f"Processed {len(documents)} documents in {total_time:.2f}s ({total_time/len(documents):.2f}s avg)")
        
        return results
    
    @staticmethod
    def optimize_ocr_text(ocr_text: str) -> str:
        """
        Optimize OCR text for better AI processing
        """
        if not ocr_text:
            return ""
        
        # Remove excessive whitespace and normalize
        optimized = ' '.join(ocr_text.split())
        
        # Remove common OCR artifacts
        artifacts_to_remove = [
            '|||', '###', '---', '***', '...', ',,,'
        ]
        
        for artifact in artifacts_to_remove:
            optimized = optimized.replace(artifact, ' ')
        
        # Normalize common OCR mistakes in Sri Lankan documents
        corrections = {
            'Colomho': 'Colombo',
            'Kandy': 'Kandy',
            'Gampaha': 'Gampaha',
            'Plan No.': 'Plan No.',
            'Lot No.': 'Lot No.',
            'Survey Plan': 'Survey Plan',
            'Deed No.': 'Deed No.'
        }
        
        for mistake, correction in corrections.items():
            optimized = optimized.replace(mistake, correction)
        
        return optimized.strip()
    
    @staticmethod
    def batch_validate_extracted_data(extracted_data_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Batch validate multiple extracted data sets for efficiency
        """
        from app.utils.data_validator import DataValidator, ValidationLevel
        
        start_time = time.time()
        validated_results = []
        
        for i, data in enumerate(extracted_data_list):
            try:
                cleaned_data, errors = DataValidator.validate_comprehensive_data(
                    data, ValidationLevel.MODERATE
                )
                
                result = {
                    'index': i,
                    'cleaned_data': cleaned_data,
                    'validation_errors': errors,
                    'is_valid': len(errors) == 0
                }
                validated_results.append(result)
                
            except Exception as e:
                logger.error(f"Validation failed for dataset {i}: {str(e)}")
                validated_results.append({
                    'index': i,
                    'cleaned_data': {},
                    'validation_errors': [f"Validation system error: {str(e)}"],
                    'is_valid': False
                })
        
        total_time = time.time() - start_time
        valid_count = sum(1 for r in validated_results if r['is_valid'])
        
        logger.info(f"Batch validated {len(extracted_data_list)} datasets in {total_time:.2f}s, "
                   f"{valid_count}/{len(extracted_data_list)} valid")
        
        return validated_results
    
    @staticmethod
    def smart_data_merge(ai_data: Dict[str, Any], existing_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Intelligently merge AI extracted data with existing user data
        Prioritizes user input over AI suggestions while filling gaps
        """
        merged = existing_data.copy()
        
        def merge_section(section_name: str):
            if section_name not in ai_data:
                return
                
            if section_name not in merged:
                merged[section_name] = {}
            
            ai_section = ai_data[section_name]
            existing_section = merged[section_name]
            
            # Special handling for different data types
            if section_name == 'buildings' and isinstance(ai_section, list):
                # For buildings, only add if no existing buildings
                if not existing_section or len(existing_section) == 0:
                    merged[section_name] = ai_section
            else:
                # For other sections, merge field by field
                if isinstance(ai_section, dict) and isinstance(existing_section, dict):
                    for key, ai_value in ai_section.items():
                        # Only use AI value if user hasn't provided one
                        if key not in existing_section or not existing_section.get(key):
                            existing_section[key] = ai_value
        
        # Merge all sections
        for section in ['identification', 'location', 'site', 'buildings', 'utilities', 'locality', 'planning', 'legal']:
            merge_section(section)
        
        return merged
    
    @staticmethod
    def clear_cache(older_than_minutes: int = 60):
        """Clear old cache entries to prevent memory bloat"""
        with PerformanceOptimizer._cache_lock:
            cutoff_time = datetime.now() - timedelta(minutes=older_than_minutes)
            keys_to_remove = []
            
            for key, (_, timestamp) in PerformanceOptimizer._extraction_cache.items():
                if timestamp < cutoff_time:
                    keys_to_remove.append(key)
            
            for key in keys_to_remove:
                del PerformanceOptimizer._extraction_cache[key]
            
            if keys_to_remove:
                logger.info(f"Cleared {len(keys_to_remove)} cache entries older than {older_than_minutes} minutes")
    
    @staticmethod
    def get_cache_stats() -> Dict[str, Any]:
        """Get cache statistics for monitoring"""
        with PerformanceOptimizer._cache_lock:
            return {
                'total_entries': len(PerformanceOptimizer._extraction_cache),
                'memory_estimate_mb': len(str(PerformanceOptimizer._extraction_cache)) / (1024 * 1024),
                'oldest_entry': min([ts for _, ts in PerformanceOptimizer._extraction_cache.values()], 
                                  default=datetime.now()),
                'newest_entry': max([ts for _, ts in PerformanceOptimizer._extraction_cache.values()], 
                                  default=datetime.now())
            }

class PerformanceMonitor:
    """Monitor and log performance metrics"""
    
    @staticmethod
    def log_processing_time(operation_name: str):
        """Decorator to log processing times"""
        def decorator(func: Callable):
            @wraps(func)
            def wrapper(*args, **kwargs):
                start_time = time.time()
                try:
                    result = func(*args, **kwargs)
                    success = True
                    error_msg = None
                except Exception as e:
                    result = None
                    success = False
                    error_msg = str(e)
                    raise
                finally:
                    end_time = time.time()
                    duration = end_time - start_time
                    
                    logger.info(f"Performance: {operation_name} took {duration:.2f}s "
                               f"(Success: {success})")
                    
                    if not success:
                        logger.error(f"Performance: {operation_name} failed after {duration:.2f}s: {error_msg}")
                
                return result
            return wrapper
        return decorator
    
    @staticmethod
    def track_memory_usage(threshold_mb: float = 100.0):
        """Track memory usage and warn if exceeding threshold"""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        memory_mb = process.memory_info().rss / (1024 * 1024)
        
        if memory_mb > threshold_mb:
            logger.warning(f"High memory usage detected: {memory_mb:.1f}MB (threshold: {threshold_mb}MB)")
            
            # Trigger cache cleanup if memory is high
            PerformanceOptimizer.clear_cache(older_than_minutes=30)
        
        return memory_mb

# Performance optimization decorators for easy use
def cached_extraction(expiry_minutes: int = 60):
    """Easy-to-use caching decorator"""
    return PerformanceOptimizer.cache_ai_extraction(expiry_minutes)

def timed_operation(operation_name: str):
    """Easy-to-use timing decorator"""
    return PerformanceMonitor.log_processing_time(operation_name)