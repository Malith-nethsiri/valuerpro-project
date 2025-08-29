# API endpoints for test optimization

from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Dict, Any, List, Optional
import logging
from datetime import datetime

try:
    from ..optimization.test_optimizer import optimization_service, OptimizationService
    OPTIMIZER_AVAILABLE = True
except ImportError:
    OPTIMIZER_AVAILABLE = False
    logging.warning("Optimization module not available - using mock data")

router = APIRouter(prefix="/optimization", tags=["optimization"])
logger = logging.getLogger(__name__)

@router.get("/status")
async def get_optimization_status() -> Dict[str, Any]:
    """Get current optimization service status"""
    if not OPTIMIZER_AVAILABLE:
        return {
            "status": "service_unavailable",
            "message": "Optimization service not available",
            "mock_data": True
        }
    
    try:
        status = await optimization_service.get_status()
        return {
            "status": "active" if status["is_running"] else "inactive",
            "cycles_completed": status["cycles_completed"],
            "last_cycle": status["last_cycle"],
            "recommendations_count": status["recommendations_count"],
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting optimization status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/start")
async def start_optimization(
    background_tasks: BackgroundTasks,
    interval_hours: Optional[int] = 24
) -> Dict[str, Any]:
    """Start continuous test optimization"""
    if not OPTIMIZER_AVAILABLE:
        return {
            "message": "Optimization service not available",
            "mock_data": True,
            "status": "simulated_start"
        }
    
    try:
        background_tasks.add_task(
            optimization_service.start_continuous_optimization,
            interval_hours
        )
        
        return {
            "message": f"Continuous optimization started (every {interval_hours} hours)",
            "interval_hours": interval_hours,
            "started_at": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error starting optimization: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stop")
async def stop_optimization() -> Dict[str, Any]:
    """Stop continuous test optimization"""
    if not OPTIMIZER_AVAILABLE:
        return {
            "message": "Optimization service not available", 
            "mock_data": True,
            "status": "simulated_stop"
        }
    
    try:
        await optimization_service.stop_continuous_optimization()
        return {
            "message": "Continuous optimization stopped",
            "stopped_at": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error stopping optimization: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/run-cycle")
async def run_optimization_cycle() -> Dict[str, Any]:
    """Run a single optimization cycle"""
    if not OPTIMIZER_AVAILABLE:
        # Return mock optimization cycle result
        import random
        return {
            "mock_data": True,
            "cycle_number": random.randint(1, 10),
            "duration": round(random.uniform(30, 120), 2),
            "performance_improvement": round(random.uniform(5, 25), 1),
            "recommendations_generated": random.randint(3, 8),
            "high_priority_actions": random.randint(1, 3),
            "timestamp": datetime.now().isoformat()
        }
    
    try:
        result = await optimization_service.optimizer.run_optimization_cycle()
        return {
            "cycle_number": result["cycle_number"],
            "duration": result["duration"], 
            "performance_score": result["metrics"]["performance_score"],
            "efficiency_rating": result["metrics"]["efficiency_rating"],
            "recommendations_generated": len(result["recommendations"]),
            "implementations_applied": len(result["implementations"]),
            "next_cycle_scheduled": result["next_cycle_scheduled"]
        }
    except Exception as e:
        logger.error(f"Error running optimization cycle: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/report")
async def get_optimization_report() -> Dict[str, Any]:
    """Get comprehensive optimization report"""
    if not OPTIMIZER_AVAILABLE:
        # Return mock optimization report
        import random
        return {
            "mock_data": True,
            "timestamp": datetime.now().isoformat(),
            "cycles_completed": random.randint(5, 50),
            "current_performance_score": round(random.uniform(75, 95), 1),
            "current_efficiency_rating": round(random.uniform(80, 98), 1),
            "monthly_cost_savings": round(random.uniform(500, 2000), 2),
            "total_improvements": random.randint(15, 45),
            "optimization_trends": {
                "performance_trend": round(random.uniform(-2, 8), 1),
                "efficiency_trend": round(random.uniform(-1, 5), 1),
                "cost_trend": round(random.uniform(-50, -200), 1)
            }
        }
    
    try:
        report = await optimization_service.optimizer.get_optimization_report()
        return report
    except Exception as e:
        logger.error(f"Error getting optimization report: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/recommendations")
async def get_current_recommendations() -> Dict[str, Any]:
    """Get current optimization recommendations"""
    if not OPTIMIZER_AVAILABLE:
        # Return mock recommendations
        import random
        categories = ["Performance", "Coverage", "Reliability", "Maintenance", "Efficiency"]
        priorities = ["high", "medium", "low"]
        
        mock_recommendations = []
        for i in range(random.randint(3, 7)):
            mock_recommendations.append({
                "category": random.choice(categories),
                "priority": random.choice(priorities),
                "description": f"Mock optimization recommendation #{i+1}",
                "expected_improvement": round(random.uniform(10, 50), 1),
                "implementation_effort": random.choice(["low", "medium", "high"]),
                "confidence_score": round(random.uniform(0.6, 0.95), 2),
                "affected_tests": [f"test_group_{j}" for j in range(1, random.randint(2, 5))]
            })
        
        return {
            "mock_data": True,
            "recommendations": mock_recommendations,
            "total_count": len(mock_recommendations),
            "high_priority_count": sum(1 for r in mock_recommendations if r["priority"] == "high")
        }
    
    try:
        if not optimization_service.optimizer.recommendations:
            # Generate some recommendations if none exist
            analysis = await optimization_service.optimizer.analyze_test_performance()
            recommendations = await optimization_service.optimizer.generate_optimization_recommendations(analysis)
        else:
            recommendations = optimization_service.optimizer.recommendations
        
        return {
            "recommendations": [
                {
                    "category": rec.category,
                    "priority": rec.priority,
                    "description": rec.description,
                    "expected_improvement": rec.expected_improvement,
                    "implementation_effort": rec.implementation_effort,
                    "confidence_score": rec.confidence_score,
                    "affected_tests": rec.affected_tests
                }
                for rec in recommendations
            ],
            "total_count": len(recommendations),
            "high_priority_count": sum(1 for rec in recommendations if rec.priority == "high"),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/performance-analysis")
async def get_performance_analysis() -> Dict[str, Any]:
    """Get detailed test performance analysis"""
    if not OPTIMIZER_AVAILABLE:
        # Return mock performance analysis
        import random
        return {
            "mock_data": True,
            "timestamp": datetime.now().isoformat(),
            "test_data": {
                "total_tests": random.randint(150, 300),
                "execution_time": round(random.uniform(45, 180), 1),
                "coverage": round(random.uniform(75, 95), 1),
                "failure_rate": round(random.uniform(0.01, 0.08), 3),
                "flaky_tests": random.randint(2, 15),
                "slow_tests": random.randint(5, 25),
                "redundant_tests": random.randint(3, 20)
            },
            "performance_score": round(random.uniform(70, 95), 1),
            "efficiency_rating": round(random.uniform(75, 98), 1),
            "maintenance_cost": round(random.uniform(10, 50), 1),
            "optimization_opportunities": [
                "Reduce test execution time through parallelization",
                "Fix flaky tests affecting reliability", 
                "Remove redundant test cases"
            ]
        }
    
    try:
        analysis = await optimization_service.optimizer.analyze_test_performance()
        return analysis
    except Exception as e:
        logger.error(f"Error getting performance analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/metrics/history")
async def get_metrics_history(limit: Optional[int] = 10) -> Dict[str, Any]:
    """Get historical optimization metrics"""
    if not OPTIMIZER_AVAILABLE:
        # Return mock historical data
        import random
        from datetime import timedelta
        
        mock_history = []
        base_date = datetime.now()
        for i in range(min(limit, 10)):
            mock_history.append({
                "timestamp": (base_date - timedelta(days=i)).isoformat(),
                "performance_score": round(random.uniform(70, 95), 1),
                "efficiency_rating": round(random.uniform(75, 98), 1), 
                "execution_time": round(random.uniform(45, 180), 1),
                "coverage_percentage": round(random.uniform(75, 95), 1),
                "maintenance_cost": round(random.uniform(10, 50), 1),
                "optimization_iteration": i + 1
            })
        
        return {
            "mock_data": True,
            "historical_metrics": mock_history,
            "count": len(mock_history)
        }
    
    try:
        history = optimization_service.optimizer.optimization_history[-limit:] if optimization_service.optimizer.optimization_history else []
        
        return {
            "historical_metrics": [
                {
                    "timestamp": metric.timestamp.isoformat(),
                    "performance_score": metric.performance_score,
                    "efficiency_rating": metric.efficiency_rating,
                    "execution_time": metric.execution_time,
                    "coverage_percentage": metric.coverage_percentage,
                    "maintenance_cost": metric.maintenance_cost,
                    "optimization_iteration": metric.optimization_iteration
                }
                for metric in history
            ],
            "count": len(history)
        }
    except Exception as e:
        logger.error(f"Error getting metrics history: {e}")
        raise HTTPException(status_code=500, detail=str(e))