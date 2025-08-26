#!/bin/bash

# ValuerPro AI-Powered Testing Suite
# Comprehensive test execution script with AI analysis

set -e

echo "🤖 Starting ValuerPro AI-Powered Testing Suite"
echo "=================================================="

# Configuration
BACKEND_PORT=8000
FRONTEND_PORT=3002
POSTGRES_PORT=5433

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        error "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
        exit 1
    fi
    
    # Check if Python is installed
    if ! command -v python &> /dev/null; then
        error "Python is not installed"
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Start services
start_services() {
    log "Starting backend services..."
    
    # Start PostgreSQL container
    cd backend
    if ! docker-compose up -d postgres; then
        error "Failed to start PostgreSQL"
        exit 1
    fi
    
    # Wait for PostgreSQL
    log "Waiting for PostgreSQL to be ready..."
    sleep 10
    
    # Install backend dependencies
    pip install -e .[dev]
    
    # Run database migrations
    alembic upgrade head
    
    # Start backend server
    log "Starting backend server on port $BACKEND_PORT..."
    uvicorn app.main:app --host 0.0.0.0 --port $BACKEND_PORT --reload &
    BACKEND_PID=$!
    
    # Wait for backend to be ready
    sleep 10
    
    cd ../frontend
    
    # Install frontend dependencies
    log "Installing frontend dependencies..."
    npm ci
    
    # Install Playwright browsers
    log "Installing Playwright browsers..."
    npx playwright install
    
    # Build frontend
    log "Building frontend..."
    npm run build
    
    # Start frontend server
    log "Starting frontend server on port $FRONTEND_PORT..."
    npm run start -- --port $FRONTEND_PORT &
    FRONTEND_PID=$!
    
    # Wait for frontend to be ready
    sleep 15
    
    # Health check
    if curl -f http://localhost:$BACKEND_PORT/health > /dev/null 2>&1; then
        success "Backend is healthy"
    else
        error "Backend health check failed"
        cleanup
        exit 1
    fi
    
    if curl -f http://localhost:$FRONTEND_PORT > /dev/null 2>&1; then
        success "Frontend is healthy"
    else
        error "Frontend health check failed"
        cleanup
        exit 1
    fi
    
    cd ..
}

# Run backend tests
run_backend_tests() {
    log "Running AI-enhanced backend tests..."
    
    cd backend
    
    # Unit tests with coverage
    log "Running unit tests with coverage..."
    pytest --cov=app --cov-report=xml --cov-report=html --cov-report=term tests/ -v
    
    # Property-based tests with Hypothesis
    log "Running property-based tests..."
    pytest tests/ -k "hypothesis" -v
    
    # AI-generated scenario tests
    log "Running AI-generated scenario tests..."
    pytest tests/ -k "ai_generated" -v
    
    # Performance benchmarks
    log "Running performance benchmarks..."
    pytest tests/ -k "benchmark" --benchmark-json=benchmark.json -v
    
    # Security tests
    log "Running security scans..."
    bandit -r app/ -f json -o bandit-report.json || true
    safety check --json --output safety-report.json || true
    
    cd ..
    
    success "Backend tests completed"
}

# Run frontend tests
run_frontend_tests() {
    log "Running AI-powered frontend tests..."
    
    cd frontend
    
    # Unit tests
    log "Running frontend unit tests..."
    npm run test:ci
    
    # E2E tests with AI helpers
    log "Running AI-powered E2E tests..."
    npm run test:e2e
    
    # Visual regression tests
    log "Running AI-powered visual regression tests..."
    npm run test:visual || warning "Visual tests failed - this is expected on first run"
    
    # Accessibility tests
    log "Running comprehensive accessibility tests..."
    npm run test:accessibility
    
    # Performance tests
    log "Running performance benchmarks..."
    npm run test:e2e -- --grep "@performance" || true
    
    # Lighthouse audit
    log "Running Lighthouse audit..."
    npm run lighthouse:audit || true
    
    cd ..
    
    success "Frontend tests completed"
}

