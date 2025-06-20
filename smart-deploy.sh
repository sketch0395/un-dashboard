#!/bin/bash

# Smart Docker Deployment Script for UN Dashboard
# This script checks for existing containers and only creates them if needed

set -e  # Exit on any error

echo "🚀 UN Dashboard Smart Docker Deployment"
echo "======================================="

# Configuration
COMPOSE_FILE="docker-compose.production.yml"
PROJECT_NAME="un-dashboard"
BACKUP_DIR="./backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check if a container exists and is running
check_container() {
    local container_name=$1
    if docker ps -a --format "table {{.Names}}" | grep -q "^${container_name}$"; then
        if docker ps --format "table {{.Names}}" | grep -q "^${container_name}$"; then
            echo "running"
        else
            echo "stopped"
        fi
    else
        echo "missing"
    fi
}

# Function to check if a volume exists
check_volume() {
    local volume_name=$1
    if docker volume ls --format "table {{.Name}}" | grep -q "^${volume_name}$"; then
        echo "exists"
    else
        echo "missing"
    fi
}

# Function to backup MongoDB data if container exists
backup_mongodb() {
    local mongo_status=$(check_container "un-dashboard-mongodb")
    
    if [ "$mongo_status" = "running" ]; then
        log_info "Creating MongoDB backup before deployment..."
        mkdir -p "$BACKUP_DIR"
        
        local timestamp=$(date +"%Y%m%d_%H%M%S")
        local backup_file="mongodb_backup_${timestamp}.archive"
        
        if docker exec un-dashboard-mongodb mongodump --username admin --password un-dashboard-2024 --authenticationDatabase admin --db undashboard --archive=/tmp/${backup_file} --gzip; then
            docker cp un-dashboard-mongodb:/tmp/${backup_file} "${BACKUP_DIR}/${backup_file}"
            docker exec un-dashboard-mongodb rm /tmp/${backup_file}
            log_success "MongoDB backup created: ${BACKUP_DIR}/${backup_file}"
            return 0
        else
            log_warning "MongoDB backup failed, but continuing with deployment"
            return 1
        fi
    else
        log_info "MongoDB container not running, skipping backup"
        return 0
    fi
}

# Function to check container health
check_container_health() {
    local container_name=$1
    local max_attempts=30
    local attempt=1
    
    log_info "Checking health of $container_name..."
    
    while [ $attempt -le $max_attempts ]; do
        local health=$(docker inspect --format='{{.State.Health.Status}}' $container_name 2>/dev/null || echo "no-health-check")
        
        if [ "$health" = "healthy" ]; then
            log_success "$container_name is healthy"
            return 0
        elif [ "$health" = "no-health-check" ]; then
            # For containers without health checks, just check if they're running
            if docker ps --format "table {{.Names}}" | grep -q "^${container_name}$"; then
                log_success "$container_name is running"
                return 0
            fi
        fi
        
        log_info "Waiting for $container_name to be healthy... (attempt $attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    log_error "$container_name failed health check"
    return 1
}

# Function to create environment file if it doesn't exist
create_environment_file() {
    local env_file=".env.production"
    
    if [ ! -f "$env_file" ]; then
        log_info "Creating production environment file..."
        
        # Generate random secrets
        local jwt_secret=$(openssl rand -hex 32)
        local nextauth_secret=$(openssl rand -hex 32)
        
        cat > "$env_file" << EOF
# Production Environment Configuration
NODE_ENV=production

# Database Configuration
MONGODB_URI=mongodb://admin:un-dashboard-2024@mongodb:27017/undashboard?authSource=admin
REDIS_URL=redis://redis:6379

# Security Keys (Generated)
JWT_SECRET=${jwt_secret}
NEXTAUTH_SECRET=${nextauth_secret}
RANDOM_SECRET=$(openssl rand -hex 16)

# Application Configuration
NEXTAUTH_URL=https://yourdomain.com
DEFAULT_IP_RANGE=10.5.1.1-255
DEFAULT_PORTS=21,22,23,25,53,80,110,111,135,139,143,443,993,995,1723,3389,5432,5900,6000,8080

# Docker Configuration
USE_DOCKER_NETWORK_TOOLS=true
DOCKER_HOST=unix:///var/run/docker.sock

# SSH Configuration
DEFAULT_SSH_USER=admin
DEFAULT_SSH_PASSWORD=admin

# Collaboration Configuration
COLLABORATION_PORT=4001

# Email Configuration (Update these)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your-smtp-password
SMTP_FROM=UN Dashboard <noreply@yourdomain.com>
EOF
        
        log_success "Environment file created: $env_file"
        log_warning "Please update $env_file with your domain and SMTP settings"
    else
        log_info "Environment file already exists: $env_file"
    fi
}

