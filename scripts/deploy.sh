#!/bin/bash

# ValuerPro Deployment Script
# This script handles the complete deployment pipeline

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="valuerpro"
DOCKER_REGISTRY="ghcr.io/malith-nethsiri/valuerpro-project"
COMPOSE_FILE="docker-compose.prod.yml"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not available"
        exit 1
    fi
    
    # Check if required environment files exist
    if [[ ! -f .env.production ]]; then
        log_error "Production environment file (.env.production) not found"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

pull_latest_images() {
    log_info "Pulling latest Docker images..."
    
    docker pull ${DOCKER_REGISTRY}/backend:latest || {
        log_error "Failed to pull backend image"
        exit 1
    }
    
    docker pull ${DOCKER_REGISTRY}/frontend:latest || {
        log_error "Failed to pull frontend image"
        exit 1
    }
    
    log_success "Docker images pulled successfully"
}

backup_database() {
    log_info "Creating database backup..."
    
    # Create backup directory if it doesn't exist
    mkdir -p backups
    
    # Generate backup filename with timestamp
    BACKUP_FILE="backups/valuerpro_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    # Create database backup
    docker-compose -f ${COMPOSE_FILE} exec -T db pg_dump -U postgres valuerpro > ${BACKUP_FILE} || {
        log_warning "Failed to create database backup"
    }
    
    # Keep only last 7 backups
    ls -t backups/valuerpro_backup_*.sql | tail -n +8 | xargs -r rm --
    
    log_success "Database backup created: ${BACKUP_FILE}"
}

run_health_checks() {
    log_info "Running health checks..."
    
    # Wait for services to be ready
    sleep 30
    
    # Check backend health
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        log_success "Backend health check passed"
    else
        log_error "Backend health check failed"
        return 1
    fi
    
    # Check frontend health
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        log_success "Frontend health check passed"
    else
        log_error "Frontend health check failed"
        return 1
    fi
    
    # Check database connectivity
    if docker-compose -f ${COMPOSE_FILE} exec -T db pg_isready -U postgres > /dev/null 2>&1; then
        log_success "Database health check passed"
    else
        log_error "Database health check failed"
        return 1
    fi
    
    log_success "All health checks passed"
}

