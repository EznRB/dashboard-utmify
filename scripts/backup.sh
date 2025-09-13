#!/bin/bash

# Automated Backup Script for Utmify
# Usage: ./backup.sh [--type daily|weekly|monthly] [--upload-s3]

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
LOG_FILE="$APP_DIR/logs/backup.log"
DB_NAME="utmify"
DB_USER="utmify"
REDIS_HOST="localhost"
REDIS_PORT="6379"

# S3 Configuration (optional)
S3_BUCKET="utmify-backups"
S3_REGION="us-east-1"

# Retention policies
DAILY_RETENTION=7    # Keep 7 daily backups
WEEKLY_RETENTION=4   # Keep 4 weekly backups
MONTHLY_RETENTION=12 # Keep 12 monthly backups

# Parse arguments
BACKUP_TYPE="daily"
UPLOAD_S3=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --type)
      BACKUP_TYPE="$2"
      shift 2
      ;;
    --upload-s3)
      UPLOAD_S3=true
      shift
      ;;
    *)
      echo "Unknown option $1"
      exit 1
      ;;
  esac
done

# Validate backup type
if [[ ! "$BACKUP_TYPE" =~ ^(daily|weekly|monthly)$ ]]; then
    echo "Invalid backup type. Use: daily, weekly, or monthly"
    exit 1
fi

# Logging function
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "${RED}ERROR: $1${NC}"
    exit 1
}

# Create backup directories
create_directories() {
    mkdir -p "$BACKUP_DIR/database/$BACKUP_TYPE"
    mkdir -p "$BACKUP_DIR/redis/$BACKUP_TYPE"
    mkdir -p "$BACKUP_DIR/files/$BACKUP_TYPE"
    mkdir -p "$BACKUP_DIR/logs/$BACKUP_TYPE"
    mkdir -p "$(dirname "$LOG_FILE")"
}

# Database backup
backup_database() {
    log "${BLUE}Starting database backup...${NC}"
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/database/$BACKUP_TYPE/db_${BACKUP_TYPE}_${timestamp}.sql"
    local backup_compressed="${backup_file}.gz"
    
    # Create database dump
    sudo -u postgres pg_dump \
        --verbose \
        --clean \
        --no-acl \
        --no-owner \
        --format=custom \
        --dbname="$DB_NAME" \
        --file="$backup_file" || error_exit "Database backup failed"
    
    # Compress backup
    gzip "$backup_file" || error_exit "Database compression failed"
    
    # Verify backup integrity
    if sudo -u postgres pg_restore --list "$backup_compressed" > /dev/null 2>&1; then
        log "${GREEN}Database backup completed: $backup_compressed${NC}"
        echo "$backup_compressed"
    else
        error_exit "Database backup verification failed"
    fi
}

# Redis backup
backup_redis() {
    log "${BLUE}Starting Redis backup...${NC}"
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/redis/$BACKUP_TYPE/redis_${BACKUP_TYPE}_${timestamp}.rdb"
    
    # Create Redis backup
    redis-cli --rdb "$backup_file" || error_exit "Redis backup failed"
    
    # Compress backup
    gzip "$backup_file" || error_exit "Redis compression failed"
    
    log "${GREEN}Redis backup completed: ${backup_file}.gz${NC}"
    echo "${backup_file}.gz"
}

# Application files backup
backup_files() {
    log "${BLUE}Starting application files backup...${NC}"
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/files/$BACKUP_TYPE/files_${BACKUP_TYPE}_${timestamp}.tar.gz"
    
    # Create tar archive of important files
    tar -czf "$backup_file" \
        -C "$APP_DIR" \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='backups' \
        --exclude='logs' \
        --exclude='.next' \
        --exclude='dist' \
        . || error_exit "Files backup failed"
    
    log "${GREEN}Files backup completed: $backup_file${NC}"
    echo "$backup_file"
}

# Logs backup
backup_logs() {
    log "${BLUE}Starting logs backup...${NC}"
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/logs/$BACKUP_TYPE/logs_${BACKUP_TYPE}_${timestamp}.tar.gz"
    
    # Backup application logs
    if [ -d "$APP_DIR/logs" ]; then
        tar -czf "$backup_file" -C "$APP_DIR" logs/ || error_exit "Logs backup failed"
    fi
    
    # Backup PM2 logs
    if [ -d "/var/log/pm2" ]; then
        tar -czf "${backup_file%.tar.gz}_pm2.tar.gz" -C "/var/log" pm2/ || log "${YELLOW}PM2 logs backup failed${NC}"
    fi
    
    # Backup Nginx logs
    if [ -d "/var/log/nginx" ]; then
        sudo tar -czf "${backup_file%.tar.gz}_nginx.tar.gz" -C "/var/log" nginx/ || log "${YELLOW}Nginx logs backup failed${NC}"
    fi
    
    log "${GREEN}Logs backup completed${NC}"
}

