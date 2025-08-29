"""
Monitoring API endpoints for AI-powered test monitoring
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from fastapi.responses import StreamingResponse
from typing import Dict, List, Any, Optional
import json
import asyncio
from datetime import datetime, timedelta
from pydantic import BaseModel

from ..monitoring.ai_test_monitor import AITestMonitor, create_ai_test_monitor
from ..core.config import get_settings

router = APIRouter(prefix="/api/v1/monitoring", tags=["monitoring"])

# Global monitor instance
_monitor_instance: Optional[AITestMonitor] = None


class MonitoringStatus(BaseModel):
    status: str
    uptime: float
    active_services: List[str]
    failed_services: List[str]
    last_check: datetime


class AlertRequest(BaseModel):
    severity: str
    title: str
    description: str
    source: str
    metadata: Optional[Dict[str, Any]] = None


async def get_monitor() -> AITestMonitor:
    """Get or create monitor instance"""
    global _monitor_instance
    
    if _monitor_instance is None:
        settings = get_settings()
        config = {
            "database_url": str(settings.DATABASE_URL),
            "slack_webhook": getattr(settings, "SLACK_WEBHOOK_URL", None),
            "email_alerts": True
        }
        _monitor_instance = await create_ai_test_monitor(config)
        
        # Start monitoring in background
        asyncio.create_task(_monitor_instance.start_monitoring())
    
    return _monitor_instance


@router.get("/status", response_model=MonitoringStatus)
async def get_monitoring_status(monitor: AITestMonitor = Depends(get_monitor)):
    """Get current monitoring system status"""
    try:
        dashboard_data = await monitor.get_dashboard_data()
        current_health = dashboard_data.get("current_health")
        
        if current_health:
            return MonitoringStatus(
                status="active",
                uptime=0.0,  # TODO: Calculate actual uptime
                active_services=current_health["active_services"],
                failed_services=current_health["failed_services"],
                last_check=datetime.fromisoformat(current_health["timestamp"])
            )
        else:
            return MonitoringStatus(
                status="initializing",
                uptime=0.0,
                active_services=[],
                failed_services=[],
                last_check=datetime.now()
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get monitoring status: {str(e)}")


@router.get("/dashboard")
async def get_dashboard_data(monitor: AITestMonitor = Depends(get_monitor)):
    """Get comprehensive dashboard data"""
    try:
        dashboard_data = await monitor.get_dashboard_data()
        return dashboard_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get dashboard data: {str(e)}")


@router.get("/health")
async def get_system_health(monitor: AITestMonitor = Depends(get_monitor)):
    """Get current system health metrics"""
    try:
        dashboard_data = await monitor.get_dashboard_data()
        current_health = dashboard_data.get("current_health")
        
        if not current_health:
            raise HTTPException(status_code=503, detail="Health data not available")
        
        return current_health
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get system health: {str(e)}")


@router.get("/alerts")
async def get_recent_alerts(
    limit: int = 20,
    severity: Optional[str] = None,
    monitor: AITestMonitor = Depends(get_monitor)
):
    """Get recent alerts with optional filtering"""
    try:
        dashboard_data = await monitor.get_dashboard_data()
        alerts = dashboard_data.get("recent_alerts", [])
        
        # Filter by severity if specified
        if severity:
            alerts = [alert for alert in alerts if alert.get("severity") == severity]
        
        # Limit results
        return alerts[:limit]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get alerts: {str(e)}")


@router.post("/alerts")
async def create_alert(
    alert_request: AlertRequest,
    monitor: AITestMonitor = Depends(get_monitor)
):
    """Create a custom alert"""
    try:
        from ..monitoring.ai_test_monitor import AlertSeverity
        
        await monitor._create_alert(
            severity=AlertSeverity(alert_request.severity),
            title=alert_request.title,
            description=alert_request.description,
            source=alert_request.source,
            metadata=alert_request.metadata or {}
        )
        
        return {"status": "success", "message": "Alert created successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create alert: {str(e)}")


@router.get("/metrics/summary")
async def get_metrics_summary(monitor: AITestMonitor = Depends(get_monitor)):
    """Get test metrics summary"""
    try:
        dashboard_data = await monitor.get_dashboard_data()
        metrics_summary = dashboard_data.get("metrics_summary", {})
        return metrics_summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get metrics summary: {str(e)}")


@router.get("/trends")
async def get_trend_data(
    hours: int = 24,
    monitor: AITestMonitor = Depends(get_monitor)
):
    """Get trend data for specified time period"""
    try:
        dashboard_data = await monitor.get_dashboard_data()
        trends = dashboard_data.get("trends", {})
        return trends
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get trend data: {str(e)}")


@router.get("/predictions")
async def get_ai_predictions(monitor: AITestMonitor = Depends(get_monitor)):
    """Get AI-powered predictions and insights"""
    try:
        dashboard_data = await monitor.get_dashboard_data()
        predictions = dashboard_data.get("predictions", {})
        return predictions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get predictions: {str(e)}")


@router.get("/live-stream")
async def get_live_monitoring_stream(monitor: AITestMonitor = Depends(get_monitor)):
    """Get real-time monitoring data stream using Server-Sent Events"""
    
    async def event_stream():
        """Generate Server-Sent Events for real-time monitoring"""
        while True:
            try:
                # Get current dashboard data
                dashboard_data = await monitor.get_dashboard_data()
                
                # Format as SSE
                event_data = json.dumps({
                    "timestamp": datetime.now().isoformat(),
                    "type": "monitoring_update",
                    "data": dashboard_data
                })
                
                yield f"data: {event_data}\n\n"
                
                # Wait before next update
                await asyncio.sleep(5)  # Update every 5 seconds
                
            except Exception as e:
                error_data = json.dumps({
                    "timestamp": datetime.now().isoformat(),
                    "type": "error",
                    "data": {"error": str(e)}
                })
                yield f"data: {error_data}\n\n"
                break
    
    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control"
        }
    )


@router.post("/test-results")
async def submit_test_results(
    test_results: Dict[str, Any],
    monitor: AITestMonitor = Depends(get_monitor)
):
    """Submit test results for monitoring"""
    try:
        # Process the submitted test results
        if "suites" in test_results:  # Playwright format
            await monitor._process_playwright_results(test_results)
        elif "testResults" in test_results:  # Jest format
            await monitor._process_jest_results(test_results)
        
        return {"status": "success", "message": "Test results processed successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process test results: {str(e)}")


@router.get("/health-history")
async def get_health_history(
    hours: int = 24,
    monitor: AITestMonitor = Depends(get_monitor)
):
    """Get system health history"""
    try:
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        # Filter health history by time range
        filtered_history = [
            health for health in monitor.health_history 
            if health.timestamp > cutoff_time
        ]
        
        # Convert to dict format
        history_data = [
            {
                "timestamp": health.timestamp.isoformat(),
                "overall_score": health.overall_score,
                "test_pass_rate": health.test_pass_rate,
                "performance_score": health.performance_score,
                "security_score": health.security_score,
                "accessibility_score": health.accessibility_score,
                "active_services": health.active_services,
                "failed_services": health.failed_services
            }
            for health in filtered_history
        ]
        
        return {"history": history_data, "total_points": len(history_data)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get health history: {str(e)}")


@router.post("/start-monitoring")
async def start_monitoring(background_tasks: BackgroundTasks):
    """Start the monitoring system"""
    try:
        monitor = await get_monitor()
        background_tasks.add_task(monitor.start_monitoring)
        return {"status": "success", "message": "Monitoring started"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start monitoring: {str(e)}")


@router.post("/stop-monitoring")
async def stop_monitoring(monitor: AITestMonitor = Depends(get_monitor)):
    """Stop the monitoring system"""
    try:
        await monitor.stop_monitoring()
        global _monitor_instance
        _monitor_instance = None
        return {"status": "success", "message": "Monitoring stopped"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to stop monitoring: {str(e)}")


@router.get("/export/metrics")
async def export_metrics(
    format: str = "json",
    hours: int = 24,
    monitor: AITestMonitor = Depends(get_monitor)
):
    """Export monitoring metrics in various formats"""
    try:
        # Get historical data
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        health_data = [
            {
                "timestamp": health.timestamp.isoformat(),
                "overall_score": health.overall_score,
                "test_pass_rate": health.test_pass_rate,
                "performance_score": health.performance_score,
                "security_score": health.security_score,
                "accessibility_score": health.accessibility_score
            }
            for health in monitor.health_history
            if health.timestamp > cutoff_time
        ]
        
        alerts_data = [
            alert for alert in monitor.alerts_history
            if datetime.fromisoformat(alert["timestamp"]) > cutoff_time
        ]
        
        export_data = {
            "export_timestamp": datetime.now().isoformat(),
            "time_range_hours": hours,
            "health_metrics": health_data,
            "alerts": alerts_data,
            "summary": {
                "total_health_points": len(health_data),
                "total_alerts": len(alerts_data),
                "avg_overall_score": sum(h["overall_score"] for h in health_data) / len(health_data) if health_data else 0
            }
        }
        
        if format.lower() == "csv":
            # Convert to CSV format (simplified)
            import io
            import csv
            
            output = io.StringIO()
            if health_data:
                writer = csv.DictWriter(output, fieldnames=health_data[0].keys())
                writer.writeheader()
                writer.writerows(health_data)
            
            return StreamingResponse(
                io.BytesIO(output.getvalue().encode()),
                media_type="text/csv",
                headers={"Content-Disposition": "attachment; filename=monitoring_metrics.csv"}
            )
        
        return export_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export metrics: {str(e)}")


# Health check for the monitoring system itself
@router.get("/system-check")
async def monitoring_system_check():
    """Check if monitoring system is healthy"""
    try:
        global _monitor_instance
        
        status = {
            "monitoring_active": _monitor_instance is not None,
            "database_connected": False,
            "services_reachable": {},
            "timestamp": datetime.now().isoformat()
        }
        
        if _monitor_instance and _monitor_instance.db_pool:
            try:
                async with _monitor_instance.db_pool.acquire() as conn:
                    await conn.fetchval("SELECT 1")
                status["database_connected"] = True
            except:
                status["database_connected"] = False
        
        # Check key services
        import aiohttp
        services = {
            "backend": "http://localhost:8000/health",
            "frontend": "http://localhost:3002"
        }
        
        async with aiohttp.ClientSession() as session:
            for service, url in services.items():
                try:
                    async with session.get(url, timeout=5) as response:
                        status["services_reachable"][service] = response.status == 200
                except:
                    status["services_reachable"][service] = False
        
        overall_health = (
            status["monitoring_active"] and
            status["database_connected"] and
            all(status["services_reachable"].values())
        )
        
        status["overall_health"] = "healthy" if overall_health else "degraded"
        
        return status
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"System check failed: {str(e)}")