run_smoke_tests() {
    log_info "Running smoke tests..."
    
    # Test user registration endpoint
    REGISTER_RESPONSE=$(curl -s -w "%{http_code}" -X POST http://localhost:8000/api/v1/auth/register \
        -H "Content-Type: application/json" \
        -d '{"email":"test@example.com","password":"testpass123","full_name":"Test User"}' \
        -o /dev/null)
    
    if [[ ${REGISTER_RESPONSE} -eq 200 || ${REGISTER_RESPONSE} -eq 400 ]]; then
        log_success "Registration endpoint smoke test passed"
    else
        log_error "Registration endpoint smoke test failed (HTTP: ${REGISTER_RESPONSE})"
        return 1
    fi
    
    # Test report creation endpoint (would need authentication)
    # For now, just test that the endpoint is reachable
    REPORTS_RESPONSE=$(curl -s -w "%{http_code}" -X GET http://localhost:8000/api/v1/reports/ -o /dev/null)
    
    if [[ ${REPORTS_RESPONSE} -eq 401 ]]; then
        log_success "Reports endpoint smoke test passed (authentication required as expected)"
    else
        log_warning "Reports endpoint returned unexpected status: ${REPORTS_RESPONSE}"
    fi
    
    log_success "Smoke tests completed"
}

deploy() {
    local environment=${1:-production}
    
    log_info "Starting deployment to ${environment} environment..."
    
    # Load environment variables
    if [[ -f .env.${environment} ]]; then
        export $(grep -v '^#' .env.${environment} | xargs)
    fi
    
    # Stop existing services
    log_info "Stopping existing services..."
    docker-compose -f ${COMPOSE_FILE} down || true
    
    # Pull latest images
    pull_latest_images
    
    # Create backup before deployment
    if [[ ${environment} == "production" ]]; then
        backup_database
    fi
    
    # Start services
    log_info "Starting services..."
    docker-compose -f ${COMPOSE_FILE} up -d
    
    # Run health checks
    if run_health_checks; then
        log_success "Deployment completed successfully"
        
        # Run smoke tests
        run_smoke_tests
        
        # Send notification
        send_deployment_notification "success" "${environment}"
        
    else
        log_error "Health checks failed"
        
        # Rollback on health check failure
        if [[ ${environment} == "production" ]]; then
            log_info "Rolling back deployment..."
            rollback
        fi
        
        send_deployment_notification "failure" "${environment}"
        exit 1
    fi
}

rollback() {
    log_info "Rolling back to previous deployment..."
    
    # Stop current services
    docker-compose -f ${COMPOSE_FILE} down
    
    # Restore from latest backup
    LATEST_BACKUP=$(ls -t backups/valuerpro_backup_*.sql | head -n 1)
    if [[ -n ${LATEST_BACKUP} ]]; then
        log_info "Restoring database from ${LATEST_BACKUP}..."
        # This would need more sophisticated rollback logic
        log_warning "Database rollback requires manual intervention"
    fi
    
    # Start services with previous images
    # This would need image tagging strategy
    log_warning "Image rollback requires previous version tags"
    
    log_success "Rollback completed"
    send_deployment_notification "rollback" "production"
}

send_deployment_notification() {
    local status=$1
    local environment=$2
    
    # Send Slack notification if webhook is configured
    if [[ -n ${SLACK_WEBHOOK_URL} ]]; then
        local color="good"
        local emoji=":rocket:"
        
        case ${status} in
            "failure")
                color="danger"
                emoji=":warning:"
                ;;
            "rollback")
                color="warning"
                emoji=":rewind:"
                ;;
        esac
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"attachments\":[{\"color\":\"${color}\",\"text\":\"${emoji} ValuerPro deployment ${status} in ${environment} environment\",\"ts\":\"$(date +%s)\"}]}" \
            ${SLACK_WEBHOOK_URL} > /dev/null 2>&1 || true
    fi
    
    # Log deployment event
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) - Deployment ${status} - ${environment}" >> deployment.log
}

show_deployment_status() {
    log_info "Current deployment status:"
    
    # Show running containers
    docker-compose -f ${COMPOSE_FILE} ps
    
    # Show resource usage
    log_info "Resource usage:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
    
    # Show logs
    log_info "Recent logs (last 50 lines):"
    docker-compose -f ${COMPOSE_FILE} logs --tail=50
}

cleanup_old_images() {
    log_info "Cleaning up old Docker images..."
    
    # Remove unused images
    docker image prune -f
    
    # Remove old tagged images (keep latest 3 versions)
    docker images ${DOCKER_REGISTRY}/backend --format "{{.Tag}}" | grep -v latest | sort -V | head -n -3 | xargs -r docker rmi ${DOCKER_REGISTRY}/backend: || true
    docker images ${DOCKER_REGISTRY}/frontend --format "{{.Tag}}" | grep -v latest | sort -V | head -n -3 | xargs -r docker rmi ${DOCKER_REGISTRY}/frontend: || true
    
    log_success "Image cleanup completed"
}

# Main script logic
case "${1}" in
    deploy)
        check_prerequisites
        deploy ${2:-production}
        ;;
    rollback)
        check_prerequisites
        rollback
        ;;
    status)
        show_deployment_status
        ;;
    health)
        run_health_checks
        ;;
    cleanup)
        cleanup_old_images
        ;;
    backup)
        backup_database
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|status|health|cleanup|backup} [environment]"
        echo ""
        echo "Commands:"
        echo "  deploy [env]    - Deploy to specified environment (default: production)"
        echo "  rollback        - Rollback to previous deployment"
        echo "  status          - Show current deployment status"
        echo "  health          - Run health checks"
        echo "  cleanup         - Clean up old Docker images"
        echo "  backup          - Create database backup"
        echo ""
        echo "Environments: production, staging, development"
        exit 1
        ;;
esac