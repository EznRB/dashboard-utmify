# Utmify Infrastructure - Database Configuration
# This file contains RDS PostgreSQL and ElastiCache Redis configurations

# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}-db-subnet-group"
  subnet_ids = aws_subnet.database[*].id
  
  tags = {
    Name = "${var.project_name}-${var.environment}-db-subnet-group"
  }
}

# DB Parameter Group
resource "aws_db_parameter_group" "main" {
  family = "postgres15"
  name   = "${var.project_name}-${var.environment}-db-params"
  
  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }
  
  parameter {
    name  = "log_statement"
    value = "all"
  }
  
  parameter {
    name  = "log_duration"
    value = "1"
  }
  
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }
  
  parameter {
    name  = "max_connections"
    value = "200"
  }
  
  parameter {
    name  = "shared_buffers"
    value = "{DBInstanceClassMemory/4}"
  }
  
  tags = {
    Name = "${var.project_name}-${var.environment}-db-params"
  }
}

# RDS Instance
resource "aws_db_instance" "main" {
  identifier = "${var.project_name}-${var.environment}-db"
  
  # Engine Configuration
  engine         = "postgres"
  engine_version = var.db_engine_version
  instance_class = var.db_instance_class
  
  # Storage Configuration
  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id           = aws_kms_key.utmify.arn
  
  # Database Configuration
  db_name  = var.db_name
  username = var.db_username
  password = random_password.db_password.result
  
  # Network Configuration
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  
  # Backup Configuration
  backup_retention_period = var.db_backup_retention_period
  backup_window          = var.db_backup_window
  maintenance_window     = var.db_maintenance_window
  
  # High Availability
  multi_az = var.db_multi_az
  
  # Monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_enhanced_monitoring.arn
  
  # Performance Insights
  performance_insights_enabled          = true
  performance_insights_kms_key_id      = aws_kms_key.utmify.arn
  performance_insights_retention_period = 7
  
  # Parameter Group
  parameter_group_name = aws_db_parameter_group.main.name
  
  # Security
  deletion_protection = var.db_deletion_protection
  
  # Logging
  enabled_cloudwatch_logs_exports = ["postgresql"]
  
  # Maintenance
  auto_minor_version_upgrade = true
  
  # Final Snapshot
  final_snapshot_identifier = "${var.project_name}-${var.environment}-db-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
  skip_final_snapshot       = var.environment != "production"
  
  tags = {
    Name = "${var.project_name}-${var.environment}-db"
  }
  
  lifecycle {
    ignore_changes = [final_snapshot_identifier]
  }
}

# RDS Enhanced Monitoring IAM Role
resource "aws_iam_role" "rds_enhanced_monitoring" {
  name = "${var.project_name}-${var.environment}-rds-monitoring-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })
  
  tags = {
    Name = "${var.project_name}-${var.environment}-rds-monitoring-role"
  }
}

resource "aws_iam_role_policy_attachment" "rds_enhanced_monitoring" {
  role       = aws_iam_role.rds_enhanced_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# RDS Proxy (optional)
resource "aws_db_proxy" "main" {
  count = var.enable_rds_proxy ? 1 : 0
  
  name                   = "${var.project_name}-${var.environment}-db-proxy"
  engine_family         = "POSTGRESQL"
  auth {
    auth_scheme = "SECRETS"
    secret_arn  = aws_secretsmanager_secret.db_password.arn
  }
  
  role_arn               = aws_iam_role.db_proxy[0].arn
  vpc_subnet_ids         = aws_subnet.database[*].id
  vpc_security_group_ids = [aws_security_group.db_proxy[0].id]
  
  require_tls = true
  
  tags = {
    Name = "${var.project_name}-${var.environment}-db-proxy"
  }
}

resource "aws_db_proxy_default_target_group" "main" {
  count = var.enable_rds_proxy ? 1 : 0
  
  db_proxy_name = aws_db_proxy.main[0].name
  
  connection_pool_config {
    connection_borrow_timeout    = 120
    init_query                  = "SET x=1, y=2"
    max_connections_percent      = 100
    max_idle_connections_percent = 50
    session_pinning_filters     = ["EXCLUDE_VARIABLE_SETS"]
  }
}

resource "aws_db_proxy_target" "main" {
  count = var.enable_rds_proxy ? 1 : 0
  
  db_instance_identifier = aws_db_instance.main.id
  db_proxy_name         = aws_db_proxy.main[0].name
  target_group_name     = aws_db_proxy_default_target_group.main[0].name
}

# IAM Role for RDS Proxy
resource "aws_iam_role" "db_proxy" {
  count = var.enable_rds_proxy ? 1 : 0
  
  name = "${var.project_name}-${var.environment}-db-proxy-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "rds.amazonaws.com"
        }
      }
    ]
  })
  
  tags = {
    Name = "${var.project_name}-${var.environment}-db-proxy-role"
  }
}

