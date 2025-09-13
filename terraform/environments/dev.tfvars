# Utmify Infrastructure - Development Environment Variables
# This file contains configuration for the development environment

# General Configuration
environment = "dev"
aws_region  = "us-east-1"
project_name = "utmify"

# VPC Configuration
vpc_cidr = "10.0.0.0/16"
public_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnet_cidrs = ["10.0.10.0/24", "10.0.20.0/24"]
database_subnet_cidrs = ["10.0.100.0/24", "10.0.200.0/24"]

# ECS Configuration - Minimal resources for development
api_cpu = 256
api_memory = 512
web_cpu = 256
web_memory = 512

api_desired_count = 1
web_desired_count = 1

api_min_capacity = 1
api_max_capacity = 3
web_min_capacity = 1
web_max_capacity = 2

# Database Configuration - Small instance for development
db_instance_class = "db.t3.micro"
db_allocated_storage = 20
db_max_allocated_storage = 50
db_engine_version = "15.4"
db_name = "utmify_dev"
db_username = "utmify_dev_user"
db_backup_retention_period = 1
db_backup_window = "03:00-04:00"
db_maintenance_window = "sun:04:00-sun:05:00"
db_multi_az = false
db_deletion_protection = false

# Redis Configuration - Small instance for development
redis_node_type = "cache.t3.micro"
redis_num_cache_nodes = 1
redis_engine_version = "7.0"
redis_port = 6379
redis_parameter_group_name = "default.redis7"

# CloudFront Configuration - Cheapest option for development
cloudfront_price_class = "PriceClass_100"

# Container Images
api_image = "utmify/api:dev"
web_image = "utmify/web:dev"

# Environment Variables
api_environment_variables = {
  NODE_ENV = "development"
  PORT = "3001"
  LOG_LEVEL = "debug"
  DEBUG = "*"
}

web_environment_variables = {
  NODE_ENV = "development"
  PORT = "3000"
  NEXT_PUBLIC_API_URL = "https://dev-api.utmify.com"
}

# Feature Flags - Minimal features for development
enable_monitoring = true
enable_auto_scaling = false
enable_backups = false
enable_waf = false
enable_vpc_flow_logs = false
enable_spot_instances = true  # Use spot instances to save costs
enable_scheduled_scaling = false
enable_redis_cluster = false
enable_rds_proxy = false
enable_container_insights = false
enable_x_ray = false

# Monitoring Configuration
log_retention_days = 7  # Shorter retention for development

# Auto Scaling Configuration (disabled but configured)
scale_up_cpu_threshold = 80
scale_down_cpu_threshold = 20
scale_up_memory_threshold = 85
scale_down_memory_threshold = 30

# Backup Configuration
backup_schedule = "cron(0 6 * * ? *)"  # Daily at 6 AM

# Security Configuration - More permissive for development
allowed_cidr_blocks = ["0.0.0.0/0"]

# Additional Tags
additional_tags = {
  Owner = "Development Team"
  CostCenter = "Engineering"
  Environment = "Development"
  AutoShutdown = "Enabled"
  Backup = "NotRequired"
}