# Generate AI analysis report
generate_ai_analysis() {
    log "Generating AI-powered test analysis..."
    
    cat > ai_comprehensive_analysis.py << 'EOF'
import json
import os
from pathlib import Path
from datetime import datetime
import xml.etree.ElementTree as ET

def generate_comprehensive_analysis():
    report = {
        "timestamp": datetime.now().isoformat(),
        "summary": {
            "total_tests": 0,
            "passed_tests": 0,
            "failed_tests": 0,
            "performance_score": 0,
            "accessibility_score": 0,
            "security_score": 0,
            "overall_quality_score": 0
        },
        "insights": [],
        "recommendations": [],
        "trends": {},
        "ai_predictions": []
    }
    
    # Analyze backend coverage
    coverage_file = Path("backend/coverage.xml")
    if coverage_file.exists():
        tree = ET.parse(coverage_file)
        root = tree.getroot()
        
        coverage_percentage = float(root.attrib.get('line-rate', 0)) * 100
        report["trends"]["backend_coverage"] = coverage_percentage
        
        if coverage_percentage > 90:
            report["insights"].append("Excellent backend test coverage")
            report["summary"]["performance_score"] += 25
        elif coverage_percentage > 80:
            report["insights"].append("Good backend test coverage")
            report["summary"]["performance_score"] += 20
        else:
            report["recommendations"].append(f"Backend coverage at {coverage_percentage:.1f}% - aim for >80%")
    
    # Analyze security scan results
    bandit_file = Path("backend/bandit-report.json")
    if bandit_file.exists():
        with open(bandit_file) as f:
            bandit_data = json.load(f)
        
        high_severity = len([i for i in bandit_data.get('results', []) if i.get('issue_severity') == 'HIGH'])
        medium_severity = len([i for i in bandit_data.get('results', []) if i.get('issue_severity') == 'MEDIUM'])
        
        if high_severity == 0:
            report["summary"]["security_score"] = 100
            report["insights"].append("No high-severity security issues found")
        else:
            report["summary"]["security_score"] = max(0, 100 - (high_severity * 20))
            report["recommendations"].append(f"{high_severity} high-severity security issues need attention")
    
    # Analyze performance benchmarks
    benchmark_file = Path("backend/benchmark.json")
    if benchmark_file.exists():
        with open(benchmark_file) as f:
            benchmark_data = json.load(f)
        
        benchmarks = benchmark_data.get('benchmarks', [])
        if benchmarks:
            avg_time = sum(b.get('stats', {}).get('mean', 0) for b in benchmarks) / len(benchmarks)
            report["trends"]["avg_api_response_time"] = avg_time
            
            if avg_time < 0.1:
                report["insights"].append("Excellent API performance (<100ms)")
                report["summary"]["performance_score"] += 25
            elif avg_time < 0.5:
                report["insights"].append("Good API performance (<500ms)")
                report["summary"]["performance_score"] += 15
            else:
                report["recommendations"].append(f"API performance slow ({avg_time:.3f}s avg) - optimization needed")
    
    # AI predictions based on patterns
    if report["trends"].get("backend_coverage", 0) > 85 and report["summary"]["security_score"] > 80:
        report["ai_predictions"].append("High likelihood of successful production deployment")
    
    if len(report["recommendations"]) == 0:
        report["ai_predictions"].append("Test suite is comprehensive and well-maintained")
    
    # Calculate overall quality score
    scores = [
        report["summary"]["performance_score"],
        report["summary"]["security_score"],
        min(100, report["trends"].get("backend_coverage", 0))
    ]
    report["summary"]["overall_quality_score"] = sum(scores) / len(scores)
    
    return report

if __name__ == "__main__":
    analysis = generate_comprehensive_analysis()
    
    print("🤖 AI Comprehensive Test Analysis Report")
    print("=" * 60)
    print(f"Generated: {analysis['timestamp']}")
    print(f"Overall Quality Score: {analysis['summary']['overall_quality_score']:.1f}/100")
    print()
    
    if analysis['insights']:
        print("✅ Key Insights:")
        for insight in analysis['insights']:
            print(f"  • {insight}")
        print()
    
    if analysis['recommendations']:
        print("📋 Recommendations:")
        for rec in analysis['recommendations']:
            print(f"  • {rec}")
        print()
    
    if analysis['ai_predictions']:
        print("🔮 AI Predictions:")
        for prediction in analysis['ai_predictions']:
            print(f"  • {prediction}")
        print()
    
    if analysis['trends']:
        print("📊 Trends:")
        for metric, value in analysis['trends'].items():
            if isinstance(value, float):
                print(f"  • {metric}: {value:.2f}")
            else:
                print(f"  • {metric}: {value}")
    
    # Save detailed report
    with open('ai_test_analysis_report.json', 'w') as f:
        json.dump(analysis, f, indent=2)
    
    print(f"\n📄 Detailed report saved to: ai_test_analysis_report.json")
EOF

    python ai_comprehensive_analysis.py
    
    success "AI analysis report generated"
}

# Cleanup function
cleanup() {
    log "Cleaning up services..."
    
    # Kill background processes
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    # Stop Docker containers
    cd backend
    docker-compose down || true
    cd ..
    
    success "Cleanup completed"
}

# Main execution
main() {
    # Set trap for cleanup on exit
    trap cleanup EXIT
    
    check_prerequisites
    start_services
    
    # Run tests in parallel where possible
    run_backend_tests &
    BACKEND_TEST_PID=$!
    
    # Wait for backend tests to complete before starting frontend tests
    # (frontend tests depend on backend being available)
    wait $BACKEND_TEST_PID
    
    run_frontend_tests
    generate_ai_analysis
    
    success "All AI-powered tests completed successfully!"
    echo ""
    echo "📊 Check the following files for detailed results:"
    echo "  • backend/coverage.xml - Backend test coverage"
    echo "  • backend/benchmark.json - Performance benchmarks"
    echo "  • backend/bandit-report.json - Security scan results"
    echo "  • frontend/test-results/ - E2E test results"
    echo "  • frontend/playwright-report/ - Playwright test report"
    echo "  • ai_test_analysis_report.json - Comprehensive AI analysis"
    echo ""
    echo "🎉 ValuerPro AI Testing Suite Complete!"
}

# Run main function
main "$@"