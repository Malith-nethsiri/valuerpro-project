# API endpoints for production monitoring integration

from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Dict, Any, List, Optional
import logging
from datetime import datetime, timedelta
from pydantic import BaseModel

try:
    from ..integrations.production_monitoring import (
        monitoring_integration, 
        MonitoringAlert, 
        MonitoringMetric,
        MonitoringProvider
    )
    MONITORING_AVAILABLE = True
except ImportError:
    MONITORING_AVAILABLE = False
    logging.warning("Production monitoring module not available - using mock data")

router = APIRouter(prefix="/production-monitoring", tags=["production-monitoring"])
logger = logging.getLogger(__name__)

class AlertRequest(BaseModel):
    severity: str
    title: str
    description: str
    source: str
    tags: List[str] = []
    metadata: Dict[str, Any] = {}

class MetricRequest(BaseModel):
    metric_name: str
    value: float
    unit: str = "count"
    tags: Dict[str, str] = {}

class TestSummaryRequest(BaseModel):
    execution_time: float
    success_rate: float
    coverage: float
    total_tests: int
    failed_tests: int = 0
    metadata: Dict[str, Any] = {}

@router.get("/status")
async def get_integration_status() -> Dict[str, Any]:
    """Get status of all production monitoring integrations"""
    if not MONITORING_AVAILABLE:
        return {
            "status": "service_unavailable",
            "message": "Production monitoring service not available",
            "mock_data": True,
            "enabled_providers": ["mock_datadog", "mock_new_relic"],
            "provider_count": 2,
            "connectivity": {
                "mock_datadog": {"status": "connected"},
                "mock_new_relic": {"status": "connected"}
            }
        }
    
    try:
        status = await monitoring_integration.get_integration_status()
        return {
            "status": "active",
            "integration_status": status,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting integration status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/send-metric")
async def send_metric(metric_request: MetricRequest) -> Dict[str, Any]:
    """Send a metric to all configured monitoring providers"""
    if not MONITORING_AVAILABLE:
        # Return mock response
        return {
            "mock_data": True,
            "message": f"Mock metric '{metric_request.metric_name}' sent",
            "value": metric_request.value,
            "results": {
                "mock_datadog": {"status": "success"},
                "mock_new_relic": {"status": "success"}
            },
            "timestamp": datetime.now().isoformat()
        }
    
    try:
        metric = MonitoringMetric(
            metric_name=metric_request.metric_name,
            value=metric_request.value,
            unit=metric_request.unit,
            tags=metric_request.tags,
            timestamp=datetime.now()
        )
        
        results = await monitoring_integration.send_metric(metric)
        
        return {
            "message": f"Metric '{metric_request.metric_name}' sent to monitoring providers",
            "metric": {
                "name": metric_request.metric_name,
                "value": metric_request.value,
                "unit": metric_request.unit,
                "tags": metric_request.tags
            },
            "results": results,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error sending metric: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/send-alert")
async def send_alert(alert_request: AlertRequest) -> Dict[str, Any]:
    """Send an alert to all configured monitoring providers"""
    if not MONITORING_AVAILABLE:
        # Return mock response
        import random
        return {
            "mock_data": True,
            "message": f"Mock alert '{alert_request.title}' sent",
            "alert_id": f"mock_alert_{random.randint(1000, 9999)}",
            "severity": alert_request.severity,
            "results": {
                "mock_datadog": {"status": "success"},
                "mock_slack": {"status": "success"}
            },
            "timestamp": datetime.now().isoformat()
        }
    
    try:
        alert = MonitoringAlert(
            alert_id=f"alert_{int(datetime.now().timestamp())}",
            severity=alert_request.severity,
            title=alert_request.title,
            description=alert_request.description,
            source=alert_request.source,
            timestamp=datetime.now(),
            tags=alert_request.tags,
            metadata=alert_request.metadata
        )
        
        results = await monitoring_integration.send_alert(alert)
        
        return {
            "message": f"Alert '{alert_request.title}' sent to monitoring providers",
            "alert": {
                "id": alert.alert_id,
                "severity": alert_request.severity,
                "title": alert_request.title,
                "source": alert_request.source,
                "tags": alert_request.tags
            },
            "results": results,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error sending alert: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/send-test-summary")
async def send_test_summary(summary_request: TestSummaryRequest) -> Dict[str, Any]:
    """Send comprehensive test summary to monitoring systems"""
    if not MONITORING_AVAILABLE:
        # Return mock response
        return {
            "mock_data": True,
            "message": "Mock test summary sent to monitoring providers",
            "test_summary": {
                "execution_time": summary_request.execution_time,
                "success_rate": summary_request.success_rate,
                "coverage": summary_request.coverage,
                "total_tests": summary_request.total_tests
            },
            "results": {
                "test_execution_time": {"mock_datadog": {"status": "success"}},
                "test_success_rate": {"mock_new_relic": {"status": "success"}},
                "test_coverage": {"mock_prometheus": {"status": "success"}}
            },
            "alerts_triggered": 1 if summary_request.success_rate < 95 else 0,
            "timestamp": datetime.now().isoformat()
        }
    
    try:
        test_results = {
            'execution_time': summary_request.execution_time,
            'success_rate': summary_request.success_rate,
            'coverage': summary_request.coverage,
            'total_tests': summary_request.total_tests,
            'failed_tests': summary_request.failed_tests,
            'metadata': summary_request.metadata
        }
        
        results = await monitoring_integration.send_test_summary(test_results)
        
        return {
            "message": "Test summary sent to monitoring providers",
            "test_summary": test_results,
            "results": results,
            "alerts_triggered": 1 if 'alert' in results else 0,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error sending test summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/providers")
async def get_available_providers() -> Dict[str, Any]:
    """Get list of available monitoring providers"""
    if not MONITORING_AVAILABLE:
        return {
            "mock_data": True,
            "providers": [
                {
                    "name": "mock_datadog",
                    "type": "datadog",
                    "status": "enabled",
                    "capabilities": ["metrics", "alerts", "events"]
                },
                {
                    "name": "mock_new_relic",
                    "type": "new_relic", 
                    "status": "enabled",
                    "capabilities": ["metrics", "alerts", "custom_events"]
                },
                {
                    "name": "mock_slack",
                    "type": "slack",
                    "status": "enabled",
                    "capabilities": ["alerts", "notifications"]
                }
            ]
        }
    
    try:
        enabled_providers = []
        for provider, config in monitoring_integration.enabled_providers.items():
            capabilities = []
            if provider.value in ['datadog', 'new_relic', 'prometheus']:
                capabilities.extend(['metrics', 'alerts'])
            if provider.value in ['datadog', 'new_relic']:
                capabilities.append('events')
            if provider.value == 'generic_webhook':
                capabilities.extend(['metrics', 'alerts', 'webhooks'])
            
            enabled_providers.append({
                "name": provider.value,
                "type": provider.value,
                "status": "enabled",
                "capabilities": capabilities
            })
        
        # Add webhook providers
        for webhook_name in monitoring_integration.webhook_urls.keys():
            if webhook_name not in [p["name"] for p in enabled_providers]:
                enabled_providers.append({
                    "name": webhook_name,
                    "type": "webhook",
                    "status": "enabled",
                    "capabilities": ["alerts", "notifications"]
                })
        
        return {
            "providers": enabled_providers,
            "total_count": len(enabled_providers),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting providers: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/alerts/history")
async def get_alert_history(limit: Optional[int] = 20) -> Dict[str, Any]:
    """Get recent alert history"""
    if not MONITORING_AVAILABLE:
        # Return mock alert history
        import random
        from datetime import datetime, timedelta
        
        mock_alerts = []
        for i in range(min(limit, 10)):
            mock_alerts.append({
                "alert_id": f"mock_alert_{i+1}",
                "severity": random.choice(["low", "medium", "high", "critical"]),
                "title": f"Mock Alert #{i+1}",
                "description": f"Mock alert description for testing {i+1}",
                "source": "ai_testing_system",
                "timestamp": (datetime.now() - timedelta(hours=i)).isoformat(),
                "tags": ["mock", "testing", "ai"]
            })
        
        return {
            "mock_data": True,
            "alerts": mock_alerts,
            "total_count": len(mock_alerts)
        }
    
    try:
        recent_alerts = monitoring_integration.alert_history[-limit:] if monitoring_integration.alert_history else []
        
        alert_data = []
        for alert in recent_alerts:
            alert_data.append({
                "alert_id": alert.alert_id,
                "severity": alert.severity,
                "title": alert.title,
                "description": alert.description,
                "source": alert.source,
                "timestamp": alert.timestamp.isoformat(),
                "tags": alert.tags
            })
        
        return {
            "alerts": alert_data,
            "total_count": len(alert_data),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting alert history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/metrics/recent")
async def get_recent_metrics(limit: Optional[int] = 50) -> Dict[str, Any]:
    """Get recently sent metrics"""
    if not MONITORING_AVAILABLE:
        # Return mock metrics
        import random
        from datetime import datetime, timedelta
        
        mock_metrics = []
        metric_names = ["test_execution_time", "test_success_rate", "test_coverage", "performance_score"]
        
        for i in range(min(limit, 20)):
            mock_metrics.append({
                "metric_name": random.choice(metric_names),
                "value": round(random.uniform(50, 100), 2),
                "unit": random.choice(["seconds", "percentage", "count"]),
                "tags": {"environment": "test", "component": "ai_testing"},
                "timestamp": (datetime.now() - timedelta(minutes=i*5)).isoformat()
            })
        
        return {
            "mock_data": True,
            "metrics": mock_metrics,
            "total_count": len(mock_metrics)
        }
    
    try:
        recent_metrics = monitoring_integration.metric_buffer[-limit:] if monitoring_integration.metric_buffer else []
        
        metric_data = []
        for metric in recent_metrics:
            metric_data.append({
                "metric_name": metric.metric_name,
                "value": metric.value,
                "unit": metric.unit,
                "tags": metric.tags,
                "timestamp": metric.timestamp.isoformat()
            })
        
        return {
            "metrics": metric_data,
            "total_count": len(metric_data),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting recent metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/test-connectivity")
async def test_connectivity() -> Dict[str, Any]:
    """Test connectivity to all configured monitoring providers"""
    if not MONITORING_AVAILABLE:
        return {
            "mock_data": True,
            "message": "Mock connectivity test completed",
            "results": {
                "mock_datadog": {"status": "connected", "response_time": "45ms"},
                "mock_new_relic": {"status": "connected", "response_time": "67ms"},
                "mock_slack": {"status": "connected", "response_time": "23ms"}
            },
            "overall_status": "healthy"
        }
    
    try:
        status = await monitoring_integration.get_integration_status()
        connectivity_results = status.get('connectivity', {})
        
        overall_healthy = all(
            result.get('status') == 'connected' 
            for result in connectivity_results.values()
        )
        
        return {
            "message": "Connectivity test completed",
            "results": connectivity_results,
            "overall_status": "healthy" if overall_healthy else "degraded",
            "tested_providers": len(connectivity_results),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error testing connectivity: {e}")
        raise HTTPException(status_code=500, detail=str(e))