# Upload to S3
upload_to_s3() {
    local file_path="$1"
    local s3_key="$2"
    
    if command -v aws >/dev/null 2>&1; then
        log "${BLUE}Uploading to S3: $s3_key${NC}"
        
        aws s3 cp "$file_path" "s3://$S3_BUCKET/$s3_key" \
            --region "$S3_REGION" \
            --storage-class STANDARD_IA || log "${YELLOW}S3 upload failed for $file_path${NC}"
        
        log "${GREEN}S3 upload completed: $s3_key${NC}"
    else
        log "${YELLOW}AWS CLI not found, skipping S3 upload${NC}"
    fi
}

# Cleanup old backups
cleanup_backups() {
    local backup_type="$1"
    local retention="$2"
    
    log "${BLUE}Cleaning up old $backup_type backups (keeping $retention)${NC}"
    
    # Cleanup database backups
    find "$BACKUP_DIR/database/$backup_type" -name "*.gz" -type f | \
        sort -r | tail -n +$((retention + 1)) | xargs rm -f
    
    # Cleanup Redis backups
    find "$BACKUP_DIR/redis/$backup_type" -name "*.gz" -type f | \
        sort -r | tail -n +$((retention + 1)) | xargs rm -f
    
    # Cleanup file backups
    find "$BACKUP_DIR/files/$backup_type" -name "*.tar.gz" -type f | \
        sort -r | tail -n +$((retention + 1)) | xargs rm -f
    
    # Cleanup log backups
    find "$BACKUP_DIR/logs/$backup_type" -name "*.tar.gz" -type f | \
        sort -r | tail -n +$((retention + 1)) | xargs rm -f
    
    log "${GREEN}Cleanup completed for $backup_type backups${NC}"
}

# Generate backup report
generate_report() {
    local db_backup="$1"
    local redis_backup="$2"
    local files_backup="$3"
    
    log "${BLUE}Generating backup report...${NC}"
    
    local report_file="$BACKUP_DIR/backup_report_$(date +%Y%m%d_%H%M%S).txt"
    
    cat > "$report_file" << EOF
Utmify Backup Report
===================
Date: $(date)
Type: $BACKUP_TYPE
Host: $(hostname)

Backup Files:
- Database: $(basename "$db_backup") ($(du -h "$db_backup" | cut -f1))
- Redis: $(basename "$redis_backup") ($(du -h "$redis_backup" | cut -f1))
- Files: $(basename "$files_backup") ($(du -h "$files_backup" | cut -f1))

Disk Usage:
$(df -h "$BACKUP_DIR")

Backup Status: SUCCESS
EOF
    
    log "${GREEN}Backup report generated: $report_file${NC}"
    
    # Send report via email if configured
    if command -v mail >/dev/null 2>&1 && [ -n "$BACKUP_EMAIL" ]; then
        mail -s "Utmify Backup Report - $BACKUP_TYPE" "$BACKUP_EMAIL" < "$report_file"
        log "${GREEN}Backup report sent to $BACKUP_EMAIL${NC}"
    fi
}

# Main backup function
main() {
    log "${GREEN}Starting $BACKUP_TYPE backup process...${NC}"
    
    # Create directories
    create_directories
    
    # Perform backups
    db_backup=$(backup_database)
    redis_backup=$(backup_redis)
    files_backup=$(backup_files)
    backup_logs
    
    # Upload to S3 if requested
    if [ "$UPLOAD_S3" = true ]; then
        upload_to_s3 "$db_backup" "database/$BACKUP_TYPE/$(basename "$db_backup")"
        upload_to_s3 "$redis_backup" "redis/$BACKUP_TYPE/$(basename "$redis_backup")"
        upload_to_s3 "$files_backup" "files/$BACKUP_TYPE/$(basename "$files_backup")"
    fi
    
    # Cleanup old backups based on retention policy
    case $BACKUP_TYPE in
        daily)
            cleanup_backups "daily" "$DAILY_RETENTION"
            ;;
        weekly)
            cleanup_backups "weekly" "$WEEKLY_RETENTION"
            ;;
        monthly)
            cleanup_backups "monthly" "$MONTHLY_RETENTION"
            ;;
    esac
    
    # Generate report
    generate_report "$db_backup" "$redis_backup" "$files_backup"
    
    log "${GREEN}$BACKUP_TYPE backup completed successfully!${NC}"
}

# Execute main function
main

log "${GREEN}Backup script completed${NC}"