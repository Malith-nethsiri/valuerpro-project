"""
Performance monitoring middleware for production optimization.
Tracks request metrics, database queries, and system performance.
"""

import time
import psutil
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from collections import defaultdict, deque
import asyncio
from contextlib import asynccontextmanager

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy import event
from sqlalchemy.engine import Engine

from app.core.config import settings

logger = logging.getLogger(__name__)


class PerformanceMetrics:
    """Thread-safe performance metrics collection."""
    
    def __init__(self, max_samples: int = 1000):
        self.max_samples = max_samples
        self.request_times = deque(maxlen=max_samples)
        self.request_counts = defaultdict(int)
        self.endpoint_times = defaultdict(lambda: deque(maxlen=100))
        self.error_counts = defaultdict(int)
        self.db_query_times = deque(maxlen=max_samples)
        self.db_query_counts = defaultdict(int)
        self.slow_queries = deque(maxlen=100)
        self._lock = asyncio.Lock()
    
    async def record_request(
        self, 
        method: str, 
        path: str, 
        duration: float, 
        status_code: int,
        db_queries: int = 0,
        db_time: float = 0.0
    ):
        """Record request performance metrics."""
        async with self._lock:
            self.request_times.append(duration)
            self.request_counts[f"{method} {path}"] += 1
            self.endpoint_times[path].append(duration)
            
            if status_code >= 400:
                self.error_counts[status_code] += 1
            
            if db_time > 0:
                self.db_query_times.append(db_time)
                self.db_query_counts[path] += db_queries
    
    async def record_slow_query(self, query: str, duration: float, params: Dict = None):
        """Record slow database queries for optimization."""
        async with self._lock:
            self.slow_queries.append({
                'query': query[:500],  # Truncate long queries
                'duration': duration,
                'params': str(params)[:200] if params else None,
                'timestamp': datetime.utcnow().isoformat()
            })
    
    async def get_metrics(self) -> Dict[str, Any]:
        """Get current performance metrics."""
        async with self._lock:
            if not self.request_times:
                return {'status': 'no_data'}
            
            # System metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Request metrics
            avg_response_time = sum(self.request_times) / len(self.request_times)
            min_response_time = min(self.request_times)
            max_response_time = max(self.request_times)
            
            # Percentiles
            sorted_times = sorted(self.request_times)
            p95_index = int(len(sorted_times) * 0.95)
            p99_index = int(len(sorted_times) * 0.99)
            
            # Error rates
            total_requests = sum(self.request_counts.values())
            total_errors = sum(self.error_counts.values())
            error_rate = (total_errors / total_requests * 100) if total_requests > 0 else 0
            
            # Database metrics
            avg_db_time = sum(self.db_query_times) / len(self.db_query_times) if self.db_query_times else 0
            total_db_queries = sum(self.db_query_counts.values())
            
            # Endpoint performance
            endpoint_stats = {}
            for endpoint, times in self.endpoint_times.items():
                if times:
                    endpoint_stats[endpoint] = {
                        'avg_time': sum(times) / len(times),
                        'max_time': max(times),
                        'request_count': self.request_counts.get(f"GET {endpoint}", 0) + 
                                       self.request_counts.get(f"POST {endpoint}", 0)
                    }
            
            return {
                'timestamp': datetime.utcnow().isoformat(),
                'system': {
                    'cpu_percent': cpu_percent,
                    'memory_percent': memory.percent,
                    'memory_available_gb': memory.available / (1024**3),
                    'disk_percent': disk.percent,
                    'disk_free_gb': disk.free / (1024**3)
                },
                'requests': {
                    'total_count': total_requests,
                    'avg_response_time_ms': avg_response_time * 1000,
                    'min_response_time_ms': min_response_time * 1000,
                    'max_response_time_ms': max_response_time * 1000,
                    'p95_response_time_ms': sorted_times[p95_index] * 1000 if p95_index < len(sorted_times) else 0,
                    'p99_response_time_ms': sorted_times[p99_index] * 1000 if p99_index < len(sorted_times) else 0,
                    'error_rate_percent': error_rate,
                    'requests_per_minute': len([t for t in self.request_times if time.time() - t < 60])
                },
                'database': {
                    'avg_query_time_ms': avg_db_time * 1000,
                    'total_queries': total_db_queries,
                    'slow_queries_count': len(self.slow_queries),
                    'queries_per_request': total_db_queries / total_requests if total_requests > 0 else 0
                },
                'endpoints': endpoint_stats,
                'errors': dict(self.error_counts)
            }
    
    async def get_health_status(self) -> Dict[str, str]:
        """Get system health status."""
        metrics = await self.get_metrics()
        
        if metrics.get('status') == 'no_data':
            return {'status': 'unknown', 'reason': 'insufficient_data'}
        
        # Health checks
        cpu_ok = metrics['system']['cpu_percent'] < 80
        memory_ok = metrics['system']['memory_percent'] < 85
        response_time_ok = metrics['requests']['avg_response_time_ms'] < 1000
        error_rate_ok = metrics['requests']['error_rate_percent'] < 5
        
        if all([cpu_ok, memory_ok, response_time_ok, error_rate_ok]):
            return {'status': 'healthy'}
        elif any([
            metrics['system']['cpu_percent'] > 95,
            metrics['system']['memory_percent'] > 95,
            metrics['requests']['avg_response_time_ms'] > 5000,
            metrics['requests']['error_rate_percent'] > 20
        ]):
            return {
                'status': 'critical',
                'issues': {
                    'high_cpu': not cpu_ok and metrics['system']['cpu_percent'] > 95,
                    'high_memory': not memory_ok and metrics['system']['memory_percent'] > 95,
                    'slow_response': not response_time_ok and metrics['requests']['avg_response_time_ms'] > 5000,
                    'high_errors': not error_rate_ok and metrics['requests']['error_rate_percent'] > 20
                }
            }
        else:
            return {
                'status': 'degraded',
                'warnings': {
                    'cpu_usage': not cpu_ok,
                    'memory_usage': not memory_ok,
                    'response_time': not response_time_ok,
                    'error_rate': not error_rate_ok
                }
            }


