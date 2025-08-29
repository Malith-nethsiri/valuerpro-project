"""
AI-Powered Test Result Analytics System
Advanced analytics and machine learning for test result analysis
"""
import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from pathlib import Path
import statistics
import logging
from collections import defaultdict, Counter
import pickle

import numpy as np
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

logger = logging.getLogger(__name__)


@dataclass
class TestResult:
    """Structured test result data"""
    test_name: str
    suite_name: str
    status: str  # passed, failed, skipped, error
    duration: float
    timestamp: datetime
    error_message: Optional[str] = None
    stack_trace: Optional[str] = None
    tags: List[str] = None
    environment: str = "development"
    build_id: Optional[str] = None
    branch: Optional[str] = None
    commit_hash: Optional[str] = None


@dataclass
class AnalyticsInsight:
    """AI-generated insight about test results"""
    insight_type: str
    title: str
    description: str
    confidence: float
    severity: str  # low, medium, high, critical
    recommended_actions: List[str]
    supporting_data: Dict[str, Any]
    generated_at: datetime


class TestAnalytics:
    """AI-powered test analytics engine"""
    
    def __init__(self):
        self.test_results: List[TestResult] = []
        self.insights_history: List[AnalyticsInsight] = []
        self.models = {}
        self.scalers = {}
        self.is_trained = False
        
        # Initialize ML models
        self._initialize_models()
    
    def _initialize_models(self):
        """Initialize machine learning models"""
        self.models = {
            'failure_predictor': RandomForestClassifier(
                n_estimators=100, 
                random_state=42,
                max_depth=10
            ),
            'anomaly_detector': IsolationForest(
                contamination=0.1,
                random_state=42
            ),
            'performance_clusterer': KMeans(
                n_clusters=5,
                random_state=42
            )
        }
        
        self.scalers = {
            'failure_features': StandardScaler(),
            'performance_features': StandardScaler()
        }
    
    async def add_test_results(self, results: List[Dict[str, Any]]) -> None:
        """Add new test results for analysis"""
        for result_data in results:
            try:
                test_result = TestResult(
                    test_name=result_data.get('test_name', ''),
                    suite_name=result_data.get('suite_name', ''),
                    status=result_data.get('status', 'unknown'),
                    duration=float(result_data.get('duration', 0)),
                    timestamp=datetime.fromisoformat(result_data.get('timestamp', datetime.now().isoformat())),
                    error_message=result_data.get('error_message'),
                    stack_trace=result_data.get('stack_trace'),
                    tags=result_data.get('tags', []),
                    environment=result_data.get('environment', 'development'),
                    build_id=result_data.get('build_id'),
                    branch=result_data.get('branch'),
                    commit_hash=result_data.get('commit_hash')
                )
                self.test_results.append(test_result)
            except Exception as e:
                logger.error(f"Error adding test result: {e}")
        
        # Retrain models if we have enough data
        if len(self.test_results) > 100 and len(self.test_results) % 50 == 0:
            await self._retrain_models()
    
    async def generate_comprehensive_analytics(self) -> Dict[str, Any]:
        """Generate comprehensive analytics report"""
        if not self.test_results:
            return {"error": "No test results available for analysis"}
        
        analytics = {
            "summary": await self._generate_summary_stats(),
            "trends": await self._analyze_trends(),
            "failure_analysis": await self._analyze_failures(),
            "performance_analysis": await self._analyze_performance(),
            "ai_insights": await self._generate_ai_insights(),
            "predictions": await self._generate_predictions(),
            "recommendations": await self._generate_recommendations(),
            "quality_metrics": await self._calculate_quality_metrics(),
            "generated_at": datetime.now().isoformat()
        }
        
        return analytics
    
    async def _generate_summary_stats(self) -> Dict[str, Any]:
        """Generate summary statistics"""
        recent_results = [r for r in self.test_results 
                         if r.timestamp > datetime.now() - timedelta(days=7)]
        
        if not recent_results:
            return {}
        
        total_tests = len(recent_results)
        passed_tests = len([r for r in recent_results if r.status == 'passed'])
        failed_tests = len([r for r in recent_results if r.status == 'failed'])
        skipped_tests = len([r for r in recent_results if r.status == 'skipped'])
        
        durations = [r.duration for r in recent_results if r.duration > 0]
        
        return {
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "failed_tests": failed_tests,
            "skipped_tests": skipped_tests,
            "pass_rate": (passed_tests / total_tests * 100) if total_tests > 0 else 0,
            "failure_rate": (failed_tests / total_tests * 100) if total_tests > 0 else 0,
            "avg_duration": statistics.mean(durations) if durations else 0,
            "median_duration": statistics.median(durations) if durations else 0,
            "max_duration": max(durations) if durations else 0,
            "min_duration": min(durations) if durations else 0,
            "total_execution_time": sum(durations) if durations else 0,
            "time_period": "Last 7 days"
        }
    
    async def _analyze_trends(self) -> Dict[str, Any]:
        """Analyze trends over time"""
        if len(self.test_results) < 10:
            return {"insufficient_data": True}
        
        # Group results by day
        daily_stats = defaultdict(lambda: {"total": 0, "passed": 0, "failed": 0, "duration": []})
        
        for result in self.test_results[-500:]:  # Last 500 results
            day_key = result.timestamp.strftime("%Y-%m-%d")
            daily_stats[day_key]["total"] += 1
            if result.status == "passed":
                daily_stats[day_key]["passed"] += 1
            elif result.status == "failed":
                daily_stats[day_key]["failed"] += 1
            daily_stats[day_key]["duration"].append(result.duration)
        
        # Calculate trends
        dates = sorted(daily_stats.keys())[-14:]  # Last 14 days
        pass_rates = []
        avg_durations = []
        
        for date in dates:
            stats = daily_stats[date]
            pass_rate = (stats["passed"] / stats["total"] * 100) if stats["total"] > 0 else 100
            avg_duration = statistics.mean(stats["duration"]) if stats["duration"] else 0
            pass_rates.append(pass_rate)
            avg_durations.append(avg_duration)
        
        # Calculate trend direction
        pass_rate_trend = "stable"
        performance_trend = "stable"
        
        if len(pass_rates) >= 5:
            recent_avg = statistics.mean(pass_rates[-3:])
            older_avg = statistics.mean(pass_rates[:3])
            if recent_avg > older_avg + 2:
                pass_rate_trend = "improving"
            elif recent_avg < older_avg - 2:
                pass_rate_trend = "declining"
        
        if len(avg_durations) >= 5:
            recent_avg = statistics.mean(avg_durations[-3:])
            older_avg = statistics.mean(avg_durations[:3])
            if recent_avg < older_avg * 0.9:
                performance_trend = "improving"
            elif recent_avg > older_avg * 1.1:
                performance_trend = "declining"
        
        return {
            "pass_rate_trend": pass_rate_trend,
            "performance_trend": performance_trend,
            "daily_stats": dict(daily_stats),
            "trend_data": {
                "dates": dates,
                "pass_rates": pass_rates,
                "avg_durations": avg_durations
            }
        }
    
    async def _analyze_failures(self) -> Dict[str, Any]:
        """Analyze failure patterns"""
        failed_results = [r for r in self.test_results if r.status == 'failed']
        
        if not failed_results:
            return {"no_failures": True}
        
        # Failure patterns
        failure_by_suite = Counter([r.suite_name for r in failed_results])
        failure_by_test = Counter([r.test_name for r in failed_results])
        failure_by_error = Counter([
            r.error_message.split('\n')[0] if r.error_message else 'Unknown error'
            for r in failed_results
        ])
        
        # Time-based analysis
        recent_failures = [r for r in failed_results 
                          if r.timestamp > datetime.now() - timedelta(days=1)]
        
        # Identify flaky tests (tests that sometimes pass, sometimes fail)
        test_results_map = defaultdict(list)
        for result in self.test_results[-1000:]:  # Last 1000 results
            test_results_map[result.test_name].append(result.status)
        
        flaky_tests = []
        for test_name, statuses in test_results_map.items():
            if len(statuses) >= 5:  # At least 5 runs
                pass_rate = statuses.count('passed') / len(statuses)
                if 0.2 <= pass_rate <= 0.8:  # Between 20% and 80% pass rate
                    flaky_tests.append({
                        "test_name": test_name,
                        "pass_rate": pass_rate * 100,
                        "total_runs": len(statuses)
                    })
        
        return {
            "total_failures": len(failed_results),
            "recent_failures": len(recent_failures),
            "failure_by_suite": dict(failure_by_suite.most_common(10)),
            "failure_by_test": dict(failure_by_test.most_common(10)),
            "failure_by_error": dict(failure_by_error.most_common(10)),
            "flaky_tests": sorted(flaky_tests, key=lambda x: x['total_runs'], reverse=True)[:10],
            "most_problematic_suite": failure_by_suite.most_common(1)[0] if failure_by_suite else None
        }
    
    async def _analyze_performance(self) -> Dict[str, Any]:
        """Analyze performance patterns"""
        if not self.test_results:
            return {}
        
        # Performance by test suite
        suite_performance = defaultdict(list)
        for result in self.test_results:
            if result.duration > 0:
                suite_performance[result.suite_name].append(result.duration)
        
        suite_stats = {}
        for suite, durations in suite_performance.items():
            suite_stats[suite] = {
                "avg_duration": statistics.mean(durations),
                "median_duration": statistics.median(durations),
                "max_duration": max(durations),
                "total_tests": len(durations),
                "total_time": sum(durations)
            }
        
        # Identify slow tests
        slow_tests = []
        for result in self.test_results:
            if result.duration > 0:
                slow_tests.append((result.test_name, result.duration, result.suite_name))
        
        slow_tests.sort(key=lambda x: x[1], reverse=True)
        
        # Performance trends
        recent_results = [r for r in self.test_results 
                         if r.timestamp > datetime.now() - timedelta(days=7) and r.duration > 0]
        
        if recent_results:
            avg_recent_duration = statistics.mean([r.duration for r in recent_results])
            older_results = [r for r in self.test_results 
                           if r.timestamp <= datetime.now() - timedelta(days=7) 
                           and r.timestamp > datetime.now() - timedelta(days=14)
                           and r.duration > 0]
            
            performance_change = 0
            if older_results:
                avg_older_duration = statistics.mean([r.duration for r in older_results])
                performance_change = ((avg_recent_duration - avg_older_duration) / avg_older_duration) * 100
        else:
            performance_change = 0
        
        return {
            "suite_performance": suite_stats,
            "slowest_tests": [
                {"test": test, "duration": duration, "suite": suite}
                for test, duration, suite in slow_tests[:10]
            ],
            "performance_change_percent": performance_change,
            "performance_recommendation": self._get_performance_recommendation(performance_change)
        }
    
    def _get_performance_recommendation(self, change_percent: float) -> str:
        """Get performance recommendation based on change"""
        if change_percent > 20:
            return "Performance significantly degraded. Investigate slow tests and optimize."
        elif change_percent > 10:
            return "Performance moderately degraded. Review recent changes."
        elif change_percent < -10:
            return "Performance improved! Document optimizations for future reference."
        else:
            return "Performance stable. Continue monitoring."
    
    async def _generate_ai_insights(self) -> List[Dict[str, Any]]:
        """Generate AI-powered insights"""
        insights = []
        
        if not self.test_results:
            return insights
        
        # Insight 1: Test stability analysis
        stability_insight = await self._analyze_test_stability()
        if stability_insight:
            insights.append(stability_insight)
        
        # Insight 2: Failure pattern detection
        pattern_insight = await self._detect_failure_patterns()
        if pattern_insight:
            insights.append(pattern_insight)
        
        # Insight 3: Performance anomaly detection
        performance_insight = await self._detect_performance_anomalies()
        if performance_insight:
            insights.append(performance_insight)
        
        # Insight 4: Test coverage gaps
        coverage_insight = await self._analyze_test_coverage_gaps()
        if coverage_insight:
            insights.append(coverage_insight)
        
        return insights
    
    async def _analyze_test_stability(self) -> Optional[Dict[str, Any]]:
        """Analyze test stability using AI"""
        if len(self.test_results) < 50:
            return None
        
        # Calculate stability metrics
        test_stability = defaultdict(list)
        for result in self.test_results[-200:]:  # Last 200 results
            test_stability[result.test_name].append(1 if result.status == 'passed' else 0)
        
        unstable_tests = []
        for test_name, results in test_stability.items():
            if len(results) >= 5:
                stability_score = statistics.mean(results)
                variance = statistics.variance(results) if len(results) > 1 else 0
                if variance > 0.15:  # High variance indicates instability
                    unstable_tests.append({
                        "test_name": test_name,
                        "stability_score": stability_score,
                        "variance": variance,
                        "runs": len(results)
                    })
        
        if unstable_tests:
            return {
                "type": "test_stability",
                "title": "Test Stability Analysis",
                "description": f"Found {len(unstable_tests)} unstable tests with high variance",
                "confidence": 0.85,
                "severity": "medium",
                "details": sorted(unstable_tests, key=lambda x: x['variance'], reverse=True)[:5],
                "recommended_actions": [
                    "Investigate flaky test conditions",
                    "Add retry mechanisms for unstable tests",
                    "Review test data dependencies"
                ]
            }
        
        return None
    
    async def _detect_failure_patterns(self) -> Optional[Dict[str, Any]]:
        """Detect failure patterns using ML"""
        failed_results = [r for r in self.test_results if r.status == 'failed' and r.error_message]
        
        if len(failed_results) < 10:
            return None
        
        # Analyze error message patterns
        error_patterns = defaultdict(list)
        for result in failed_results:
            # Simple pattern matching - could be enhanced with NLP
            error_key = result.error_message.split('\n')[0][:50]  # First 50 chars of error
            error_patterns[error_key].append(result)
        
        significant_patterns = {k: v for k, v in error_patterns.items() if len(v) >= 3}
        
        if significant_patterns:
            most_common = max(significant_patterns.items(), key=lambda x: len(x[1]))
            return {
                "type": "failure_patterns",
                "title": "Recurring Failure Pattern Detected",
                "description": f"Pattern '{most_common[0]}' occurred {len(most_common[1])} times",
                "confidence": 0.9,
                "severity": "high" if len(most_common[1]) > 10 else "medium",
                "details": {
                    "pattern": most_common[0],
                    "occurrences": len(most_common[1]),
                    "affected_tests": list(set([r.test_name for r in most_common[1]]))[:5]
                },
                "recommended_actions": [
                    "Investigate root cause of recurring error",
                    "Update test fixtures or test data",
                    "Consider environmental issues"
                ]
            }
        
        return None
    
    async def _detect_performance_anomalies(self) -> Optional[Dict[str, Any]]:
        """Detect performance anomalies using ML"""
        if not self.is_trained or 'anomaly_detector' not in self.models:
            return None
        
        # Get recent performance data
        recent_results = [r for r in self.test_results[-100:] if r.duration > 0]
        if len(recent_results) < 20:
            return None
        
        try:
            # Prepare features for anomaly detection
            features = np.array([[r.duration, len(r.test_name), 
                                 1 if r.status == 'passed' else 0] 
                                for r in recent_results])
            
            # Detect anomalies
            anomalies = self.models['anomaly_detector'].predict(features)
            anomaly_indices = np.where(anomalies == -1)[0]
            
            if len(anomaly_indices) > 0:
                anomalous_tests = [recent_results[i] for i in anomaly_indices]
                return {
                    "type": "performance_anomalies",
                    "title": "Performance Anomalies Detected",
                    "description": f"Found {len(anomalous_tests)} tests with unusual performance patterns",
                    "confidence": 0.75,
                    "severity": "medium",
                    "details": [
                        {
                            "test_name": t.test_name,
                            "duration": t.duration,
                            "status": t.status,
                            "timestamp": t.timestamp.isoformat()
                        }
                        for t in anomalous_tests[:3]
                    ],
                    "recommended_actions": [
                        "Investigate performance regressions",
                        "Check for resource contention",
                        "Review recent code changes"
                    ]
                }
        except Exception as e:
            logger.error(f"Error in anomaly detection: {e}")
        
        return None
    
    async def _analyze_test_coverage_gaps(self) -> Optional[Dict[str, Any]]:
        """Analyze potential test coverage gaps"""
        if len(self.test_results) < 100:
            return None
        
        # Analyze test distribution
        suite_distribution = Counter([r.suite_name for r in self.test_results])
        test_distribution = Counter([r.test_name for r in self.test_results])
        
        # Find underrepresented areas
        avg_tests_per_suite = statistics.mean(suite_distribution.values())
        underrepresented_suites = [
            suite for suite, count in suite_distribution.items()
            if count < avg_tests_per_suite * 0.5
        ]
        
        if underrepresented_suites:
            return {
                "type": "coverage_gaps",
                "title": "Potential Test Coverage Gaps",
                "description": f"Found {len(underrepresented_suites)} suites with low test activity",
                "confidence": 0.7,
                "severity": "low",
                "details": {
                    "underrepresented_suites": underrepresented_suites[:5],
                    "avg_tests_per_suite": avg_tests_per_suite,
                    "recommendation": "Consider adding more tests to these areas"
                },
                "recommended_actions": [
                    "Review test coverage in underrepresented suites",
                    "Add integration tests for complex workflows",
                    "Consider property-based testing for edge cases"
                ]
            }
        
        return None
    
    async def _generate_predictions(self) -> Dict[str, Any]:
        """Generate ML-based predictions"""
        if not self.is_trained or len(self.test_results) < 100:
            return {"insufficient_data": True}
        
        predictions = {}
        
        try:
            # Predict next build success rate
            recent_builds = defaultdict(list)
            for result in self.test_results[-200:]:
                build_key = result.build_id or result.timestamp.strftime("%Y-%m-%d")
                recent_builds[build_key].append(result.status)
            
            if recent_builds:
                build_success_rates = []
                for build_results in recent_builds.values():
                    success_rate = build_results.count('passed') / len(build_results)
                    build_success_rates.append(success_rate)
                
                if len(build_success_rates) >= 3:
                    # Simple trend-based prediction
                    recent_trend = statistics.mean(build_success_rates[-3:])
                    predictions["next_build_success_probability"] = min(1.0, max(0.0, recent_trend))
                    predictions["confidence"] = 0.7
            
            # Predict potential failure areas
            failure_risk = await self._predict_failure_risk()
            if failure_risk:
                predictions["failure_risk"] = failure_risk
        
        except Exception as e:
            logger.error(f"Error generating predictions: {e}")
            predictions["error"] = str(e)
        
        return predictions
    
    async def _predict_failure_risk(self) -> Dict[str, Any]:
        """Predict failure risk by test suite"""
        if not self.is_trained:
            return {}
        
        suite_failure_rates = defaultdict(list)
        for result in self.test_results[-500:]:
            is_failure = 1 if result.status == 'failed' else 0
            suite_failure_rates[result.suite_name].append(is_failure)
        
        risk_assessment = {}
        for suite, failures in suite_failure_rates.items():
            if len(failures) >= 10:
                failure_rate = statistics.mean(failures)
                recent_failures = statistics.mean(failures[-20:]) if len(failures) >= 20 else failure_rate
                
                risk_level = "low"
                if recent_failures > 0.2:
                    risk_level = "high"
                elif recent_failures > 0.1:
                    risk_level = "medium"
                
                risk_assessment[suite] = {
                    "risk_level": risk_level,
                    "failure_rate": failure_rate,
                    "recent_failure_rate": recent_failures,
                    "total_runs": len(failures)
                }
        
        return risk_assessment
    
    async def _generate_recommendations(self) -> List[Dict[str, Any]]:
        """Generate actionable recommendations"""
        recommendations = []
        
        # Analyze recent data for recommendations
        recent_results = [r for r in self.test_results 
                         if r.timestamp > datetime.now() - timedelta(days=7)]
        
        if not recent_results:
            return recommendations
        
        # Recommendation 1: Performance optimization
        slow_tests = [r for r in recent_results if r.duration > 10]  # Tests > 10 seconds
        if len(slow_tests) > 5:
            recommendations.append({
                "type": "performance",
                "title": "Optimize Slow Tests",
                "description": f"Found {len(slow_tests)} tests taking more than 10 seconds",
                "priority": "medium",
                "impact": "Reduces CI/CD pipeline time",
                "actions": [
                    "Profile slow test execution",
                    "Optimize test data setup",
                    "Consider parallel execution",
                    "Review database operations in tests"
                ]
            })
        
        # Recommendation 2: Flaky test resolution
        flaky_count = len([r for r in recent_results if r.status in ['failed', 'skipped']])
        if flaky_count / len(recent_results) > 0.05:  # More than 5% non-passed
            recommendations.append({
                "type": "reliability",
                "title": "Address Test Reliability Issues",
                "description": f"Non-passing rate is {flaky_count/len(recent_results)*100:.1f}%",
                "priority": "high",
                "impact": "Improves test reliability and developer confidence",
                "actions": [
                    "Implement test retry mechanisms",
                    "Investigate timing-dependent tests",
                    "Improve test isolation",
                    "Add better error handling"
                ]
            })
        
        # Recommendation 3: Test coverage
        unique_suites = len(set(r.suite_name for r in recent_results))
        if unique_suites < 5:
            recommendations.append({
                "type": "coverage",
                "title": "Expand Test Coverage",
                "description": f"Only {unique_suites} test suites active in recent runs",
                "priority": "low",
                "impact": "Improves overall system coverage",
                "actions": [
                    "Add integration tests",
                    "Implement API contract tests",
                    "Add performance regression tests",
                    "Consider property-based testing"
                ]
            })
        
        return recommendations
    
    async def _calculate_quality_metrics(self) -> Dict[str, Any]:
        """Calculate comprehensive quality metrics"""
        if not self.test_results:
            return {}
        
        recent_results = [r for r in self.test_results 
                         if r.timestamp > datetime.now() - timedelta(days=30)]
        
        if not recent_results:
            return {}
        
        # Basic metrics
        total_tests = len(recent_results)
        passed_tests = len([r for r in recent_results if r.status == 'passed'])
        failed_tests = len([r for r in recent_results if r.status == 'failed'])
        
        # Quality scores (0-100)
        pass_rate_score = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        # Performance score based on duration trends
        durations = [r.duration for r in recent_results if r.duration > 0]
        performance_score = 100
        if durations:
            avg_duration = statistics.mean(durations)
            if avg_duration > 5:  # If average test takes more than 5 seconds
                performance_score = max(0, 100 - (avg_duration - 5) * 10)
        
        # Stability score based on flaky tests
        test_results_map = defaultdict(list)
        for result in recent_results:
            test_results_map[result.test_name].append(result.status)
        
        stability_issues = 0
        for test_results in test_results_map.values():
            if len(test_results) >= 3:
                unique_statuses = len(set(test_results))
                if unique_statuses > 1:  # Test has different outcomes
                    stability_issues += 1
        
        stability_score = max(0, 100 - (stability_issues / len(test_results_map) * 100))
        
        # Overall quality score
        overall_score = (pass_rate_score * 0.4 + performance_score * 0.3 + stability_score * 0.3)
        
        return {
            "overall_quality_score": round(overall_score, 1),
            "pass_rate_score": round(pass_rate_score, 1),
            "performance_score": round(performance_score, 1),
            "stability_score": round(stability_score, 1),
            "total_tests_analyzed": total_tests,
            "analysis_period": "Last 30 days",
            "grade": self._get_quality_grade(overall_score)
        }
    
    def _get_quality_grade(self, score: float) -> str:
        """Convert quality score to letter grade"""
        if score >= 95:
            return "A+"
        elif score >= 90:
            return "A"
        elif score >= 85:
            return "B+"
        elif score >= 80:
            return "B"
        elif score >= 75:
            return "C+"
        elif score >= 70:
            return "C"
        else:
            return "D"
    
    async def _retrain_models(self) -> None:
        """Retrain ML models with new data"""
        try:
            if len(self.test_results) < 100:
                return
            
            # Prepare training data for failure prediction
            features = []
            labels = []
            
            for result in self.test_results[-500:]:  # Last 500 results
                feature_vector = [
                    result.duration,
                    len(result.test_name),
                    len(result.suite_name),
                    1 if result.environment == 'production' else 0,
                    len(result.tags) if result.tags else 0
                ]
                features.append(feature_vector)
                labels.append(1 if result.status == 'failed' else 0)
            
            if len(features) >= 50 and any(labels):  # At least 50 samples and some failures
                X = np.array(features)
                y = np.array(labels)
                
                # Scale features
                X_scaled = self.scalers['failure_features'].fit_transform(X)
                
                # Train failure predictor
                X_train, X_test, y_train, y_test = train_test_split(
                    X_scaled, y, test_size=0.2, random_state=42
                )
                
                self.models['failure_predictor'].fit(X_train, y_train)
                
                # Evaluate model
                y_pred = self.models['failure_predictor'].predict(X_test)
                accuracy = accuracy_score(y_test, y_pred)
                
                logger.info(f"Failure predictor retrained with accuracy: {accuracy:.3f}")
                
                # Train anomaly detector
                self.models['anomaly_detector'].fit(X_scaled)
                
                self.is_trained = True
        
        except Exception as e:
            logger.error(f"Error retraining models: {e}")
    
    async def export_analytics_data(self, format: str = "json") -> Dict[str, Any]:
        """Export analytics data in various formats"""
        analytics = await self.generate_comprehensive_analytics()
        
        export_data = {
            "export_metadata": {
                "generated_at": datetime.now().isoformat(),
                "format": format,
                "total_results": len(self.test_results),
                "date_range": {
                    "start": min([r.timestamp for r in self.test_results]).isoformat() if self.test_results else None,
                    "end": max([r.timestamp for r in self.test_results]).isoformat() if self.test_results else None
                }
            },
            "analytics": analytics,
            "raw_insights": [asdict(insight) for insight in self.insights_history[-10:]],
        }
        
        return export_data


# Factory function
def create_test_analytics() -> TestAnalytics:
    """Create test analytics instance"""
    return TestAnalytics()


# Example usage and testing
async def main():
    """Test the analytics system"""
    analytics = create_test_analytics()
    
    # Add sample test results
    sample_results = [
        {
            "test_name": "test_login",
            "suite_name": "auth_tests",
            "status": "passed",
            "duration": 1.2,
            "timestamp": datetime.now().isoformat()
        },
        {
            "test_name": "test_property_validation",
            "suite_name": "valuation_tests",
            "status": "failed",
            "duration": 2.5,
            "timestamp": datetime.now().isoformat(),
            "error_message": "Validation failed: Invalid district"
        }
    ]
    
    await analytics.add_test_results(sample_results)
    
    # Generate analytics
    report = await analytics.generate_comprehensive_analytics()
    print(json.dumps(report, indent=2, default=str))


if __name__ == "__main__":
    asyncio.run(main())