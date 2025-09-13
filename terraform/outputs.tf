# Utmify Infrastructure - Outputs
# This file defines outputs that will be displayed after terraform apply

# VPC Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = aws_subnet.private[*].id
}

output "database_subnet_ids" {
  description = "IDs of the database subnets"
  value       = aws_subnet.database[*].id
}

# Load Balancer Outputs
output "load_balancer_dns_name" {
  description = "DNS name of the load balancer"
  value       = aws_lb.main.dns_name
}

output "load_balancer_zone_id" {
  description = "Zone ID of the load balancer"
  value       = aws_lb.main.zone_id
}

output "load_balancer_arn" {
  description = "ARN of the load balancer"
  value       = aws_lb.main.arn
}

# CloudFront Outputs
output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.id
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "cloudfront_hosted_zone_id" {
  description = "Hosted zone ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.hosted_zone_id
}

# ECS Outputs
output "ecs_cluster_id" {
  description = "ID of the ECS cluster"
  value       = aws_ecs_cluster.main.id
}

output "ecs_cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.main.arn
}

output "api_service_name" {
  description = "Name of the API ECS service"
  value       = aws_ecs_service.api.name
}

output "web_service_name" {
  description = "Name of the Web ECS service"
  value       = aws_ecs_service.web.name
}

output "api_task_definition_arn" {
  description = "ARN of the API task definition"
  value       = aws_ecs_task_definition.api.arn
}

output "web_task_definition_arn" {
  description = "ARN of the Web task definition"
  value       = aws_ecs_task_definition.web.arn
}

# Database Outputs
output "database_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "database_port" {
  description = "RDS instance port"
  value       = aws_db_instance.main.port
}

output "database_name" {
  description = "Database name"
  value       = aws_db_instance.main.db_name
}

output "database_username" {
  description = "Database username"
  value       = aws_db_instance.main.username
  sensitive   = true
}

output "database_password_secret_arn" {
  description = "ARN of the database password secret"
  value       = aws_secretsmanager_secret.db_password.arn
  sensitive   = true
}

# RDS Proxy Outputs (if enabled)
output "database_proxy_endpoint" {
  description = "RDS Proxy endpoint"
  value       = var.enable_rds_proxy ? aws_db_proxy.main[0].endpoint : null
  sensitive   = true
}

# Redis Outputs
output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
  sensitive   = true
}

output "redis_port" {
  description = "ElastiCache Redis port"
  value       = aws_elasticache_replication_group.main.port
}

output "redis_auth_token_secret_arn" {
  description = "ARN of the Redis auth token secret"
  value       = aws_secretsmanager_secret.redis_auth_token.arn
  sensitive   = true
}

# S3 Outputs
output "assets_bucket_name" {
  description = "Name of the assets S3 bucket"
  value       = aws_s3_bucket.assets.id
}

output "assets_bucket_arn" {
  description = "ARN of the assets S3 bucket"
  value       = aws_s3_bucket.assets.arn
}

output "assets_bucket_domain_name" {
  description = "Domain name of the assets S3 bucket"
  value       = aws_s3_bucket.assets.bucket_domain_name
}

output "alb_logs_bucket_name" {
  description = "Name of the ALB logs S3 bucket"
  value       = aws_s3_bucket.alb_logs.id
}

# Security Outputs
output "kms_key_id" {
  description = "ID of the KMS key"
  value       = aws_kms_key.utmify.key_id
}

output "kms_key_arn" {
  description = "ARN of the KMS key"
  value       = aws_kms_key.utmify.arn
}

output "app_secrets_arn" {
  description = "ARN of the application secrets"
  value       = aws_secretsmanager_secret.app_secrets.arn
  sensitive   = true
}

# Security Group Outputs
output "alb_security_group_id" {
  description = "ID of the ALB security group"
  value       = aws_security_group.alb.id
}

output "ecs_security_group_id" {
  description = "ID of the ECS security group"
  value       = aws_security_group.ecs.id
}

