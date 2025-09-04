"""
Production monitoring and health check endpoints.
Provides comprehensive system status and metrics for operations teams.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse, PlainTextResponse
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional, List
import time
import psutil
from datetime import datetime, timedelta

from app.db import get_db, test_database_connection
from app.models import User
from app.deps import get_current_active_user
from app.core.config import settings
from app.core.logging_config import get_error_metrics, check_logging_health
from app.middleware.performance_monitoring import performance_metrics
from app.middleware.security_hardening import get_security_report
from app.services.cloud_storage import storage_service

router = APIRouter()


@router.get("/health", tags=["monitoring"])
async def basic_health_check():
    """Basic health check endpoint for load balancers."""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


@router.get("/health/detailed", tags=["monitoring"])
async def detailed_health_check(db: Session = Depends(get_db)):
    """Comprehensive health check with dependency status."""
    
    health_status = {
        "service": "valuerpro-api",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.utcnow().isoformat(),
        "status": "healthy",
        "checks": {}
    }
    
    issues = []
    
    # Database connectivity
    try:
        db_connected = test_database_connection()
        health_status["checks"]["database"] = {
            "status": "healthy" if db_connected else "unhealthy",
            "response_time_ms": 0  # Could add actual timing
        }
        if not db_connected:
            issues.append("database_disconnected")
    except Exception as e:
        health_status["checks"]["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        issues.append("database_error")
    
    # Storage system
    try:
        storage_healthy = True  # Basic check - storage service is initialized
        storage_type = type(storage_service.provider).__name__
        health_status["checks"]["storage"] = {
            "status": "healthy" if storage_healthy else "unhealthy",
            "provider": storage_type,
            "cloud_enabled": storage_service.is_cloud_provider()
        }
    except Exception as e:
        health_status["checks"]["storage"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        issues.append("storage_error")
    
    # System resources
    try:
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('.')
        
        resource_issues = []
        if cpu_percent > 90:
            resource_issues.append("high_cpu")
        if memory.percent > 90:
            resource_issues.append("high_memory")
        if disk.percent > 90:
            resource_issues.append("high_disk")
        
        health_status["checks"]["system_resources"] = {
            "status": "healthy" if not resource_issues else "degraded",
            "cpu_percent": cpu_percent,
            "memory_percent": memory.percent,
            "disk_percent": disk.percent,
            "issues": resource_issues
        }
        
        if resource_issues:
            issues.extend(resource_issues)
            
    except Exception as e:
        health_status["checks"]["system_resources"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        issues.append("system_resources_error")
    
    # Logging system
    try:
        logging_health = check_logging_health()
        health_status["checks"]["logging"] = logging_health
        if logging_health["status"] != "healthy":
            issues.append("logging_unhealthy")
    except Exception as e:
        health_status["checks"]["logging"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        issues.append("logging_error")
    
    # Overall status
    if any("unhealthy" in str(check.get("status")) for check in health_status["checks"].values()):
        health_status["status"] = "unhealthy"
    elif any("degraded" in str(check.get("status")) for check in health_status["checks"].values()):
        health_status["status"] = "degraded"
    
    if issues:
        health_status["issues"] = issues
    
    # Set appropriate HTTP status code
    status_code = 200
    if health_status["status"] == "degraded":
        status_code = 200  # Still operational
    elif health_status["status"] == "unhealthy":
        status_code = 503  # Service unavailable
    
    return JSONResponse(content=health_status, status_code=status_code)


@router.get("/metrics", tags=["monitoring"])
async def get_application_metrics():
    """Get comprehensive application metrics."""
    
    try:
        # Performance metrics
        perf_metrics = await performance_metrics.get_metrics()
        
        # System metrics
        system_metrics = {
            "cpu": {
                "usage_percent": psutil.cpu_percent(interval=1),
                "count": psutil.cpu_count(),
                "load_average": psutil.getloadavg() if hasattr(psutil, 'getloadavg') else None
            },
            "memory": {
                "total_gb": psutil.virtual_memory().total / (1024**3),
                "available_gb": psutil.virtual_memory().available / (1024**3),
                "used_percent": psutil.virtual_memory().percent
            },
            "disk": {
                "total_gb": psutil.disk_usage('.').total / (1024**3),
                "free_gb": psutil.disk_usage('.').free / (1024**3),
                "used_percent": psutil.disk_usage('.').percent
            }
        }
        
        # Application metrics
        app_metrics = {
            "service": "valuerpro-api",
            "version": settings.APP_VERSION,
            "environment": settings.ENVIRONMENT,
            "uptime_seconds": time.time() - psutil.Process().create_time(),
            "python_version": f"{psutil.sys.version_info.major}.{psutil.sys.version_info.minor}.{psutil.sys.version_info.micro}",
        }
        
        # Error tracking metrics
        error_metrics = get_error_metrics()
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "application": app_metrics,
            "system": system_metrics,
            "performance": perf_metrics,
            "errors": error_metrics
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to collect metrics: {str(e)}"
        )


@router.get("/metrics/prometheus", response_class=PlainTextResponse, tags=["monitoring"])
async def get_prometheus_metrics():
    """Get metrics in Prometheus format for scraping."""
    
    try:
        perf_metrics = await performance_metrics.get_metrics()
        error_metrics = get_error_metrics()
        
        # Generate Prometheus format metrics
        prometheus_metrics = []
        
        # Help and type definitions
        prometheus_metrics.extend([
            "# HELP valuerpro_requests_total Total number of requests",
            "# TYPE valuerpro_requests_total counter",
            f"valuerpro_requests_total {perf_metrics.get('requests', {}).get('total_count', 0)}",
            "",
            "# HELP valuerpro_request_duration_seconds Request duration in seconds",
            "# TYPE valuerpro_request_duration_seconds histogram",
            f"valuerpro_request_duration_seconds_sum {perf_metrics.get('requests', {}).get('avg_response_time_ms', 0) / 1000}",
            f"valuerpro_request_duration_seconds_count {perf_metrics.get('requests', {}).get('total_count', 0)}",
            "",
            "# HELP valuerpro_errors_total Total number of errors",
            "# TYPE valuerpro_errors_total counter",
            f"valuerpro_errors_total {error_metrics.get('total_unique_errors', 0)}",
            "",
            "# HELP valuerpro_memory_usage_bytes Memory usage in bytes",
            "# TYPE valuerpro_memory_usage_bytes gauge",
            f"valuerpro_memory_usage_bytes {psutil.virtual_memory().used}",
            "",
            "# HELP valuerpro_cpu_usage_percent CPU usage percentage",
            "# TYPE valuerpro_cpu_usage_percent gauge",
            f"valuerpro_cpu_usage_percent {psutil.cpu_percent()}",
        ])
        
        return "\n".join(prometheus_metrics)
        
    except Exception as e:
        return f"# Error collecting metrics: {str(e)}"


@router.get("/security/report", tags=["monitoring", "security"])
async def get_security_report(current_user: User = Depends(get_current_active_user)):
    """Get security monitoring report (requires authentication)."""
    
    # Only allow admin users to view security reports
    if getattr(current_user, 'role', 'user') != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to view security report"
        )
    
    return get_security_report()


@router.get("/performance/report", tags=["monitoring"])
async def get_performance_report():
    """Get detailed performance analysis report."""
    
    try:
        # Get comprehensive performance data
        metrics = await performance_metrics.get_metrics()
        health = await performance_metrics.get_health_status()
        
        # Add database performance analysis
        from app.middleware.performance_monitoring import DatabaseOptimizer
        db_patterns = DatabaseOptimizer.analyze_query_patterns()
        db_suggestions = DatabaseOptimizer.get_optimization_suggestions()
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "health_status": health,
            "metrics": metrics,
            "database_analysis": {
                "query_patterns": db_patterns,
                "optimization_suggestions": db_suggestions
            },
            "recommendations": generate_performance_recommendations(metrics)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate performance report: {str(e)}"
        )


@router.post("/alerts/test", tags=["monitoring"])
async def test_alerting_system(
    alert_type: str = "test",
    current_user: User = Depends(get_current_active_user)
):
    """Test the alerting system (admin only)."""
    
    if getattr(current_user, 'role', 'user') != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to test alerts"
        )
    
    # Log test alert
    from app.core.logging_config import log_security_event
    log_security_event(
        event_type="test_alert",
        message=f"Test alert triggered by user {current_user.id}",
        user_id=str(current_user.id),
        action="test_alert",
        success=True
    )
    
    return {
        "message": "Test alert sent",
        "alert_type": alert_type,
        "timestamp": datetime.utcnow().isoformat(),
        "triggered_by": str(current_user.id)
    }


@router.get("/system/info", tags=["monitoring"])
async def get_system_info():
    """Get basic system information."""
    
    import platform
    import sys
    
    return {
        "service": "valuerpro-api",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "platform": {
            "system": platform.system(),
            "release": platform.release(),
            "version": platform.version(),
            "machine": platform.machine(),
            "processor": platform.processor(),
        },
        "python": {
            "version": sys.version,
            "executable": sys.executable,
        },
        "configuration": {
            "debug": settings.DEBUG,
            "log_level": settings.LOG_LEVEL,
            "rate_limiting": settings.RATE_LIMIT_ENABLED,
            "environment": settings.ENVIRONMENT,
        },
        "timestamp": datetime.utcnow().isoformat()
    }


def generate_performance_recommendations(metrics: Dict[str, Any]) -> List[str]:
    """Generate performance optimization recommendations."""
    recommendations = []
    
    if metrics.get('status') == 'no_data':
        return ["Insufficient data for recommendations"]
    
    # Response time recommendations
    avg_response_time = metrics.get('requests', {}).get('avg_response_time_ms', 0)
    if avg_response_time > 1000:
        recommendations.append("Average response time is high (>1000ms). Consider optimizing database queries or adding caching.")
    elif avg_response_time > 500:
        recommendations.append("Response time could be improved. Review slow endpoints and optimize bottlenecks.")
    
    # Database recommendations
    db_metrics = metrics.get('database', {})
    queries_per_request = db_metrics.get('queries_per_request', 0)
    if queries_per_request > 5:
        recommendations.append("High number of database queries per request. Consider query optimization or eager loading.")
    
    avg_query_time = db_metrics.get('avg_query_time_ms', 0)
    if avg_query_time > 100:
        recommendations.append("Slow database queries detected. Review indexes and query optimization.")
    
    # Error rate recommendations
    error_rate = metrics.get('requests', {}).get('error_rate_percent', 0)
    if error_rate > 5:
        recommendations.append("High error rate detected. Review application logs and fix recurring issues.")
    elif error_rate > 1:
        recommendations.append("Error rate is elevated. Monitor error patterns and implement fixes.")
    
    # System resource recommendations
    system_metrics = metrics.get('system', {})
    if system_metrics.get('cpu_percent', 0) > 80:
        recommendations.append("High CPU usage detected. Consider scaling horizontally or optimizing CPU-intensive operations.")
    
    if system_metrics.get('memory_percent', 0) > 80:
        recommendations.append("High memory usage detected. Review memory leaks and consider increasing available memory.")
    
    # If no issues found
    if not recommendations:
        recommendations.append("System performance is within acceptable ranges. Continue monitoring.")
    
    return recommendations