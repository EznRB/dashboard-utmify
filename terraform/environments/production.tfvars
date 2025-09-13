# Utmify Infrastructure - Production Environment Variables
# This file contains configuration for the production environment

# General Configuration
environment = "production"
aws_region  = "us-east-1"
project_name = "utmify"

# VPC Configuration
vpc_cidr = "10.2.0.0/16"
public_subnet_cidrs = ["10.2.1.0/24", "10.2.2.0/24"]
private_subnet_cidrs = ["10.2.10.0/24", "10.2.20.0/24"]
database_subnet_cidrs = ["10.2.100.0/24", "10.2.200.0/24"]

# ECS Configuration - High resources for production
api_cpu = 1024
api_memory = 2048
web_cpu = 512
web_memory = 1024

api_desired_count = 3
web_desired_count = 2

api_min_capacity = 2
api_max_capacity = 20
web_min_capacity = 2
web_max_capacity = 10

# Database Configuration - Production-grade instance
db_instance_class = "db.t3.medium"
db_allocated_storage = 100
db_max_allocated_storage = 1000
db_engine_version = "15.4"
db_name = "utmify_prod"
db_username = "utmify_prod_user"
db_backup_retention_period = 30
db_backup_window = "03:00-04:00"
db_maintenance_window = "sun:04:00-sun:05:00"
db_multi_az = true
db_deletion_protection = true

# Redis Configuration - Production-grade instance
redis_node_type = "cache.t3.medium"
redis_num_cache_nodes = 2
redis_engine_version = "7.0"
redis_port = 6379
redis_parameter_group_name = "default.redis7"

# Domain and SSL Configuration
# domain_names = ["utmify.com", "www.utmify.com", "api.utmify.com"]
# ssl_certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/production-cert-id"
# create_route53_records = true
# route53_zone_id = "Z1234567890ABC"

# CloudFront Configuration - Global distribution for production
cloudfront_price_class = "PriceClass_All"

# Container Images
api_image = "utmify/api:latest"
web_image = "utmify/web:latest"

# Environment Variables
api_environment_variables = {
  NODE_ENV = "production"
  PORT = "3001"
  LOG_LEVEL = "warn"
}

web_environment_variables = {
  NODE_ENV = "production"
  PORT = "3000"
  NEXT_PUBLIC_API_URL = "https://api.utmify.com"
  NEXT_PUBLIC_ENVIRONMENT = "production"
}

# Feature Flags - All production features enabled
enable_monitoring = true
enable_auto_scaling = true
enable_backups = true
enable_waf = true
enable_vpc_flow_logs = true
enable_spot_instances = false
enable_scheduled_scaling = true
enable_redis_cluster = true
enable_rds_proxy = true
enable_container_insights = true
enable_x_ray = true

# Monitoring Configuration
log_retention_days = 90

# Auto Scaling Configuration - Conservative thresholds for production
scale_up_cpu_threshold = 60
scale_down_cpu_threshold = 25
scale_up_memory_threshold = 70
scale_down_memory_threshold = 35

# Backup Configuration
backup_schedule = "cron(0 1 * * ? *)"  # Daily at 1 AM

# Security Configuration - Restrictive security for production
# allowed_cidr_blocks = ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]
allowed_cidr_blocks = ["0.0.0.0/0"]  # Update with actual allowed IPs

# Additional Tags
additional_tags = {
  Owner = "DevOps Team"
  CostCenter = "Production"
  Environment = "Production"
  AutoShutdown = "Disabled"
  Backup = "Critical"
  Compliance = "Required"
  DataClassification = "Confidential"
}