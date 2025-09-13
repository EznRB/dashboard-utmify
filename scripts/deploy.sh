#!/bin/bash

# Production Deployment Script
# Usage: ./deploy.sh [--no-build] [--no-migrate] [--rollback]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
APP_DIR="/opt/utmify"
BACKUP_DIR="$APP_DIR/backups"
LOG_FILE="$APP_DIR/logs/deploy.log"
HEALTH_CHECK_URL="https://your-domain.com/health"
MAX_HEALTH_CHECKS=30
HEALTH_CHECK_INTERVAL=10

# Parse arguments
NO_BUILD=false
NO_MIGRATE=false
ROLLBACK=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --no-build)
      NO_BUILD=true
      shift
      ;;
    --no-migrate)
      NO_MIGRATE=true
      shift
      ;;
    --rollback)
      ROLLBACK=true
      shift
      ;;
    *)
      echo "Unknown option $1"
      exit 1
      ;;
  esac
done

# Logging function
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "${RED}ERROR: $1${NC}"
    exit 1
}

# Health check function
health_check() {
    local url=$1
    local max_attempts=$2
    local interval=$3
    
    log "${BLUE}Performing health check on $url${NC}"
    
    for i in $(seq 1 $max_attempts); do
        if curl -f -s "$url" > /dev/null; then
            log "${GREEN}Health check passed (attempt $i/$max_attempts)${NC}"
            return 0
        fi
        
        log "${YELLOW}Health check failed (attempt $i/$max_attempts), retrying in ${interval}s...${NC}"
        sleep $interval
    done
    
    return 1
}

# Rollback function
rollback() {
    log "${YELLOW}Starting rollback process...${NC}"
    
    # Get latest backup
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/backup_*.sql 2>/dev/null | head -n1)
    
    if [ -z "$LATEST_BACKUP" ]; then
        error_exit "No backup found for rollback"
    fi
    
    log "${BLUE}Restoring database from $LATEST_BACKUP${NC}"
    
    # Stop applications
    pm2 stop all || true
    
    # Restore database
    sudo -u postgres psql -d utmify < "$LATEST_BACKUP" || error_exit "Database restore failed"
    
    # Checkout previous commit
    git checkout HEAD~1 || error_exit "Git rollback failed"
    
    # Rebuild and restart
    pnpm install --frozen-lockfile
    pnpm build
    pm2 restart all
    
    # Health check
    if health_check "$HEALTH_CHECK_URL" 10 5; then
        log "${GREEN}Rollback completed successfully${NC}"
    else
        error_exit "Rollback health check failed"
    fi
    
    exit 0
}

# Main deployment function
deploy() {
    log "${GREEN}Starting deployment process...${NC}"
    
    # Change to app directory
    cd "$APP_DIR" || error_exit "Cannot change to app directory"
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Pre-deployment backup
    log "${BLUE}Creating pre-deployment backup...${NC}"
    BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"
    sudo -u postgres pg_dump utmify > "$BACKUP_FILE" || error_exit "Backup failed"
    
    # Store current commit hash for potential rollback
    CURRENT_COMMIT=$(git rev-parse HEAD)
    echo "$CURRENT_COMMIT" > "$BACKUP_DIR/last_commit.txt"
    
    # Pull latest code
    log "${BLUE}Pulling latest code...${NC}"
    git fetch origin
    git pull origin main || error_exit "Git pull failed"
    
    # Install dependencies
    log "${BLUE}Installing dependencies...${NC}"
    pnpm install --frozen-lockfile || error_exit "Dependencies installation failed"
    
    # Generate Prisma client
    log "${BLUE}Generating Prisma client...${NC}"
    cd packages/database
    pnpm prisma generate || error_exit "Prisma generate failed"
    cd ../..
    
    # Run database migrations
    if [ "$NO_MIGRATE" = false ]; then
        log "${BLUE}Running database migrations...${NC}"
        cd packages/database
        pnpm prisma migrate deploy || error_exit "Database migration failed"
        cd ../..
    else
        log "${YELLOW}Skipping database migrations${NC}"
    fi
    
    # Build applications
    if [ "$NO_BUILD" = false ]; then
        log "${BLUE}Building applications...${NC}"
        pnpm build || error_exit "Build failed"
    else
        log "${YELLOW}Skipping build step${NC}"
    fi
    
    # Restart PM2 processes with zero-downtime
    log "${BLUE}Restarting applications...${NC}"
    pm2 reload ecosystem.config.js || error_exit "PM2 reload failed"
    
    # Wait for applications to start
    sleep 10
    
    # Health check
    if health_check "$HEALTH_CHECK_URL" "$MAX_HEALTH_CHECKS" "$HEALTH_CHECK_INTERVAL"; then
        log "${GREEN}Deployment completed successfully!${NC}"
        
        # Clean up old backups (keep last 10)
        find "$BACKUP_DIR" -name "backup_*.sql" -type f | sort -r | tail -n +11 | xargs rm -f
        
        # Save PM2 configuration
        pm2 save
        
        log "${GREEN}All systems operational${NC}"
    else
        log "${RED}Health check failed, initiating rollback...${NC}"
        rollback
    fi
}

# Main execution
if [ "$ROLLBACK" = true ]; then
    rollback
else
    deploy
fi

log "${GREEN}Deployment script completed${NC}"