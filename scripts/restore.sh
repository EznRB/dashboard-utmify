#!/bin/bash

# Database and Application Restore Script
# Usage: ./restore.sh --db backup_file.sql.gz [--redis backup_file.rdb.gz] [--files backup_file.tar.gz] [--confirm]

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
LOG_FILE="$APP_DIR/logs/restore.log"
DB_NAME="utmify"
DB_USER="utmify"
REDIS_HOST="localhost"
REDIS_PORT="6379"

# Variables
DB_BACKUP=""
REDIS_BACKUP=""
FILES_BACKUP=""
CONFIRM=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --db)
      DB_BACKUP="$2"
      shift 2
      ;;
    --redis)
      REDIS_BACKUP="$2"
      shift 2
      ;;
    --files)
      FILES_BACKUP="$2"
      shift 2
      ;;
    --confirm)
      CONFIRM=true
      shift
      ;;
    --list)
      list_backups
      exit 0
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      echo "Unknown option $1"
      show_help
      exit 1
      ;;
  esac
done

# Show help
show_help() {
    cat << EOF
Utmify Restore Script

Usage: $0 [OPTIONS]

Options:
  --db FILE         Database backup file to restore (.sql.gz)
  --redis FILE      Redis backup file to restore (.rdb.gz)
  --files FILE      Application files backup to restore (.tar.gz)
  --confirm         Skip confirmation prompt
  --list            List available backups
  -h, --help        Show this help message

Examples:
  $0 --db backup_20231201_120000.sql.gz --confirm
  $0 --db backup.sql.gz --redis backup.rdb.gz --files backup.tar.gz
  $0 --list
EOF
}

# List available backups
list_backups() {
    echo -e "${BLUE}Available Backups:${NC}"
    echo
    
    echo -e "${YELLOW}Database Backups:${NC}"
    find "$BACKUP_DIR/database" -name "*.gz" -type f 2>/dev/null | sort -r | head -20 || echo "No database backups found"
    echo
    
    echo -e "${YELLOW}Redis Backups:${NC}"
    find "$BACKUP_DIR/redis" -name "*.gz" -type f 2>/dev/null | sort -r | head -20 || echo "No Redis backups found"
    echo
    
    echo -e "${YELLOW}Files Backups:${NC}"
    find "$BACKUP_DIR/files" -name "*.tar.gz" -type f 2>/dev/null | sort -r | head -20 || echo "No files backups found"
}

# Logging function
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "${RED}ERROR: $1${NC}"
    exit 1
}

# Confirmation prompt
confirm_restore() {
    if [ "$CONFIRM" = false ]; then
        echo -e "${YELLOW}WARNING: This will overwrite existing data!${NC}"
        echo
        [ -n "$DB_BACKUP" ] && echo "Database backup: $DB_BACKUP"
        [ -n "$REDIS_BACKUP" ] && echo "Redis backup: $REDIS_BACKUP"
        [ -n "$FILES_BACKUP" ] && echo "Files backup: $FILES_BACKUP"
        echo
        read -p "Are you sure you want to continue? (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            echo "Restore cancelled."
            exit 0
        fi
    fi
}

# Validate backup files
validate_backups() {
    if [ -n "$DB_BACKUP" ] && [ ! -f "$DB_BACKUP" ]; then
        error_exit "Database backup file not found: $DB_BACKUP"
    fi
    
    if [ -n "$REDIS_BACKUP" ] && [ ! -f "$REDIS_BACKUP" ]; then
        error_exit "Redis backup file not found: $REDIS_BACKUP"
    fi
    
    if [ -n "$FILES_BACKUP" ] && [ ! -f "$FILES_BACKUP" ]; then
        error_exit "Files backup file not found: $FILES_BACKUP"
    fi
    
    if [ -z "$DB_BACKUP" ] && [ -z "$REDIS_BACKUP" ] && [ -z "$FILES_BACKUP" ]; then
        error_exit "No backup files specified. Use --help for usage information."
    fi
}

# Create pre-restore backup
create_pre_restore_backup() {
    log "${BLUE}Creating pre-restore backup...${NC}"
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local pre_restore_dir="$BACKUP_DIR/pre_restore_$timestamp"
    
    mkdir -p "$pre_restore_dir"
    
    # Backup current database
    if [ -n "$DB_BACKUP" ]; then
        sudo -u postgres pg_dump "$DB_NAME" | gzip > "$pre_restore_dir/pre_restore_db.sql.gz" || \
            log "${YELLOW}Warning: Could not create pre-restore database backup${NC}"
    fi
    
    # Backup current Redis data
    if [ -n "$REDIS_BACKUP" ]; then
        redis-cli --rdb "$pre_restore_dir/pre_restore_redis.rdb" || \
            log "${YELLOW}Warning: Could not create pre-restore Redis backup${NC}"
        gzip "$pre_restore_dir/pre_restore_redis.rdb" 2>/dev/null || true
    fi
    
    log "${GREEN}Pre-restore backup created in: $pre_restore_dir${NC}"
}

# Stop applications
stop_applications() {
    log "${BLUE}Stopping applications...${NC}"
    
    # Stop PM2 processes
    pm2 stop all || log "${YELLOW}Warning: Could not stop PM2 processes${NC}"
    
    # Wait for processes to stop
    sleep 5
    
    log "${GREEN}Applications stopped${NC}"
}

# Start applications
start_applications() {
    log "${BLUE}Starting applications...${NC}"
    
    # Start PM2 processes
    pm2 start "$APP_DIR/ecosystem.config.js" || error_exit "Failed to start applications"
    
    # Wait for applications to start
    sleep 10
    
    log "${GREEN}Applications started${NC}"
}

