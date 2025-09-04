#!/bin/bash

# ValuerPro Production Deployment Script
# This script handles production deployment with proper validation and rollback capabilities

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${PROJECT_ROOT}/backups"
DEPLOY_LOG="${PROJECT_ROOT}/deploy.log"
ENV_FILE="${PROJECT_ROOT}/.env.production"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$DEPLOY_LOG"
}

error() {
    echo -e "${RED}ERROR: $1${NC}" | tee -a "$DEPLOY_LOG"
    exit 1
}

warning() {
    echo -e "${YELLOW}WARNING: $1${NC}" | tee -a "$DEPLOY_LOG"
}

success() {
    echo -e "${GREEN}SUCCESS: $1${NC}" | tee -a "$DEPLOY_LOG"
}

info() {
    echo -e "${BLUE}INFO: $1${NC}" | tee -a "$DEPLOY_LOG"
}

# Check prerequisites
check_prerequisites() {
    log "Checking deployment prerequisites..."
    
    # Check if running as root
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root"
    fi
    
    # Check required commands
    local required_commands=("docker" "docker-compose" "git" "curl")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            error "Required command '$cmd' is not installed"
        fi
    done
    
    # Check Docker daemon
    if ! docker info &> /dev/null; then
        error "Docker daemon is not running"
    fi
    
    # Check environment file
    if [[ ! -f "$ENV_FILE" ]]; then
        error "Production environment file not found: $ENV_FILE"
    fi
    
    success "Prerequisites check passed"
}

