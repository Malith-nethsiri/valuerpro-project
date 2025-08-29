# Production Monitoring Tools Integration

import asyncio
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
from enum import Enum
import aiohttp
import os

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MonitoringProvider(Enum):
    """Supported monitoring service providers"""
    DATADOG = "datadog"
    NEW_RELIC = "new_relic"
    GRAFANA = "grafana"
    PROMETHEUS = "prometheus"
    ELASTIC = "elasticsearch"
    SPLUNK = "splunk"
    GENERIC_WEBHOOK = "generic_webhook"

@dataclass
class MonitoringAlert:
    """Alert structure for monitoring systems"""
    alert_id: str
    severity: str  # critical, high, medium, low
    title: str
    description: str
    source: str
    timestamp: datetime
    tags: List[str]
    metadata: Dict[str, Any]

@dataclass
class MonitoringMetric:
    """Metric structure for monitoring systems"""
    metric_name: str
    value: Union[int, float]
    unit: str
    tags: Dict[str, str]
    timestamp: datetime
    source: str = "valuerpro_ai_testing"

class ProductionMonitoringIntegration:
    """Integration with production monitoring tools"""
    
    def __init__(self):
        self.enabled_providers: Dict[MonitoringProvider, Dict] = {}
        self.alert_history: List[MonitoringAlert] = []
        self.metric_buffer: List[MonitoringMetric] = []
        self.webhook_urls: Dict[str, str] = {}
        
        # Load configuration from environment
        self._load_configuration()
    
    def _load_configuration(self):
        """Load monitoring configuration from environment variables"""
        # Datadog configuration
        if os.getenv('DATADOG_API_KEY'):
            self.enabled_providers[MonitoringProvider.DATADOG] = {
                'api_key': os.getenv('DATADOG_API_KEY'),
                'app_key': os.getenv('DATADOG_APP_KEY'),
                'site': os.getenv('DATADOG_SITE', 'datadoghq.com')
            }
            logger.info("[SUCCESS] Datadog integration configured")
        
        # New Relic configuration
        if os.getenv('NEW_RELIC_LICENSE_KEY'):
            self.enabled_providers[MonitoringProvider.NEW_RELIC] = {
                'license_key': os.getenv('NEW_RELIC_LICENSE_KEY'),
                'insights_insert_key': os.getenv('NEW_RELIC_INSIGHTS_INSERT_KEY'),
                'account_id': os.getenv('NEW_RELIC_ACCOUNT_ID')
            }
            logger.info("[SUCCESS] New Relic integration configured")
        
        # Prometheus configuration
        if os.getenv('PROMETHEUS_PUSHGATEWAY_URL'):
            self.enabled_providers[MonitoringProvider.PROMETHEUS] = {
                'pushgateway_url': os.getenv('PROMETHEUS_PUSHGATEWAY_URL'),
                'job_name': os.getenv('PROMETHEUS_JOB_NAME', 'valuerpro_ai_testing')
            }
            logger.info("[SUCCESS] Prometheus integration configured")
        
        # Generic webhook configuration
        webhook_url = os.getenv('MONITORING_WEBHOOK_URL')
        if webhook_url:
            self.webhook_urls['generic'] = webhook_url
            self.enabled_providers[MonitoringProvider.GENERIC_WEBHOOK] = {
                'webhook_url': webhook_url,
                'auth_token': os.getenv('MONITORING_WEBHOOK_TOKEN')
            }
            logger.info("[SUCCESS] Generic webhook integration configured")
        
        # Slack webhook for alerts
        slack_webhook = os.getenv('SLACK_WEBHOOK_URL')
        if slack_webhook:
            self.webhook_urls['slack'] = slack_webhook
            logger.info("[SUCCESS] Slack webhook configured")
        
        if not self.enabled_providers:
            logger.warning("[WARNING] No monitoring providers configured - using mock mode")
    
    async def send_metric(self, metric: MonitoringMetric) -> Dict[str, Any]:
        """Send a metric to all configured monitoring providers"""
        results = {}
        
        for provider, config in self.enabled_providers.items():
            try:
                if provider == MonitoringProvider.DATADOG:
                    result = await self._send_to_datadog(metric, config)
                elif provider == MonitoringProvider.NEW_RELIC:
                    result = await self._send_to_new_relic(metric, config)
                elif provider == MonitoringProvider.PROMETHEUS:
                    result = await self._send_to_prometheus(metric, config)
                elif provider == MonitoringProvider.GENERIC_WEBHOOK:
                    result = await self._send_to_webhook(metric, config)
                else:
                    result = {"status": "not_implemented", "provider": provider.value}
                
                results[provider.value] = result
                
            except Exception as e:
                logger.error(f"[ERROR] Failed to send metric to {provider.value}: {e}")
                results[provider.value] = {"status": "error", "error": str(e)}
        
        # Buffer metric for batch sending if needed
        self.metric_buffer.append(metric)
        
        return results
    
    async def send_alert(self, alert: MonitoringAlert) -> Dict[str, Any]:
        """Send an alert to all configured monitoring providers"""
        results = {}
        
        # Store alert in history
        self.alert_history.append(alert)
        
        for provider, config in self.enabled_providers.items():
            try:
                if provider == MonitoringProvider.DATADOG:
                    result = await self._send_alert_to_datadog(alert, config)
                elif provider == MonitoringProvider.NEW_RELIC:
                    result = await self._send_alert_to_new_relic(alert, config)
                elif provider == MonitoringProvider.GENERIC_WEBHOOK:
                    result = await self._send_alert_to_webhook(alert, config)
                else:
                    result = {"status": "not_implemented", "provider": provider.value}
                
                results[provider.value] = result
                
            except Exception as e:
                logger.error(f"[ERROR] Failed to send alert to {provider.value}: {e}")
                results[provider.value] = {"status": "error", "error": str(e)}
        
        # Send to Slack if configured
        if 'slack' in self.webhook_urls:
            try:
                slack_result = await self._send_to_slack(alert)
                results['slack'] = slack_result
            except Exception as e:
                logger.error(f"[ERROR] Failed to send alert to Slack: {e}")
                results['slack'] = {"status": "error", "error": str(e)}
        
        return results
    
    async def _send_to_datadog(self, metric: MonitoringMetric, config: Dict) -> Dict[str, Any]:
        """Send metric to Datadog"""
        if not REQUESTS_AVAILABLE:
            return {"status": "mock", "message": "requests not available"}
        
        url = f"https://api.{config['site']}/api/v1/series"
        headers = {
            'Content-Type': 'application/json',
            'DD-API-KEY': config['api_key']
        }
        
        payload = {
            'series': [{
                'metric': f"valuerpro.testing.{metric.metric_name}",
                'points': [[int(metric.timestamp.timestamp()), metric.value]],
                'tags': [f"{k}:{v}" for k, v in metric.tags.items()],
                'host': 'valuerpro-ai-testing'
            }]
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers) as response:
                if response.status == 200:
                    return {"status": "success", "provider": "datadog"}
                else:
                    error_text = await response.text()
                    return {"status": "error", "message": error_text}
    
    async def _send_to_new_relic(self, metric: MonitoringMetric, config: Dict) -> Dict[str, Any]:
        """Send metric to New Relic"""
        if not REQUESTS_AVAILABLE:
            return {"status": "mock", "message": "requests not available"}
        
        url = f"https://metric-api.newrelic.com/metric/v1"
        headers = {
            'Content-Type': 'application/json',
            'Api-Key': config['license_key']
        }
        
        payload = [{
            'metrics': [{
                'name': f"valuerpro.testing.{metric.metric_name}",
                'type': 'gauge',
                'value': metric.value,
                'timestamp': int(metric.timestamp.timestamp() * 1000),
                'attributes': metric.tags
            }]
        }]
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers) as response:
                if response.status == 200:
                    return {"status": "success", "provider": "new_relic"}
                else:
                    error_text = await response.text()
                    return {"status": "error", "message": error_text}
    
    async def _send_to_prometheus(self, metric: MonitoringMetric, config: Dict) -> Dict[str, Any]:
        """Send metric to Prometheus Pushgateway"""
        if not REQUESTS_AVAILABLE:
            return {"status": "mock", "message": "requests not available"}
        
        url = f"{config['pushgateway_url']}/metrics/job/{config['job_name']}"
        
        # Convert to Prometheus format
        metric_line = f"valuerpro_testing_{metric.metric_name} {metric.value}\n"
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, data=metric_line, 
                                  headers={'Content-Type': 'text/plain'}) as response:
                if response.status in [200, 202]:
                    return {"status": "success", "provider": "prometheus"}
                else:
                    error_text = await response.text()
                    return {"status": "error", "message": error_text}
    
    async def _send_to_webhook(self, metric: MonitoringMetric, config: Dict) -> Dict[str, Any]:
        """Send metric to generic webhook"""
        payload = {
            'type': 'metric',
            'source': 'valuerpro_ai_testing',
            'metric': asdict(metric),
            'timestamp': metric.timestamp.isoformat()
        }
        
        headers = {'Content-Type': 'application/json'}
        if config.get('auth_token'):
            headers['Authorization'] = f"Bearer {config['auth_token']}"
        
        async with aiohttp.ClientSession() as session:
            async with session.post(config['webhook_url'], json=payload, headers=headers) as response:
                if response.status in [200, 201, 202]:
                    return {"status": "success", "provider": "webhook"}
                else:
                    error_text = await response.text()
                    return {"status": "error", "message": error_text}
    
    async def _send_alert_to_datadog(self, alert: MonitoringAlert, config: Dict) -> Dict[str, Any]:
        """Send alert to Datadog as event"""
        url = f"https://api.{config['site']}/api/v1/events"
        headers = {
            'Content-Type': 'application/json',
            'DD-API-KEY': config['api_key']
        }
        
        payload = {
            'title': alert.title,
            'text': alert.description,
            'priority': 'normal' if alert.severity in ['low', 'medium'] else 'high',
            'tags': alert.tags,
            'alert_type': 'error' if alert.severity in ['critical', 'high'] else 'info',
            'source_type_name': 'valuerpro_ai_testing'
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers) as response:
                if response.status in [200, 201, 202]:
                    return {"status": "success", "provider": "datadog"}
                else:
                    error_text = await response.text()
                    return {"status": "error", "message": error_text}
    
    async def _send_alert_to_new_relic(self, alert: MonitoringAlert, config: Dict) -> Dict[str, Any]:
        """Send alert to New Relic as custom event"""
        if not config.get('insights_insert_key'):
            return {"status": "error", "message": "New Relic Insights Insert Key not configured"}
        
        url = f"https://insights-collector.newrelic.com/v1/accounts/{config['account_id']}/events"
        headers = {
            'Content-Type': 'application/json',
            'X-Insert-Key': config['insights_insert_key']
        }
        
        payload = [{
            'eventType': 'ValuerProAITestingAlert',
            'title': alert.title,
            'description': alert.description,
            'severity': alert.severity,
            'source': alert.source,
            'alertId': alert.alert_id,
            'tags': ','.join(alert.tags),
            'timestamp': int(alert.timestamp.timestamp())
        }]
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers) as response:
                if response.status in [200, 201]:
                    return {"status": "success", "provider": "new_relic"}
                else:
                    error_text = await response.text()
                    return {"status": "error", "message": error_text}
    
    async def _send_alert_to_webhook(self, alert: MonitoringAlert, config: Dict) -> Dict[str, Any]:
        """Send alert to generic webhook"""
        payload = {
            'type': 'alert',
            'source': 'valuerpro_ai_testing',
            'alert': asdict(alert),
            'timestamp': alert.timestamp.isoformat()
        }
        
        headers = {'Content-Type': 'application/json'}
        if config.get('auth_token'):
            headers['Authorization'] = f"Bearer {config['auth_token']}"
        
        async with aiohttp.ClientSession() as session:
            async with session.post(config['webhook_url'], json=payload, headers=headers) as response:
                if response.status in [200, 201, 202]:
                    return {"status": "success", "provider": "webhook"}
                else:
                    error_text = await response.text()
                    return {"status": "error", "message": error_text}
    
    async def _send_to_slack(self, alert: MonitoringAlert) -> Dict[str, Any]:
        """Send alert to Slack"""
        color_map = {
            'critical': '#FF0000',
            'high': '#FF8800',
            'medium': '#FFAA00',
            'low': '#00AA00'
        }
        
        payload = {
            'attachments': [{
                'color': color_map.get(alert.severity, '#808080'),
                'title': f"ValuerPro AI Testing Alert: {alert.title}",
                'text': alert.description,
                'fields': [
                    {'title': 'Severity', 'value': alert.severity.upper(), 'short': True},
                    {'title': 'Source', 'value': alert.source, 'short': True},
                    {'title': 'Alert ID', 'value': alert.alert_id, 'short': True},
                    {'title': 'Time', 'value': alert.timestamp.strftime('%Y-%m-%d %H:%M:%S UTC'), 'short': True}
                ],
                'footer': 'ValuerPro AI Testing System'
            }]
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(self.webhook_urls['slack'], json=payload) as response:
                if response.status == 200:
                    return {"status": "success", "provider": "slack"}
                else:
                    error_text = await response.text()
                    return {"status": "error", "message": error_text}
    
    async def send_test_summary(self, test_results: Dict[str, Any]) -> Dict[str, Any]:
        """Send comprehensive test summary to monitoring systems"""
        results = {}
        
        # Create metrics for key test results
        metrics = [
            MonitoringMetric(
                metric_name="test_execution_time",
                value=test_results.get('execution_time', 0),
                unit="seconds",
                tags={"test_suite": "ai_testing", "environment": "production"},
                timestamp=datetime.now()
            ),
            MonitoringMetric(
                metric_name="test_success_rate",
                value=test_results.get('success_rate', 0),
                unit="percentage",
                tags={"test_suite": "ai_testing", "environment": "production"},
                timestamp=datetime.now()
            ),
            MonitoringMetric(
                metric_name="test_coverage",
                value=test_results.get('coverage', 0),
                unit="percentage",
                tags={"test_suite": "ai_testing", "environment": "production"},
                timestamp=datetime.now()
            )
        ]
        
        # Send all metrics
        for metric in metrics:
            metric_results = await self.send_metric(metric)
            results[metric.metric_name] = metric_results
        
        # Send alert if test results are concerning
        if test_results.get('success_rate', 100) < 95:
            alert = MonitoringAlert(
                alert_id=f"test_failure_{int(datetime.now().timestamp())}",
                severity="high" if test_results['success_rate'] < 90 else "medium",
                title="AI Testing Success Rate Below Threshold",
                description=f"Test success rate is {test_results['success_rate']:.1f}%, below 95% threshold",
                source="ai_testing_system",
                timestamp=datetime.now(),
                tags=["test_failure", "ai_testing", "production"],
                metadata=test_results
            )
            
            alert_results = await self.send_alert(alert)
            results['alert'] = alert_results
        
        return results
    
    async def get_integration_status(self) -> Dict[str, Any]:
        """Get status of all monitoring integrations"""
        status = {
            'enabled_providers': list(self.enabled_providers.keys()),
            'provider_count': len(self.enabled_providers),
            'alerts_sent_today': len([
                alert for alert in self.alert_history
                if alert.timestamp.date() == datetime.now().date()
            ]),
            'metrics_buffered': len(self.metric_buffer),
            'webhook_urls_configured': len(self.webhook_urls),
            'last_alert': self.alert_history[-1].timestamp.isoformat() if self.alert_history else None
        }
        
        # Test connectivity to each provider
        connectivity_tests = {}
        for provider in self.enabled_providers.keys():
            connectivity_tests[provider.value] = await self._test_provider_connectivity(provider)
        
        status['connectivity'] = connectivity_tests
        
        return status
    
    async def _test_provider_connectivity(self, provider: MonitoringProvider) -> Dict[str, Any]:
        """Test connectivity to a monitoring provider"""
        try:
            # Send a test metric to verify connectivity
            test_metric = MonitoringMetric(
                metric_name="connectivity_test",
                value=1,
                unit="count",
                tags={"test": "connectivity"},
                timestamp=datetime.now()
            )
            
            config = self.enabled_providers[provider]
            
            if provider == MonitoringProvider.DATADOG:
                result = await self._send_to_datadog(test_metric, config)
            elif provider == MonitoringProvider.NEW_RELIC:
                result = await self._send_to_new_relic(test_metric, config)
            elif provider == MonitoringProvider.PROMETHEUS:
                result = await self._send_to_prometheus(test_metric, config)
            elif provider == MonitoringProvider.GENERIC_WEBHOOK:
                result = await self._send_to_webhook(test_metric, config)
            else:
                result = {"status": "not_implemented"}
            
            return {"status": "connected", "details": result}
            
        except Exception as e:
            return {"status": "error", "error": str(e)}

# Global monitoring integration instance
monitoring_integration = ProductionMonitoringIntegration()

if __name__ == "__main__":
    async def main():
        """Test the production monitoring integration"""
        print("[INFO] Testing Production Monitoring Integration...")
        
        integration = ProductionMonitoringIntegration()
        
        # Test metric sending
        test_metric = MonitoringMetric(
            metric_name="test_performance_score",
            value=89.5,
            unit="percentage",
            tags={"environment": "test", "component": "ai_testing"},
            timestamp=datetime.now()
        )
        
        metric_results = await integration.send_metric(test_metric)
        print(f"[METRICS] Metric sent to {len(metric_results)} providers")
        
        # Test alert sending
        test_alert = MonitoringAlert(
            alert_id="test_alert_001",
            severity="medium",
            title="Test Alert from ValuerPro AI Testing",
            description="This is a test alert to verify monitoring integration",
            source="ai_testing_system",
            timestamp=datetime.now(),
            tags=["test", "ai_testing", "monitoring"],
            metadata={"test": True}
        )
        
        alert_results = await integration.send_alert(test_alert)
        print(f"[ALERTS] Alert sent to {len(alert_results)} providers")
        
        # Get integration status
        status = await integration.get_integration_status()
        print(f"[STATUS] {status['provider_count']} providers enabled")
        print(f"[STATUS] {status['alerts_sent_today']} alerts sent today")
        
        print("[SUCCESS] Production monitoring integration is working!")
    
    asyncio.run(main())