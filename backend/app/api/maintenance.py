# API endpoints for AI-powered test maintenance

from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Dict, Any, List, Optional
import logging
from datetime import datetime
from pydantic import BaseModel

try:
    from ..maintenance.ai_test_maintenance import ai_maintenance, MaintenanceAction
    MAINTENANCE_AVAILABLE = True
except ImportError:
    MAINTENANCE_AVAILABLE = False
    logging.warning("AI maintenance module not available - using mock data")

router = APIRouter(prefix="/maintenance", tags=["maintenance"])
logger = logging.getLogger(__name__)

class MaintenanceScheduleRequest(BaseModel):
    schedule_type: str  # daily, weekly, manual
    auto_fix_enabled: bool = True
    max_fixes_per_cycle: int = 5

@router.get("/status")
async def get_maintenance_status() -> Dict[str, Any]:
    """Get current AI test maintenance status"""
    if not MAINTENANCE_AVAILABLE:
        return {
            "status": "service_unavailable",
            "message": "AI maintenance service not available",
            "mock_data": True,
            "maintenance_cycles_run": 5,
            "active_issues": 12,
            "last_cycle": datetime.now().isoformat()
        }
    
    try:
        dashboard = await ai_maintenance.get_maintenance_dashboard()
        return {
            "status": "active",
            "maintenance_data": dashboard,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting maintenance status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/run-cycle")
async def run_maintenance_cycle(background_tasks: BackgroundTasks) -> Dict[str, Any]:
    """Run a complete AI test maintenance cycle"""
    if not MAINTENANCE_AVAILABLE:
        # Return mock maintenance cycle result
        import random
        return {
            "mock_data": True,
            "cycle_id": f"mock_cycle_{random.randint(1000, 9999)}",
            "issues_detected": random.randint(8, 25),
            "issues_fixed": random.randint(3, 12),
            "tests_analyzed": random.randint(50, 150),
            "execution_time": round(random.uniform(30, 120), 1),
            "success_rate": round(random.uniform(75, 95), 1),
            "timestamp": datetime.now().isoformat()
        }
    
    try:
        # Run maintenance cycle in background
        background_tasks.add_task(ai_maintenance.run_maintenance_cycle)
        
        return {
            "message": "Maintenance cycle started",
            "status": "running",
            "started_at": datetime.now().isoformat(),
            "estimated_duration": "2-5 minutes"
        }
    except Exception as e:
        logger.error(f"Error running maintenance cycle: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard")
async def get_maintenance_dashboard() -> Dict[str, Any]:
    """Get comprehensive maintenance dashboard data"""
    if not MAINTENANCE_AVAILABLE:
        # Return mock dashboard data
        import random
        return {
            "mock_data": True,
            "timestamp": datetime.now().isoformat(),
            "maintenance_cycles_run": random.randint(10, 50),
            "summary_statistics": {
                "avg_issues_detected": round(random.uniform(15, 30), 1),
                "avg_issues_fixed": round(random.uniform(8, 18), 1),
                "total_time_saved_hours": round(random.uniform(20, 100), 1),
                "fix_success_rate": round(random.uniform(70, 95), 1)
            },
            "active_issues_by_severity": {
                "critical": random.randint(0, 3),
                "high": random.randint(2, 8),
                "medium": random.randint(5, 15),
                "low": random.randint(3, 12)
            },
            "issue_type_distribution": {
                "fix_flaky": random.randint(2, 8),
                "update_assertion": random.randint(3, 10),
                "improve_performance": random.randint(1, 5),
                "remove_duplicate": random.randint(2, 6),
                "fix_selector": random.randint(1, 4)
            },
            "recommendations": {
                "immediate_actions": random.randint(1, 4),
                "scheduled_maintenance": random.randint(5, 15),
                "optimization_opportunities": random.randint(3, 8)
            }
        }
    
    try:
        dashboard = await ai_maintenance.get_maintenance_dashboard()
        return dashboard
    except Exception as e:
        logger.error(f"Error getting maintenance dashboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/issues")
async def get_detected_issues(
    severity: Optional[str] = None,
    issue_type: Optional[str] = None,
    limit: Optional[int] = 20
) -> Dict[str, Any]:
    """Get list of detected test issues"""
    if not MAINTENANCE_AVAILABLE:
        # Return mock issues
        import random
        severities = ["critical", "high", "medium", "low"]
        issue_types = ["fix_flaky", "update_assertion", "improve_performance", "remove_duplicate", "fix_selector"]
        
        mock_issues = []
        for i in range(min(limit, 15)):
            mock_issues.append({
                "test_name": f"test_mock_issue_{i+1}",
                "test_file": f"test_mock_file_{(i%3)+1}.py",
                "issue_type": random.choice(issue_types),
                "severity": random.choice(severities),
                "description": f"Mock test issue #{i+1} description",
                "confidence": round(random.uniform(0.6, 0.95), 2),
                "suggested_fix": f"Mock suggested fix for issue #{i+1}",
                "line_number": random.randint(10, 200)
            })
        
        # Filter by parameters if provided
        if severity:
            mock_issues = [issue for issue in mock_issues if issue["severity"] == severity]
        if issue_type:
            mock_issues = [issue for issue in mock_issues if issue["issue_type"] == issue_type]
        
        return {
            "mock_data": True,
            "issues": mock_issues,
            "total_count": len(mock_issues),
            "filtered": bool(severity or issue_type)
        }
    
    try:
        issues = ai_maintenance.test_issues
        
        # Filter issues
        filtered_issues = issues
        if severity:
            filtered_issues = [issue for issue in filtered_issues if issue.severity == severity]
        if issue_type:
            filtered_issues = [issue for issue in filtered_issues if issue.issue_type.value == issue_type]
        
        # Limit results
        limited_issues = filtered_issues[:limit] if limit else filtered_issues
        
        # Convert to dict format
        issue_data = []
        for issue in limited_issues:
            issue_data.append({
                "test_name": issue.test_name,
                "test_file": issue.test_file,
                "issue_type": issue.issue_type.value,
                "severity": issue.severity,
                "description": issue.description,
                "confidence": issue.confidence,
                "suggested_fix": issue.suggested_fix,
                "line_number": issue.line_number,
                "code_snippet": issue.code_snippet
            })
        
        return {
            "issues": issue_data,
            "total_count": len(issue_data),
            "filtered": bool(severity or issue_type),
            "available_severities": ["critical", "high", "medium", "low"],
            "available_types": [action.value for action in MaintenanceAction],
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting issues: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/fix-issue/{issue_id}")
async def fix_issue(issue_id: int, background_tasks: BackgroundTasks) -> Dict[str, Any]:
    """Attempt to automatically fix a specific issue"""
    if not MAINTENANCE_AVAILABLE:
        # Return mock fix result
        import random
        return {
            "mock_data": True,
            "issue_id": issue_id,
            "status": random.choice(["completed", "failed", "partial"]),
            "fix_applied": random.choice([True, False]),
            "improvements": ["Mock improvement 1", "Mock improvement 2"],
            "estimated_impact": f"{random.randint(20, 80)}% improvement",
            "timestamp": datetime.now().isoformat()
        }
    
    try:
        # Find issue by ID (simplified lookup)
        target_issue = None
        for issue in ai_maintenance.test_issues:
            if id(issue) == issue_id:
                target_issue = issue
                break
        
        if not target_issue:
            raise HTTPException(status_code=404, detail="Issue not found")
        
        # Run fix in background
        background_tasks.add_task(ai_maintenance.fix_test_issue, target_issue)
        
        return {
            "message": f"Fix started for issue: {target_issue.description}",
            "issue_id": issue_id,
            "status": "processing",
            "test_name": target_issue.test_name,
            "issue_type": target_issue.issue_type.value,
            "started_at": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error fixing issue: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/schedule")
async def schedule_maintenance(schedule_request: MaintenanceScheduleRequest) -> Dict[str, Any]:
    """Schedule automated maintenance cycles"""
    if not MAINTENANCE_AVAILABLE:
        return {
            "mock_data": True,
            "message": f"Mock maintenance scheduled: {schedule_request.schedule_type}",
            "schedule_type": schedule_request.schedule_type,
            "auto_fix_enabled": schedule_request.auto_fix_enabled,
            "max_fixes_per_cycle": schedule_request.max_fixes_per_cycle,
            "next_run": datetime.now().isoformat(),
            "status": "scheduled"
        }
    
    try:
        result = await ai_maintenance.schedule_maintenance(schedule_request.schedule_type)
        result.update({
            "auto_fix_enabled": schedule_request.auto_fix_enabled,
            "max_fixes_per_cycle": schedule_request.max_fixes_per_cycle
        })
        return result
    except Exception as e:
        logger.error(f"Error scheduling maintenance: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history")
async def get_maintenance_history(limit: Optional[int] = 10) -> Dict[str, Any]:
    """Get maintenance cycle history"""
    if not MAINTENANCE_AVAILABLE:
        # Return mock history
        import random
        from datetime import timedelta
        
        mock_history = []
        for i in range(min(limit, 8)):
            mock_history.append({
                "timestamp": (datetime.now() - timedelta(days=i)).isoformat(),
                "issues_detected": random.randint(10, 30),
                "issues_fixed": random.randint(5, 15),
                "tests_analyzed": random.randint(50, 150),
                "cycle_duration": round(random.uniform(60, 300), 1),
                "success_rate": round(random.uniform(70, 95), 1)
            })
        
        return {
            "mock_data": True,
            "maintenance_history": mock_history,
            "total_cycles": len(mock_history)
        }
    
    try:
        history = ai_maintenance.maintenance_history[-limit:] if ai_maintenance.maintenance_history else []
        
        history_data = []
        for report in history:
            history_data.append({
                "timestamp": report.timestamp.isoformat(),
                "issues_detected": report.issues_detected,
                "issues_fixed": report.issues_fixed,
                "tests_analyzed": report.tests_analyzed,
                "actions_taken": len(report.actions_taken),
                "suggestions": len(report.suggestions),
                "performance_impact": report.performance_impact
            })
        
        return {
            "maintenance_history": history_data,
            "total_cycles": len(history_data),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting maintenance history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/suggestions")
async def get_maintenance_suggestions() -> Dict[str, Any]:
    """Get AI-generated maintenance suggestions"""
    if not MAINTENANCE_AVAILABLE:
        # Return mock suggestions
        return {
            "mock_data": True,
            "suggestions": [
                "Consider implementing parameterized tests to reduce code duplication",
                "Add performance benchmarks for slow-running tests",
                "Review flaky test patterns and implement better wait strategies",
                "Update test data fixtures for better test isolation",
                "Consider using Page Object Model for UI tests"
            ],
            "priority_actions": [
                "Fix 3 critical flaky tests in property validation module",
                "Update outdated assertion patterns in 8 test files",
                "Remove 5 duplicate tests across different modules"
            ],
            "estimated_impact": {
                "time_savings": "4-6 hours per week",
                "reliability_improvement": "25-30%",
                "maintenance_reduction": "40%"
            }
        }
    
    try:
        dashboard = await ai_maintenance.get_maintenance_dashboard()
        latest_report = dashboard.get('latest_cycle')
        
        suggestions = []
        priority_actions = []
        
        if latest_report:
            suggestions = latest_report.get('suggestions', [])
            
            # Generate priority actions based on current issues
            for issue in ai_maintenance.test_issues:
                if issue.severity in ['critical', 'high'] and issue.confidence > 0.8:
                    priority_actions.append(f"Fix {issue.severity} issue: {issue.description}")
        
        return {
            "suggestions": suggestions,
            "priority_actions": priority_actions,
            "estimated_impact": {
                "time_savings": f"{len(suggestions) * 0.5}-{len(suggestions) * 1.0} hours per week",
                "reliability_improvement": f"{len(priority_actions) * 10}-{len(priority_actions) * 15}%",
                "maintenance_reduction": "30-50%"
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting maintenance suggestions: {e}")
        raise HTTPException(status_code=500, detail=str(e))