output "rds_security_group_id" {
  description = "ID of the RDS security group"
  value       = aws_security_group.rds.id
}

output "redis_security_group_id" {
  description = "ID of the Redis security group"
  value       = aws_security_group.redis.id
}

# Target Group Outputs
output "api_target_group_arn" {
  description = "ARN of the API target group"
  value       = aws_lb_target_group.api.arn
}

output "web_target_group_arn" {
  description = "ARN of the Web target group"
  value       = aws_lb_target_group.web.arn
}

# CloudWatch Outputs
output "api_log_group_name" {
  description = "Name of the API CloudWatch log group"
  value       = aws_cloudwatch_log_group.api.name
}

output "web_log_group_name" {
  description = "Name of the Web CloudWatch log group"
  value       = aws_cloudwatch_log_group.web.name
}

output "cloudwatch_dashboard_url" {
  description = "URL of the CloudWatch dashboard"
  value       = var.enable_monitoring ? "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.main[0].dashboard_name}" : null
}

# Auto Scaling Outputs
output "api_autoscaling_target_arn" {
  description = "ARN of the API auto scaling target"
  value       = var.enable_auto_scaling ? aws_appautoscaling_target.api[0].arn : null
}

output "web_autoscaling_target_arn" {
  description = "ARN of the Web auto scaling target"
  value       = var.enable_auto_scaling ? aws_appautoscaling_target.web[0].arn : null
}

# Environment Information
output "environment" {
  description = "Environment name"
  value       = var.environment
}

output "aws_region" {
  description = "AWS region"
  value       = var.aws_region
}

output "project_name" {
  description = "Project name"
  value       = var.project_name
}

# Application URLs
output "application_urls" {
  description = "Application URLs"
  value = {
    load_balancer = "https://${aws_lb.main.dns_name}"
    cloudfront    = "https://${aws_cloudfront_distribution.main.domain_name}"
    custom_domains = length(var.domain_names) > 0 ? [for domain in var.domain_names : "https://${domain}"] : []
  }
}

# Connection Strings (for application configuration)
output "database_url" {
  description = "Database connection URL (without password)"
  value       = "postgresql://${aws_db_instance.main.username}:PASSWORD@${aws_db_instance.main.endpoint}/${aws_db_instance.main.db_name}"
  sensitive   = true
}

output "redis_url" {
  description = "Redis connection URL (without auth token)"
  value       = "redis://:AUTH_TOKEN@${aws_elasticache_replication_group.main.primary_endpoint_address}:${aws_elasticache_replication_group.main.port}"
  sensitive   = true
}

# Deployment Information
output "deployment_info" {
  description = "Deployment information"
  value = {
    cluster_name     = aws_ecs_cluster.main.name
    api_service_name = aws_ecs_service.api.name
    web_service_name = aws_ecs_service.web.name
    region          = var.aws_region
    environment     = var.environment
  }
}

# Cost Optimization Information
output "cost_optimization" {
  description = "Cost optimization settings"
  value = {
    spot_instances_enabled     = var.enable_spot_instances
    scheduled_scaling_enabled  = var.enable_scheduled_scaling
    auto_scaling_enabled      = var.enable_auto_scaling
    multi_az_enabled          = var.db_multi_az
    cloudfront_price_class    = var.cloudfront_price_class
  }
}

# Security Information
output "security_info" {
  description = "Security configuration information"
  value = {
    encryption_at_rest_enabled    = true
    encryption_in_transit_enabled = true
    kms_key_rotation_enabled     = true
    vpc_flow_logs_enabled        = var.enable_vpc_flow_logs
    waf_enabled                  = var.enable_waf
    container_insights_enabled   = var.enable_container_insights
  }
}

# Monitoring Information
output "monitoring_info" {
  description = "Monitoring configuration information"
  value = {
    monitoring_enabled           = var.enable_monitoring
    container_insights_enabled   = var.enable_container_insights
    x_ray_enabled               = var.enable_x_ray
    log_retention_days          = var.log_retention_days
    performance_insights_enabled = true
  }
}