# Validate environment configuration
validate_environment() {
    log "Validating environment configuration..."
    
    source "$ENV_FILE"
    
    local required_vars=(
        "DB_PASSWORD"
        "REDIS_PASSWORD"
        "SECRET_KEY"
        "AWS_ACCESS_KEY_ID"
        "AWS_SECRET_ACCESS_KEY"
        "AWS_S3_BUCKET"
        "OPENAI_API_KEY"
        "GRAFANA_ADMIN_PASSWORD"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error "Required environment variable '$var' is not set"
        fi
    done
    
    # Validate secret key length
    if [[ ${#SECRET_KEY} -lt 32 ]]; then
        error "SECRET_KEY must be at least 32 characters long"
    fi
    
    success "Environment validation passed"
}

# Create backup
create_backup() {
    log "Creating backup before deployment..."
    
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_name="valuerpro_backup_${timestamp}"
    local backup_path="${BACKUP_DIR}/${backup_name}"
    
    mkdir -p "$backup_path"
    
    # Backup database if running
    if docker-compose -f docker-compose.production.yml ps db | grep -q "Up"; then
        info "Backing up database..."
        docker-compose -f docker-compose.production.yml exec -T db \
            pg_dump -U valuerpro valuerpro_prod > "${backup_path}/database.sql" || true
    fi
    
    # Backup application data
    if [[ -d "${PROJECT_ROOT}/backend/storage" ]]; then
        cp -r "${PROJECT_ROOT}/backend/storage" "${backup_path}/" || true
    fi
    
    # Backup configuration
    cp "$ENV_FILE" "${backup_path}/" || true
    
    # Create backup manifest
    cat > "${backup_path}/manifest.txt" << EOF
Backup created: $(date)
Git commit: $(git rev-parse HEAD)
Git branch: $(git rev-parse --abbrev-ref HEAD)
Environment: production
EOF
    
    echo "$backup_name" > "${BACKUP_DIR}/latest_backup.txt"
    success "Backup created: $backup_name"
}

# Run tests
run_tests() {
    log "Running deployment tests..."
    
    # Backend tests
    info "Running backend tests..."
    cd "$PROJECT_ROOT/backend"
    if ! python -m pytest tests/ --tb=short -q; then
        error "Backend tests failed"
    fi
    
    # Frontend tests
    info "Running frontend tests..."
    cd "$PROJECT_ROOT/frontend"
    if ! npm run test:ci; then
        error "Frontend tests failed"
    fi
    
    cd "$PROJECT_ROOT"
    success "All tests passed"
}

# Build and deploy
build_and_deploy() {
    log "Building and deploying application..."
    
    cd "$PROJECT_ROOT"
    
    # Pull latest changes
    info "Pulling latest changes..."
    git pull origin main
    
    # Build images
    info "Building Docker images..."
    docker-compose -f docker-compose.production.yml build --no-cache
    
    # Stop existing containers gracefully
    info "Stopping existing containers..."
    docker-compose -f docker-compose.production.yml down --timeout 30
    
    # Start new containers
    info "Starting new containers..."
    docker-compose -f docker-compose.production.yml up -d
    
    success "Deployment completed"
}

# Health checks
run_health_checks() {
    log "Running post-deployment health checks..."
    
    local max_attempts=30
    local attempt=0
    
    # Wait for services to start
    info "Waiting for services to start..."
    sleep 30
    
    # Check backend health
    while [[ $attempt -lt $max_attempts ]]; do
        if curl -f -s http://localhost:8000/health > /dev/null; then
            success "Backend health check passed"
            break
        fi
        
        ((attempt++))
        if [[ $attempt -eq $max_attempts ]]; then
            error "Backend health check failed after $max_attempts attempts"
        fi
        
        sleep 10
    done
    
    # Check frontend health
    attempt=0
    while [[ $attempt -lt $max_attempts ]]; do
        if curl -f -s http://localhost:3000 > /dev/null; then
            success "Frontend health check passed"
            break
        fi
        
        ((attempt++))
        if [[ $attempt -eq $max_attempts ]]; then
            error "Frontend health check failed after $max_attempts attempts"
        fi
        
        sleep 10
    done
    
    # Check database migration status
    info "Checking database migration status..."
    docker-compose -f docker-compose.production.yml exec -T backend \
        alembic current > /dev/null || error "Database migration check failed"
    
    success "All health checks passed"
}

# Rollback function
rollback() {
    log "Rolling back deployment..."
    
    if [[ ! -f "${BACKUP_DIR}/latest_backup.txt" ]]; then
        error "No backup found for rollback"
    fi
    
    local backup_name=$(cat "${BACKUP_DIR}/latest_backup.txt")
    local backup_path="${BACKUP_DIR}/${backup_name}"
    
    if [[ ! -d "$backup_path" ]]; then
        error "Backup directory not found: $backup_path"
    fi
    
    # Stop current containers
    docker-compose -f docker-compose.production.yml down --timeout 30
    
    # Restore configuration
    cp "${backup_path}/.env.production" "$ENV_FILE"
    
    # Restore database if backup exists
    if [[ -f "${backup_path}/database.sql" ]]; then
        info "Restoring database..."
        docker-compose -f docker-compose.production.yml up -d db
        sleep 30
        docker-compose -f docker-compose.production.yml exec -T db \
            psql -U valuerpro -d valuerpro_prod < "${backup_path}/database.sql"
    fi
    
    # Restore application data
    if [[ -d "${backup_path}/storage" ]]; then
        rm -rf "${PROJECT_ROOT}/backend/storage"
        cp -r "${backup_path}/storage" "${PROJECT_ROOT}/backend/"
    fi
    
    # Restart containers
    docker-compose -f docker-compose.production.yml up -d
    
    success "Rollback completed"
}

# Cleanup old backups
cleanup_backups() {
    log "Cleaning up old backups..."
    
    if [[ -d "$BACKUP_DIR" ]]; then
        find "$BACKUP_DIR" -type d -name "valuerpro_backup_*" -mtime +30 -exec rm -rf {} \; || true
    fi
    
    success "Backup cleanup completed"
}

# Main deployment function
main() {
    log "Starting production deployment..."
    
    # Trap to handle rollback on failure
    trap 'error "Deployment failed. Use --rollback to restore previous version."' ERR
    
    case "${1:-deploy}" in
        "deploy")
            check_prerequisites
            validate_environment
            create_backup
            run_tests
            build_and_deploy
            run_health_checks
            cleanup_backups
            success "Production deployment completed successfully"
            ;;
        "rollback")
            rollback
            run_health_checks
            success "Rollback completed successfully"
            ;;
        "health")
            run_health_checks
            ;;
        "backup")
            create_backup
            ;;
        *)
            echo "Usage: $0 {deploy|rollback|health|backup}"
            echo ""
            echo "Commands:"
            echo "  deploy   - Full production deployment (default)"
            echo "  rollback - Rollback to previous version"
            echo "  health   - Run health checks only"
            echo "  backup   - Create backup only"
            exit 1
            ;;
    esac
}

# Ensure script is run from project root
cd "$PROJECT_ROOT"

# Run main function with all arguments
main "$@"