# Restore database
restore_database() {
    local backup_file="$1"
    
    log "${BLUE}Restoring database from: $backup_file${NC}"
    
    # Extract if compressed
    local sql_file="$backup_file"
    if [[ "$backup_file" == *.gz ]]; then
        sql_file="${backup_file%.gz}"
        gunzip -c "$backup_file" > "$sql_file" || error_exit "Failed to extract database backup"
    fi
    
    # Drop existing connections
    sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" || true
    
    # Restore database
    if [[ "$sql_file" == *.sql ]]; then
        # Plain SQL dump
        sudo -u postgres psql -d "$DB_NAME" < "$sql_file" || error_exit "Database restore failed"
    else
        # Custom format dump
        sudo -u postgres pg_restore \
            --verbose \
            --clean \
            --no-acl \
            --no-owner \
            --dbname="$DB_NAME" \
            "$sql_file" || error_exit "Database restore failed"
    fi
    
    # Clean up extracted file if it was compressed
    if [[ "$backup_file" == *.gz ]] && [ -f "$sql_file" ]; then
        rm -f "$sql_file"
    fi
    
    log "${GREEN}Database restore completed${NC}"
}

# Restore Redis
restore_redis() {
    local backup_file="$1"
    
    log "${BLUE}Restoring Redis from: $backup_file${NC}"
    
    # Stop Redis
    sudo systemctl stop redis-server || error_exit "Failed to stop Redis"
    
    # Extract if compressed
    local rdb_file="$backup_file"
    if [[ "$backup_file" == *.gz ]]; then
        rdb_file="${backup_file%.gz}"
        gunzip -c "$backup_file" > "$rdb_file" || error_exit "Failed to extract Redis backup"
    fi
    
    # Replace Redis dump file
    sudo cp "$rdb_file" /var/lib/redis/dump.rdb || error_exit "Failed to copy Redis dump file"
    sudo chown redis:redis /var/lib/redis/dump.rdb
    sudo chmod 660 /var/lib/redis/dump.rdb
    
    # Clean up extracted file if it was compressed
    if [[ "$backup_file" == *.gz ]] && [ -f "$rdb_file" ]; then
        rm -f "$rdb_file"
    fi
    
    # Start Redis
    sudo systemctl start redis-server || error_exit "Failed to start Redis"
    
    # Wait for Redis to be ready
    sleep 5
    
    # Verify Redis is working
    redis-cli ping > /dev/null || error_exit "Redis is not responding after restore"
    
    log "${GREEN}Redis restore completed${NC}"
}

# Restore files
restore_files() {
    local backup_file="$1"
    
    log "${BLUE}Restoring files from: $backup_file${NC}"
    
    # Create temporary directory
    local temp_dir=$(mktemp -d)
    
    # Extract backup
    tar -xzf "$backup_file" -C "$temp_dir" || error_exit "Failed to extract files backup"
    
    # Backup current files (excluding some directories)
    local current_backup="$BACKUP_DIR/current_files_$(date +%Y%m%d_%H%M%S).tar.gz"
    tar -czf "$current_backup" \
        -C "$APP_DIR" \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='backups' \
        --exclude='logs' \
        --exclude='.next' \
        --exclude='dist' \
        . || log "${YELLOW}Warning: Could not backup current files${NC}"
    
    # Restore files (preserve some directories)
    rsync -av \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='backups' \
        --exclude='logs' \
        "$temp_dir/" "$APP_DIR/" || error_exit "Failed to restore files"
    
    # Clean up
    rm -rf "$temp_dir"
    
    # Set proper permissions
    chown -R $USER:$USER "$APP_DIR"
    
    log "${GREEN}Files restore completed${NC}"
}

# Health check
health_check() {
    log "${BLUE}Performing health check...${NC}"
    
    local max_attempts=30
    local interval=10
    
    for i in $(seq 1 $max_attempts); do
        if curl -f -s "https://your-domain.com/health" > /dev/null 2>&1; then
            log "${GREEN}Health check passed${NC}"
            return 0
        fi
        
        log "${YELLOW}Health check failed (attempt $i/$max_attempts), retrying in ${interval}s...${NC}"
        sleep $interval
    done
    
    log "${RED}Health check failed after $max_attempts attempts${NC}"
    return 1
}

# Main restore function
main() {
    log "${GREEN}Starting restore process...${NC}"
    
    # Validate inputs
    validate_backups
    
    # Show confirmation
    confirm_restore
    
    # Create log directory
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Create pre-restore backup
    create_pre_restore_backup
    
    # Stop applications
    stop_applications
    
    # Perform restores
    if [ -n "$DB_BACKUP" ]; then
        restore_database "$DB_BACKUP"
    fi
    
    if [ -n "$REDIS_BACKUP" ]; then
        restore_redis "$REDIS_BACKUP"
    fi
    
    if [ -n "$FILES_BACKUP" ]; then
        restore_files "$FILES_BACKUP"
        
        # Reinstall dependencies if files were restored
        log "${BLUE}Reinstalling dependencies...${NC}"
        cd "$APP_DIR"
        pnpm install --frozen-lockfile || error_exit "Failed to install dependencies"
        
        # Rebuild applications
        log "${BLUE}Rebuilding applications...${NC}"
        pnpm build || error_exit "Failed to build applications"
    fi
    
    # Start applications
    start_applications
    
    # Health check
    if health_check; then
        log "${GREEN}Restore completed successfully!${NC}"
    else
        log "${RED}Restore completed but health check failed${NC}"
        log "${YELLOW}Please check application logs and configuration${NC}"
    fi
}

# Execute main function
main

log "${GREEN}Restore script completed${NC}"