# Main deployment function
main() {
    echo
    log_info "Starting smart deployment process..."
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    
    # Check if docker-compose file exists
    if [ ! -f "$COMPOSE_FILE" ]; then
        log_error "Docker Compose file not found: $COMPOSE_FILE"
        exit 1
    fi
    
    # Create environment file
    create_environment_file
    
    # Check existing containers
    echo
    log_info "Checking existing containers..."
    
    declare -A containers=(
        ["un-dashboard-traefik"]="Reverse Proxy"
        ["un-dashboard-mongodb"]="MongoDB Database"
        ["un-dashboard-redis"]="Redis Cache"
        ["un-dashboard-app"]="UN Dashboard App"
        ["un-dashboard-network"]="Network Server"
        ["un-dashboard-mongo-express"]="MongoDB Express"
    )
    
    declare -A container_status
    local needs_deployment=false
    
    for container in "${!containers[@]}"; do
        local status=$(check_container "$container")
        container_status["$container"]=$status
        
        case $status in
            "running")
                log_success "${containers[$container]} ($container): Running"
                ;;
            "stopped")
                log_warning "${containers[$container]} ($container): Stopped"
                needs_deployment=true
                ;;
            "missing")
                log_info "${containers[$container]} ($container): Not deployed"
                needs_deployment=true
                ;;
        esac
    done
    
    # Check volumes
    echo
    log_info "Checking data volumes..."
    
    declare -A volumes=(
        ["un-dashboard_mongodb_data"]="MongoDB Data"
        ["un-dashboard_redis_data"]="Redis Data"
        ["un-dashboard_traefik_letsencrypt"]="SSL Certificates"
        ["un-dashboard_app_data"]="Application Data"
    )
    
    for volume in "${!volumes[@]}"; do
        local status=$(check_volume "$volume")
        if [ "$status" = "exists" ]; then
            log_success "${volumes[$volume]} ($volume): Exists"
        else
            log_info "${volumes[$volume]} ($volume): Will be created"
        fi
    done
    
    # Backup existing data if MongoDB is running
    if [ "${container_status[un-dashboard-mongodb]}" = "running" ]; then
        echo
        backup_mongodb
    fi
    
    # Deploy or update containers
    echo
    if [ "$needs_deployment" = true ]; then
        log_info "Some containers need deployment/restart..."
        
        # Ask for confirmation
        echo
        read -p "🤔 Continue with deployment? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Deployment cancelled by user"
            exit 0
        fi
        
        log_info "Starting Docker Compose deployment..."
        
        # Pull latest images
        log_info "Pulling latest images..."
        docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" pull
        
        # Build custom images
        log_info "Building application images..."
        docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" build
        
        # Start services
        log_info "Starting services..."
        docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" up -d
        
        log_success "Services started successfully"
        
    else
        log_success "All containers are already running"
        
        # Still check if we need to restart any stopped containers
        for container in "${!containers[@]}"; do
            if [ "${container_status[$container]}" = "stopped" ]; then
                log_info "Starting stopped container: $container"
                docker start "$container"
            fi
        done
    fi
    
    # Wait for services to be healthy
    echo
    log_info "Waiting for services to be healthy..."
    
    # Check critical services
    if ! check_container_health "un-dashboard-mongodb"; then
        log_error "MongoDB failed to start properly"
        exit 1
    fi
    
    if ! check_container_health "un-dashboard-redis"; then
        log_error "Redis failed to start properly"
        exit 1
    fi
    
    if ! check_container_health "un-dashboard-app"; then
        log_error "Application failed to start properly"
        exit 1
    fi
    
    # Show deployment status
    echo
    log_info "Deployment Status:"
    docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps
    
    # Show access URLs
    echo
    log_success "🎉 Deployment completed successfully!"
    echo
    echo "📋 Access Information:"
    echo "   🌐 Main Application: https://yourdomain.com"
    echo "   🗄️  Database Admin: https://db.yourdomain.com"
    echo "   🔧 Traefik Dashboard: http://your-server-ip:8080"
    echo
    echo "👤 Default Admin Account:"
    echo "   Username: admin"
    echo "   Password: admin123!"
    echo "   Email: admin@example.com"
    echo
    echo "🔧 Next Steps:"
    echo "   1. Update DNS to point your domain to this server"
    echo "   2. Update .env.production with your actual domain"
    echo "   3. Configure SMTP settings for email notifications"
    echo "   4. Change default admin password after first login"
    echo "   5. Set up regular backups using the backup scripts"
    echo
    
    # Show container logs for any issues
    log_info "Recent logs (last 20 lines per service):"
    for container in "${!containers[@]}"; do
        echo
        echo "--- $container ---"
        docker logs --tail 20 "$container" 2>/dev/null || echo "No logs available"
    done
}

# Run the main function
main "$@"
