"""
AI-Powered Test Monitoring System
Real-time monitoring, alerting, and analytics for ValuerPro QA testing
"""
import asyncio
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from pathlib import Path
import logging
from enum import Enum

import aiohttp
import asyncpg
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AlertSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class TestStatus(Enum):
    RUNNING = "running"
    PASSED = "passed"
    FAILED = "failed"
    SKIPPED = "skipped"
    ERROR = "error"


@dataclass
class TestMetric:
    """Individual test metric data point"""
    test_name: str
    status: TestStatus
    execution_time: float
    timestamp: datetime
    error_message: Optional[str] = None
    coverage_percentage: Optional[float] = None
    performance_score: Optional[float] = None
    ai_confidence: Optional[float] = None


@dataclass
class SystemHealth:
    """Overall system health metrics"""
    timestamp: datetime
    overall_score: float
    test_pass_rate: float
    performance_score: float
    security_score: float
    accessibility_score: float
    active_services: List[str]
    failed_services: List[str]
    ai_predictions: Dict[str, Any]


class AITestMonitor:
    """Advanced AI-powered test monitoring system"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.metrics_history: List[TestMetric] = []
        self.alerts_history: List[Dict] = []
        self.health_history: List[SystemHealth] = []
        self.db_pool: Optional[asyncpg.Pool] = None
        self.monitoring_active = False
        
    async def initialize(self):
        """Initialize monitoring system"""
        try:
            # Initialize database connection
            if self.config.get("database_url"):
                self.db_pool = await asyncpg.create_pool(
                    self.config["database_url"],
                    min_size=1,
                    max_size=5
                )
                await self._create_monitoring_tables()
            
            logger.info("AI Test Monitor initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize AI Test Monitor: {e}")
            raise

    async def _create_monitoring_tables(self):
        """Create monitoring database tables"""
        async with self.db_pool.acquire() as conn:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS test_metrics (
                    id SERIAL PRIMARY KEY,
                    test_name VARCHAR(255) NOT NULL,
                    status VARCHAR(50) NOT NULL,
                    execution_time FLOAT NOT NULL,
                    timestamp TIMESTAMP DEFAULT NOW(),
                    error_message TEXT,
                    coverage_percentage FLOAT,
                    performance_score FLOAT,
                    ai_confidence FLOAT
                )
            """)
            
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS system_health (
                    id SERIAL PRIMARY KEY,
                    timestamp TIMESTAMP DEFAULT NOW(),
                    overall_score FLOAT NOT NULL,
                    test_pass_rate FLOAT NOT NULL,
                    performance_score FLOAT NOT NULL,
                    security_score FLOAT NOT NULL,
                    accessibility_score FLOAT NOT NULL,
                    active_services TEXT[],
                    failed_services TEXT[],
                    ai_predictions JSONB
                )
            """)
            
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS alerts (
                    id SERIAL PRIMARY KEY,
                    timestamp TIMESTAMP DEFAULT NOW(),
                    severity VARCHAR(20) NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    description TEXT NOT NULL,
                    source VARCHAR(100) NOT NULL,
                    resolved BOOLEAN DEFAULT FALSE,
                    metadata JSONB
                )
            """)

    async def start_monitoring(self):
        """Start real-time monitoring"""
        self.monitoring_active = True
        logger.info("Starting AI-powered real-time monitoring...")
        
        # Start monitoring tasks
        tasks = [
            asyncio.create_task(self._monitor_system_health()),
            asyncio.create_task(self._monitor_test_execution()),
            asyncio.create_task(self._analyze_trends()),
            asyncio.create_task(self._check_alerts()),
            asyncio.create_task(self._generate_predictions())
        ]
        
        await asyncio.gather(*tasks)

    async def _monitor_system_health(self):
        """Monitor overall system health"""
        while self.monitoring_active:
            try:
                health = await self._collect_system_health()
                self.health_history.append(health)
                
                # Keep only last 1000 entries
                if len(self.health_history) > 1000:
                    self.health_history = self.health_history[-1000:]
                
                # Store in database
                if self.db_pool:
                    await self._store_health_metric(health)
                
                # Check for health alerts
                await self._check_health_alerts(health)
                
            except Exception as e:
                logger.error(f"Error monitoring system health: {e}")
            
            await asyncio.sleep(30)  # Check every 30 seconds

    async def _collect_system_health(self) -> SystemHealth:
        """Collect current system health metrics"""
        try:
            # Check service health
            services_health = await self._check_services_health()
            
            # Calculate scores
            test_pass_rate = await self._calculate_test_pass_rate()
            performance_score = await self._calculate_performance_score()
            security_score = await self._calculate_security_score()
            accessibility_score = await self._calculate_accessibility_score()
            
            overall_score = (test_pass_rate + performance_score + 
                           security_score + accessibility_score) / 4
            
            # Generate AI predictions
            ai_predictions = await self._generate_ai_predictions()
            
            return SystemHealth(
                timestamp=datetime.now(),
                overall_score=overall_score,
                test_pass_rate=test_pass_rate,
                performance_score=performance_score,
                security_score=security_score,
                accessibility_score=accessibility_score,
                active_services=services_health["active"],
                failed_services=services_health["failed"],
                ai_predictions=ai_predictions
            )
            
        except Exception as e:
            logger.error(f"Error collecting system health: {e}")
            return SystemHealth(
                timestamp=datetime.now(),
                overall_score=0.0,
                test_pass_rate=0.0,
                performance_score=0.0,
                security_score=0.0,
                accessibility_score=0.0,
                active_services=[],
                failed_services=["monitoring_error"],
                ai_predictions={"error": str(e)}
            )

    async def _check_services_health(self) -> Dict[str, List[str]]:
        """Check health of all services"""
        services = {
            "backend": "http://localhost:8000/health",
            "frontend": "http://localhost:3002",
            "database": None  # Will check via connection
        }
        
        active_services = []
        failed_services = []
        
        async with aiohttp.ClientSession() as session:
            for service_name, url in services.items():
                if url:
                    try:
                        async with session.get(url, timeout=5) as response:
                            if response.status == 200:
                                active_services.append(service_name)
                            else:
                                failed_services.append(service_name)
                    except:
                        failed_services.append(service_name)
                else:
                    # Database health check
                    if self.db_pool:
                        try:
                            async with self.db_pool.acquire() as conn:
                                await conn.fetchval("SELECT 1")
                            active_services.append("database")
                        except:
                            failed_services.append("database")
        
        return {"active": active_services, "failed": failed_services}

    async def _calculate_test_pass_rate(self) -> float:
        """Calculate current test pass rate"""
        if not self.metrics_history:
            return 100.0
        
        recent_tests = [m for m in self.metrics_history 
                       if m.timestamp > datetime.now() - timedelta(hours=1)]
        
        if not recent_tests:
            return 100.0
        
        passed_tests = len([t for t in recent_tests if t.status == TestStatus.PASSED])
        return (passed_tests / len(recent_tests)) * 100

    async def _calculate_performance_score(self) -> float:
        """Calculate performance score based on execution times"""
        if not self.metrics_history:
            return 100.0
        
        recent_tests = [m for m in self.metrics_history 
                       if m.timestamp > datetime.now() - timedelta(hours=1)
                       and m.performance_score is not None]
        
        if not recent_tests:
            return 100.0
        
        avg_score = sum(t.performance_score for t in recent_tests) / len(recent_tests)
        return min(100.0, avg_score)

    async def _calculate_security_score(self) -> float:
        """Calculate security score"""
        # Simulate security score based on recent scans
        return 95.0

    async def _calculate_accessibility_score(self) -> float:
        """Calculate accessibility score"""
        # Simulate accessibility score
        return 92.0

    async def _generate_ai_predictions(self) -> Dict[str, Any]:
        """Generate AI-powered predictions"""
        predictions = {
            "failure_risk": "low",
            "performance_trend": "stable",
            "recommended_actions": [],
            "confidence": 0.85
        }
        
        # Analyze recent patterns
        if len(self.health_history) > 10:
            recent_scores = [h.overall_score for h in self.health_history[-10:]]
            trend = sum(recent_scores[-5:]) - sum(recent_scores[:5])
            
            if trend < -5:
                predictions["performance_trend"] = "declining"
                predictions["recommended_actions"].append("Investigate performance issues")
                predictions["failure_risk"] = "medium"
            elif trend > 5:
                predictions["performance_trend"] = "improving"
        
        return predictions

    async def _monitor_test_execution(self):
        """Monitor test execution in real-time"""
        while self.monitoring_active:
            try:
                # Check for new test results
                await self._collect_test_metrics()
            except Exception as e:
                logger.error(f"Error monitoring test execution: {e}")
            
            await asyncio.sleep(10)  # Check every 10 seconds

    async def _collect_test_metrics(self):
        """Collect test metrics from various sources"""
        # Check for new test result files
        test_results_dir = Path("test-results")
        if test_results_dir.exists():
            for result_file in test_results_dir.glob("**/*.json"):
                await self._process_test_result_file(result_file)

    async def _process_test_result_file(self, file_path: Path):
        """Process a test result file"""
        try:
            with open(file_path) as f:
                data = json.load(f)
            
            # Process different test result formats
            if "suites" in data:  # Playwright format
                await self._process_playwright_results(data)
            elif "tests" in data:  # Jest format
                await self._process_jest_results(data)
            
        except Exception as e:
            logger.error(f"Error processing test result file {file_path}: {e}")

    async def _process_playwright_results(self, data: Dict):
        """Process Playwright test results"""
        for suite in data.get("suites", []):
            for spec in suite.get("specs", []):
                for test in spec.get("tests", []):
                    metric = TestMetric(
                        test_name=test["title"],
                        status=TestStatus(test["outcome"]),
                        execution_time=test.get("duration", 0) / 1000,  # Convert to seconds
                        timestamp=datetime.now(),
                        ai_confidence=0.9  # High confidence for E2E tests
                    )
                    
                    self.metrics_history.append(metric)
                    if self.db_pool:
                        await self._store_test_metric(metric)

    async def _analyze_trends(self):
        """Analyze trends and patterns"""
        while self.monitoring_active:
            try:
                if len(self.health_history) >= 10:
                    await self._detect_anomalies()
                    await self._predict_failures()
                    await self._optimize_tests()
            except Exception as e:
                logger.error(f"Error analyzing trends: {e}")
            
            await asyncio.sleep(60)  # Analyze every minute

    async def _detect_anomalies(self):
        """Detect anomalies in test patterns"""
        recent_health = self.health_history[-10:]
        
        # Check for sudden drops in scores
        for i in range(1, len(recent_health)):
            current = recent_health[i]
            previous = recent_health[i-1]
            
            score_drop = previous.overall_score - current.overall_score
            if score_drop > 10:  # Significant drop
                await self._create_alert(
                    severity=AlertSeverity.HIGH,
                    title="Quality Score Drop Detected",
                    description=f"Overall quality score dropped by {score_drop:.1f}%",
                    source="anomaly_detection",
                    metadata={"previous_score": previous.overall_score, 
                            "current_score": current.overall_score}
                )

    async def _check_alerts(self):
        """Check for alert conditions"""
        while self.monitoring_active:
            try:
                if self.health_history:
                    latest_health = self.health_history[-1]
                    await self._check_health_alerts(latest_health)
            except Exception as e:
                logger.error(f"Error checking alerts: {e}")
            
            await asyncio.sleep(30)

    async def _check_health_alerts(self, health: SystemHealth):
        """Check for health-based alerts"""
        # Critical alerts
        if health.overall_score < 70:
            await self._create_alert(
                severity=AlertSeverity.CRITICAL,
                title="Critical System Health",
                description=f"Overall system health at {health.overall_score:.1f}%",
                source="health_monitor"
            )
        
        # Service failures
        if health.failed_services:
            await self._create_alert(
                severity=AlertSeverity.HIGH,
                title="Service Failures Detected",
                description=f"Services failing: {', '.join(health.failed_services)}",
                source="service_monitor",
                metadata={"failed_services": health.failed_services}
            )
        
        # Test pass rate alerts
        if health.test_pass_rate < 90:
            await self._create_alert(
                severity=AlertSeverity.MEDIUM,
                title="Low Test Pass Rate",
                description=f"Test pass rate at {health.test_pass_rate:.1f}%",
                source="test_monitor"
            )

    async def _create_alert(self, severity: AlertSeverity, title: str, 
                          description: str, source: str, metadata: Dict = None):
        """Create and process an alert"""
        alert = {
            "timestamp": datetime.now().isoformat(),
            "severity": severity.value,
            "title": title,
            "description": description,
            "source": source,
            "metadata": metadata or {}
        }
        
        self.alerts_history.append(alert)
        
        # Store in database
        if self.db_pool:
            await self._store_alert(alert)
        
        # Send notifications
        await self._send_alert_notifications(alert)
        
        logger.warning(f"ALERT [{severity.value.upper()}]: {title} - {description}")

    async def _send_alert_notifications(self, alert: Dict):
        """Send alert notifications"""
        try:
            # Slack notification
            if self.config.get("slack_webhook"):
                await self._send_slack_alert(alert)
            
            # Email notification
            if self.config.get("email_alerts"):
                await self._send_email_alert(alert)
            
            # Dashboard update
            await self._update_dashboard_alert(alert)
            
        except Exception as e:
            logger.error(f"Error sending alert notifications: {e}")

    async def _generate_predictions(self):
        """Generate predictive insights"""
        while self.monitoring_active:
            try:
                if len(self.health_history) >= 20:
                    predictions = await self._ai_predict_issues()
                    await self._store_predictions(predictions)
            except Exception as e:
                logger.error(f"Error generating predictions: {e}")
            
            await asyncio.sleep(300)  # Generate predictions every 5 minutes

    async def _ai_predict_issues(self) -> Dict[str, Any]:
        """Use AI to predict potential issues"""
        recent_history = self.health_history[-20:]
        
        # Simple trend analysis (can be enhanced with ML models)
        score_trend = []
        for i in range(1, len(recent_history)):
            score_change = recent_history[i].overall_score - recent_history[i-1].overall_score
            score_trend.append(score_change)
        
        avg_trend = sum(score_trend) / len(score_trend) if score_trend else 0
        
        predictions = {
            "score_trend": avg_trend,
            "failure_probability": max(0, min(1, (-avg_trend + 5) / 10)),
            "recommended_actions": [],
            "confidence": 0.75
        }
        
        if avg_trend < -2:
            predictions["recommended_actions"].extend([
                "Investigate declining performance",
                "Review recent code changes",
                "Check infrastructure health"
            ])
        
        return predictions

    async def _store_test_metric(self, metric: TestMetric):
        """Store test metric in database"""
        async with self.db_pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO test_metrics 
                (test_name, status, execution_time, timestamp, error_message, 
                 coverage_percentage, performance_score, ai_confidence)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """, metric.test_name, metric.status.value, metric.execution_time,
                metric.timestamp, metric.error_message, metric.coverage_percentage,
                metric.performance_score, metric.ai_confidence)

    async def _store_health_metric(self, health: SystemHealth):
        """Store health metric in database"""
        async with self.db_pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO system_health 
                (timestamp, overall_score, test_pass_rate, performance_score,
                 security_score, accessibility_score, active_services, 
                 failed_services, ai_predictions)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            """, health.timestamp, health.overall_score, health.test_pass_rate,
                health.performance_score, health.security_score, 
                health.accessibility_score, health.active_services,
                health.failed_services, json.dumps(health.ai_predictions))

    async def _store_alert(self, alert: Dict):
        """Store alert in database"""
        async with self.db_pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO alerts 
                (timestamp, severity, title, description, source, metadata)
                VALUES ($1, $2, $3, $4, $5, $6)
            """, datetime.fromisoformat(alert["timestamp"]), alert["severity"],
                alert["title"], alert["description"], alert["source"],
                json.dumps(alert["metadata"]))

    async def get_dashboard_data(self) -> Dict[str, Any]:
        """Get data for monitoring dashboard"""
        latest_health = self.health_history[-1] if self.health_history else None
        recent_alerts = self.alerts_history[-10:]
        
        return {
            "current_health": asdict(latest_health) if latest_health else None,
            "recent_alerts": recent_alerts,
            "metrics_summary": await self._get_metrics_summary(),
            "trends": await self._get_trend_data(),
            "predictions": await self._get_latest_predictions()
        }

    async def _get_metrics_summary(self) -> Dict[str, Any]:
        """Get summary of test metrics"""
        if not self.metrics_history:
            return {}
        
        recent_metrics = [m for m in self.metrics_history 
                         if m.timestamp > datetime.now() - timedelta(hours=24)]
        
        total_tests = len(recent_metrics)
        passed_tests = len([m for m in recent_metrics if m.status == TestStatus.PASSED])
        
        return {
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "pass_rate": (passed_tests / total_tests * 100) if total_tests > 0 else 0,
            "avg_execution_time": sum(m.execution_time for m in recent_metrics) / len(recent_metrics) if recent_metrics else 0
        }

    async def stop_monitoring(self):
        """Stop monitoring"""
        self.monitoring_active = False
        if self.db_pool:
            await self.db_pool.close()
        logger.info("AI Test Monitor stopped")


# Factory function
async def create_ai_test_monitor(config: Dict[str, Any]) -> AITestMonitor:
    """Create and initialize AI test monitor"""
    monitor = AITestMonitor(config)
    await monitor.initialize()
    return monitor


if __name__ == "__main__":
    # Example usage
    async def main():
        config = {
            "database_url": "postgresql://postgres:postgres@localhost:5433/valuerpro",
            "slack_webhook": None,  # Add your Slack webhook URL
            "email_alerts": True
        }
        
        monitor = await create_ai_test_monitor(config)
        await monitor.start_monitoring()
    
    asyncio.run(main())