resource "aws_iam_role_policy" "db_proxy" {
  count = var.enable_rds_proxy ? 1 : 0
  
  name = "${var.project_name}-${var.environment}-db-proxy-policy"
  role = aws_iam_role.db_proxy[0].id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetResourcePolicy",
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
          "secretsmanager:ListSecretVersionIds"
        ]
        Resource = aws_secretsmanager_secret.db_password.arn
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = aws_kms_key.utmify.arn
        Condition = {
          StringEquals = {
            "kms:ViaService" = "secretsmanager.${var.aws_region}.amazonaws.com"
          }
        }
      }
    ]
  })
}

# Security Group for RDS Proxy
resource "aws_security_group" "db_proxy" {
  count = var.enable_rds_proxy ? 1 : 0
  
  name_prefix = "${var.project_name}-${var.environment}-db-proxy-"
  vpc_id      = aws_vpc.main.id
  description = "Security group for RDS Proxy"
  
  ingress {
    description     = "PostgreSQL from ECS"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }
  
  egress {
    description     = "PostgreSQL to RDS"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.rds.id]
  }
  
  tags = {
    Name = "${var.project_name}-${var.environment}-db-proxy-sg"
  }
}

# ElastiCache Subnet Group
resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}-cache-subnet-group"
  subnet_ids = aws_subnet.database[*].id
  
  tags = {
    Name = "${var.project_name}-${var.environment}-cache-subnet-group"
  }
}

# ElastiCache Parameter Group
resource "aws_elasticache_parameter_group" "main" {
  family = "redis7"
  name   = "${var.project_name}-${var.environment}-cache-params"
  
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }
  
  parameter {
    name  = "timeout"
    value = "300"
  }
  
  parameter {
    name  = "tcp-keepalive"
    value = "300"
  }
  
  tags = {
    Name = "${var.project_name}-${var.environment}-cache-params"
  }
}

# ElastiCache Replication Group
resource "aws_elasticache_replication_group" "main" {
  replication_group_id         = "${var.project_name}-${var.environment}-redis"
  description                  = "Redis cluster for ${var.project_name} ${var.environment}"
  
  # Engine Configuration
  engine               = "redis"
  engine_version       = var.redis_engine_version
  node_type           = var.redis_node_type
  port                = var.redis_port
  parameter_group_name = aws_elasticache_parameter_group.main.name
  
  # Cluster Configuration
  num_cache_clusters = var.enable_redis_cluster ? null : var.redis_num_cache_nodes
  
  dynamic "num_node_groups" {
    for_each = var.enable_redis_cluster ? [1] : []
    content {
      num_node_groups         = 2
      replicas_per_node_group = 1
    }
  }
  
  # Network Configuration
  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]
  
  # Security
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                = random_password.redis_auth_token.result
  kms_key_id               = aws_kms_key.utmify.arn
  
  # Backup Configuration
  snapshot_retention_limit = var.environment == "production" ? 7 : 1
  snapshot_window         = "03:00-05:00"
  
  # Maintenance
  maintenance_window       = "sun:05:00-sun:07:00"
  auto_minor_version_upgrade = true
  
  # Logging
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow.name
    destination_type = "cloudwatch-logs"
    log_format      = "text"
    log_type        = "slow-log"
  }
  
  tags = {
    Name = "${var.project_name}-${var.environment}-redis"
  }
}

# CloudWatch Log Group for Redis
resource "aws_cloudwatch_log_group" "redis_slow" {
  name              = "/aws/elasticache/${var.project_name}-${var.environment}-redis/slow-log"
  retention_in_days = var.log_retention_days
  kms_key_id        = aws_kms_key.utmify.arn
  
  tags = {
    Name = "${var.project_name}-${var.environment}-redis-slow-log"
  }
}