# Global metrics instance
performance_metrics = PerformanceMetrics()


class PerformanceMiddleware(BaseHTTPMiddleware):
    """Middleware to track request performance and system metrics."""
    
    def __init__(self, app, enable_db_monitoring: bool = True):
        super().__init__(app)
        self.enable_db_monitoring = enable_db_monitoring
        self.db_query_count = 0
        self.db_query_time = 0.0
        
        if enable_db_monitoring:
            self._setup_db_monitoring()
    
    def _setup_db_monitoring(self):
        """Set up database query monitoring."""
        @event.listens_for(Engine, "before_cursor_execute")
        def receive_before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            context._query_start_time = time.time()
        
        @event.listens_for(Engine, "after_cursor_execute")
        def receive_after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            total_time = time.time() - context._query_start_time
            self.db_query_count += 1
            self.db_query_time += total_time
            
            # Log slow queries
            if total_time > 0.1:  # 100ms threshold
                # Note: Can't use async task here since this is a synchronous event handler
                # Just log the slow query instead
                logger.warning(f"Slow query detected: {total_time:.3f}s - {statement[:200]}")
    
    async def dispatch(self, request: Request, call_next):
        # Skip monitoring for health checks and static files
        if request.url.path in ['/health', '/healthz', '/metrics'] or request.url.path.startswith('/static'):
            return await call_next(request)
        
        start_time = time.time()
        self.db_query_count = 0
        self.db_query_time = 0.0
        
        # Add request ID for tracing
        request_id = f"req_{int(time.time() * 1000)}"
        request.state.request_id = request_id
        
        try:
            response = await call_next(request)
            process_time = time.time() - start_time
            
            # Record metrics
            await performance_metrics.record_request(
                method=request.method,
                path=request.url.path,
                duration=process_time,
                status_code=response.status_code,
                db_queries=self.db_query_count,
                db_time=self.db_query_time
            )
            
            # Add performance headers
            response.headers["X-Process-Time"] = str(process_time)
            response.headers["X-Request-ID"] = request_id
            response.headers["X-DB-Queries"] = str(self.db_query_count)
            
            # Log slow requests
            if process_time > 2.0:  # 2 second threshold
                logger.warning(
                    f"Slow request detected: {process_time:.3f}s - "
                    f"{request.method} {request.url.path} - "
                    f"DB queries: {self.db_query_count} ({self.db_query_time:.3f}s)"
                )
            
            return response
            
        except Exception as e:
            process_time = time.time() - start_time
            
            # Record error metrics
            await performance_metrics.record_request(
                method=request.method,
                path=request.url.path,
                duration=process_time,
                status_code=500,
                db_queries=self.db_query_count,
                db_time=self.db_query_time
            )
            
            logger.error(
                f"Request error: {process_time:.3f}s - "
                f"{request.method} {request.url.path} - "
                f"Error: {str(e)}"
            )
            
            raise


@asynccontextmanager
async def performance_context():
    """Context manager for performance monitoring operations."""
    start_time = time.time()
    try:
        yield
    finally:
        duration = time.time() - start_time
        if duration > 1.0:
            logger.info(f"Long-running operation completed in {duration:.3f}s")


class DatabaseOptimizer:
    """Database query optimization utilities."""
    
    @staticmethod
    def analyze_query_patterns():
        """Analyze query patterns for optimization opportunities."""
        # This would analyze the slow_queries and suggest optimizations
        slow_queries = performance_metrics.slow_queries
        
        patterns = defaultdict(list)
        for query_data in slow_queries:
            # Extract table names and query types
            query = query_data['query'].lower()
            if 'select' in query:
                patterns['slow_selects'].append(query_data)
            elif 'insert' in query:
                patterns['slow_inserts'].append(query_data)
            elif 'update' in query:
                patterns['slow_updates'].append(query_data)
        
        return dict(patterns)
    
    @staticmethod
    def get_optimization_suggestions() -> List[str]:
        """Get database optimization suggestions based on performance data."""
        suggestions = []
        patterns = DatabaseOptimizer.analyze_query_patterns()
        
        if len(patterns.get('slow_selects', [])) > 10:
            suggestions.append("Consider adding database indexes for frequently queried columns")
        
        if len(patterns.get('slow_inserts', [])) > 5:
            suggestions.append("Consider bulk insert operations for better performance")
        
        # Add more suggestions based on query analysis
        return suggestions


# Utility functions for performance monitoring
async def log_performance_summary():
    """Log performance summary for monitoring."""
    metrics = await performance_metrics.get_metrics()
    health = await performance_metrics.get_health_status()
    
    logger.info(
        f"Performance Summary - Status: {health['status']} - "
        f"Avg Response: {metrics.get('requests', {}).get('avg_response_time_ms', 0):.1f}ms - "
        f"Error Rate: {metrics.get('requests', {}).get('error_rate_percent', 0):.1f}% - "
        f"CPU: {metrics.get('system', {}).get('cpu_percent', 0):.1f}% - "
        f"Memory: {metrics.get('system', {}).get('memory_percent', 0):.1f}%"
    )