# Utmify Infrastructure - Staging Environment Variables
# This file contains configuration for the staging environment

# General Configuration
environment = "staging"
aws_region  = "us-east-1"
project_name = "utmify"

# VPC Configuration
vpc_cidr = "10.1.0.0/16"
public_subnet_cidrs = ["10.1.1.0/24", "10.1.2.0/24"]
private_subnet_cidrs = ["10.1.10.0/24", "10.1.20.0/24"]
database_subnet_cidrs = ["10.1.100.0/24", "10.1.200.0/24"]

# ECS Configuration - Medium resources for staging
api_cpu = 512
api_memory = 1024
web_cpu = 256
web_memory = 512

api_desired_count = 2
web_desired_count = 2

api_min_capacity = 1
api_max_capacity = 5
web_min_capacity = 1
web_max_capacity = 3

# Database Configuration - Medium instance for staging
db_instance_class = "db.t3.small"
db_allocated_storage = 50
db_max_allocated_storage = 200
db_engine_version = "15.4"
db_name = "utmify_staging"
db_username = "utmify_staging_user"
db_backup_retention_period = 3
db_backup_window = "03:00-04:00"
db_maintenance_window = "sun:04:00-sun:05:00"
db_multi_az = false
db_deletion_protection = true

# Redis Configuration - Medium instance for staging
redis_node_type = "cache.t3.small"
redis_num_cache_nodes = 1
redis_engine_version = "7.0"
redis_port = 6379
redis_parameter_group_name = "default.redis7"

# Domain and SSL Configuration
# domain_names = ["staging.utmify.com", "staging-api.utmify.com"]
# ssl_certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/staging-cert-id"
# create_route53_records = true
# route53_zone_id = "Z1234567890ABC"

# CloudFront Configuration
cloudfront_price_class = "PriceClass_100"

# Container Images
api_image = "utmify/api:staging"
web_image = "utmify/web:staging"

# Environment Variables
api_environment_variables = {
  NODE_ENV = "staging"
  PORT = "3001"
  LOG_LEVEL = "info"
}

web_environment_variables = {
  NODE_ENV = "staging"
  PORT = "3000"
  NEXT_PUBLIC_API_URL = "https://staging-api.utmify.com"
  NEXT_PUBLIC_ENVIRONMENT = "staging"
}

# Feature Flags - Most features enabled for staging
enable_monitoring = true
enable_auto_scaling = true
enable_backups = true
enable_waf = true
enable_vpc_flow_logs = true
enable_spot_instances = false
enable_scheduled_scaling = false
enable_redis_cluster = false
enable_rds_proxy = false
enable_container_insights = true
enable_x_ray = true

# Monitoring Configuration
log_retention_days = 14

# Auto Scaling Configuration
scale_up_cpu_threshold = 70
scale_down_cpu_threshold = 30
scale_up_memory_threshold = 80
scale_down_memory_threshold = 40

# Backup Configuration
backup_schedule = "cron(0 2 * * ? *)"  # Daily at 2 AM

# Security Configuration - Moderate security for staging
allowed_cidr_blocks = ["0.0.0.0/0"]

# Additional Tags
additional_tags = {
  Owner = "QA Team"
  CostCenter = "Engineering"
  Environment = "Staging"
  AutoShutdown = "Disabled"
  Backup = "Required"
  TestEnvironment = "true"
}