# Secrets Manager for Database Password
resource "aws_secretsmanager_secret" "db_password" {
  name                    = "${var.project_name}/${var.environment}/database/password"
  description             = "Database password for ${var.project_name} ${var.environment}"
  kms_key_id             = aws_kms_key.utmify.arn
  recovery_window_in_days = var.environment == "production" ? 30 : 0
  
  tags = {
    Name = "${var.project_name}-${var.environment}-db-password"
  }
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db_password.result
}

# Secrets Manager for Redis Auth Token
resource "aws_secretsmanager_secret" "redis_auth_token" {
  name                    = "${var.project_name}/${var.environment}/redis/auth-token"
  description             = "Redis auth token for ${var.project_name} ${var.environment}"
  kms_key_id             = aws_kms_key.utmify.arn
  recovery_window_in_days = var.environment == "production" ? 30 : 0
  
  tags = {
    Name = "${var.project_name}-${var.environment}-redis-auth-token"
  }
}

resource "aws_secretsmanager_secret_version" "redis_auth_token" {
  secret_id     = aws_secretsmanager_secret.redis_auth_token.id
  secret_string = random_password.redis_auth_token.result
}

# Secrets Manager for Application Secrets
resource "aws_secretsmanager_secret" "app_secrets" {
  name                    = "${var.project_name}/${var.environment}/application/secrets"
  description             = "Application secrets for ${var.project_name} ${var.environment}"
  kms_key_id             = aws_kms_key.utmify.arn
  recovery_window_in_days = var.environment == "production" ? 30 : 0
  
  tags = {
    Name = "${var.project_name}-${var.environment}-app-secrets"
  }
}

resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id
  secret_string = jsonencode({
    JWT_SECRET            = var.jwt_secret != "" ? var.jwt_secret : random_password.jwt_secret.result
    ENCRYPTION_KEY        = var.encryption_key != "" ? var.encryption_key : random_password.encryption_key.result
    SENTRY_DSN           = var.sentry_dsn
    STRIPE_SECRET_KEY    = var.stripe_secret_key
    STRIPE_WEBHOOK_SECRET = var.stripe_webhook_secret
    SMTP_HOST            = var.smtp_host
    SMTP_PORT            = tostring(var.smtp_port)
    SMTP_USERNAME        = var.smtp_username
    SMTP_PASSWORD        = var.smtp_password
  })
}

# Random passwords for secrets
resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

resource "random_password" "encryption_key" {
  length  = 32
  special = false
}

# CloudWatch Alarms for RDS
resource "aws_cloudwatch_metric_alarm" "database_cpu" {
  count = var.enable_monitoring ? 1 : 0
  
  alarm_name          = "${var.project_name}-${var.environment}-database-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "120"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors RDS CPU utilization"
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }
  
  tags = {
    Name = "${var.project_name}-${var.environment}-database-cpu-alarm"
  }
}

resource "aws_cloudwatch_metric_alarm" "database_connections" {
  count = var.enable_monitoring ? 1 : 0
  
  alarm_name          = "${var.project_name}-${var.environment}-database-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "120"
  statistic           = "Average"
  threshold           = "150"
  alarm_description   = "This metric monitors RDS connection count"
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }
  
  tags = {
    Name = "${var.project_name}-${var.environment}-database-connections-alarm"
  }
}

# CloudWatch Alarms for Redis
resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  count = var.enable_monitoring ? 1 : 0
  
  alarm_name          = "${var.project_name}-${var.environment}-redis-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = "120"
  statistic           = "Average"
  threshold           = "75"
  alarm_description   = "This metric monitors Redis CPU utilization"
  
  dimensions = {
    CacheClusterId = "${aws_elasticache_replication_group.main.replication_group_id}-001"
  }
  
  tags = {
    Name = "${var.project_name}-${var.environment}-redis-cpu-alarm"
  }
}

resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  count = var.enable_monitoring ? 1 : 0
  
  alarm_name          = "${var.project_name}-${var.environment}-redis-memory-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = "120"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "This metric monitors Redis memory utilization"
  
  dimensions = {
    CacheClusterId = "${aws_elasticache_replication_group.main.replication_group_id}-001"
  }
  
  tags = {
    Name = "${var.project_name}-${var.environment}-redis-memory-alarm"
  }
}