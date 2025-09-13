# Utmify Infrastructure - Auto Scaling Configuration
# This file contains auto scaling configurations for ECS services

# Auto Scaling Target for API Service
resource "aws_appautoscaling_target" "api" {
  count = var.enable_auto_scaling ? 1 : 0
  
  max_capacity       = var.api_max_capacity
  min_capacity       = var.api_min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.api.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
  
  tags = {
    Name = "${var.project_name}-${var.environment}-api-autoscaling-target"
  }
}

# Auto Scaling Target for Web Service
resource "aws_appautoscaling_target" "web" {
  count = var.enable_auto_scaling ? 1 : 0
  
  max_capacity       = var.web_max_capacity
  min_capacity       = var.web_min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.web.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
  
  tags = {
    Name = "${var.project_name}-${var.environment}-web-autoscaling-target"
  }
}

# Auto Scaling Policy - API CPU Scale Up
resource "aws_appautoscaling_policy" "api_scale_up_cpu" {
  count = var.enable_auto_scaling ? 1 : 0
  
  name               = "${var.project_name}-${var.environment}-api-scale-up-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.api[0].resource_id
  scalable_dimension = aws_appautoscaling_target.api[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.api[0].service_namespace
  
  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    
    target_value       = var.scale_up_cpu_threshold
    scale_out_cooldown = 300
    scale_in_cooldown  = 300
  }
}

# Auto Scaling Policy - API Memory Scale Up
resource "aws_appautoscaling_policy" "api_scale_up_memory" {
  count = var.enable_auto_scaling ? 1 : 0
  
  name               = "${var.project_name}-${var.environment}-api-scale-up-memory"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.api[0].resource_id
  scalable_dimension = aws_appautoscaling_target.api[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.api[0].service_namespace
  
  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    
    target_value       = var.scale_up_memory_threshold
    scale_out_cooldown = 300
    scale_in_cooldown  = 300
  }
}

# Auto Scaling Policy - Web CPU Scale Up
resource "aws_appautoscaling_policy" "web_scale_up_cpu" {
  count = var.enable_auto_scaling ? 1 : 0
  
  name               = "${var.project_name}-${var.environment}-web-scale-up-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.web[0].resource_id
  scalable_dimension = aws_appautoscaling_target.web[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.web[0].service_namespace
  
  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    
    target_value       = var.scale_up_cpu_threshold
    scale_out_cooldown = 300
    scale_in_cooldown  = 300
  }
}

# Auto Scaling Policy - Web Memory Scale Up
resource "aws_appautoscaling_policy" "web_scale_up_memory" {
  count = var.enable_auto_scaling ? 1 : 0
  
  name               = "${var.project_name}-${var.environment}-web-scale-up-memory"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.web[0].resource_id
  scalable_dimension = aws_appautoscaling_target.web[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.web[0].service_namespace
  
  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    
    target_value       = var.scale_up_memory_threshold
    scale_out_cooldown = 300
    scale_in_cooldown  = 300
  }
}

# Scheduled Scaling - Scale Down at Night (optional)
resource "aws_appautoscaling_scheduled_action" "api_scale_down_night" {
  count = var.enable_scheduled_scaling ? 1 : 0
  
  name               = "${var.project_name}-${var.environment}-api-scale-down-night"
  service_namespace  = aws_appautoscaling_target.api[0].service_namespace
  resource_id        = aws_appautoscaling_target.api[0].resource_id
  scalable_dimension = aws_appautoscaling_target.api[0].scalable_dimension
  
  schedule = "cron(0 22 * * ? *)"
  
  scalable_target_action {
    min_capacity = 1
    max_capacity = var.api_max_capacity
  }
  
  timezone = "UTC"
}

# Scheduled Scaling - Scale Up in the Morning (optional)
resource "aws_appautoscaling_scheduled_action" "api_scale_up_morning" {
  count = var.enable_scheduled_scaling ? 1 : 0
  
  name               = "${var.project_name}-${var.environment}-api-scale-up-morning"
  service_namespace  = aws_appautoscaling_target.api[0].service_namespace
  resource_id        = aws_appautoscaling_target.api[0].resource_id
  scalable_dimension = aws_appautoscaling_target.api[0].scalable_dimension
  
  schedule = "cron(0 6 * * ? *)"
  
  scalable_target_action {
    min_capacity = var.api_min_capacity
    max_capacity = var.api_max_capacity
  }
  
  timezone = "UTC"
}

# Scheduled Scaling - Web Scale Down at Night (optional)
resource "aws_appautoscaling_scheduled_action" "web_scale_down_night" {
  count = var.enable_scheduled_scaling ? 1 : 0
  
  name               = "${var.project_name}-${var.environment}-web-scale-down-night"
  service_namespace  = aws_appautoscaling_target.web[0].service_namespace
  resource_id        = aws_appautoscaling_target.web[0].resource_id
  scalable_dimension = aws_appautoscaling_target.web[0].scalable_dimension
  
  schedule = "cron(0 22 * * ? *)"
  
  scalable_target_action {
    min_capacity = 1
    max_capacity = var.web_max_capacity
  }
  
  timezone = "UTC"
}

# Scheduled Scaling - Web Scale Up in the Morning (optional)
resource "aws_appautoscaling_scheduled_action" "web_scale_up_morning" {
  count = var.enable_scheduled_scaling ? 1 : 0
  
  name               = "${var.project_name}-${var.environment}-web-scale-up-morning"
  service_namespace  = aws_appautoscaling_target.web[0].service_namespace
  resource_id        = aws_appautoscaling_target.web[0].resource_id
  scalable_dimension = aws_appautoscaling_target.web[0].scalable_dimension
  
  schedule = "cron(0 6 * * ? *)"
  
  scalable_target_action {
    min_capacity = var.web_min_capacity
    max_capacity = var.web_max_capacity
  }
  
  timezone = "UTC"
}

# CloudWatch Alarms for Auto Scaling
resource "aws_cloudwatch_metric_alarm" "api_high_cpu" {
  count = var.enable_monitoring ? 1 : 0
  
  alarm_name          = "${var.project_name}-${var.environment}-api-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "This metric monitors API service CPU utilization"
  
  dimensions = {
    ServiceName = aws_ecs_service.api.name
    ClusterName = aws_ecs_cluster.main.name
  }
  
  tags = {
    Name = "${var.project_name}-${var.environment}-api-high-cpu-alarm"
  }
}

resource "aws_cloudwatch_metric_alarm" "api_high_memory" {
  count = var.enable_monitoring ? 1 : 0
  
  alarm_name          = "${var.project_name}-${var.environment}-api-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "This metric monitors API service memory utilization"
  
  dimensions = {
    ServiceName = aws_ecs_service.api.name
    ClusterName = aws_ecs_cluster.main.name
  }
  
  tags = {
    Name = "${var.project_name}-${var.environment}-api-high-memory-alarm"
  }
}

resource "aws_cloudwatch_metric_alarm" "web_high_cpu" {
  count = var.enable_monitoring ? 1 : 0
  
  alarm_name          = "${var.project_name}-${var.environment}-web-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "This metric monitors Web service CPU utilization"
  
  dimensions = {
    ServiceName = aws_ecs_service.web.name
    ClusterName = aws_ecs_cluster.main.name
  }
  
  tags = {
    Name = "${var.project_name}-${var.environment}-web-high-cpu-alarm"
  }
}

resource "aws_cloudwatch_metric_alarm" "web_high_memory" {
  count = var.enable_monitoring ? 1 : 0
  
  alarm_name          = "${var.project_name}-${var.environment}-web-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "This metric monitors Web service memory utilization"
  
  dimensions = {
    ServiceName = aws_ecs_service.web.name
    ClusterName = aws_ecs_cluster.main.name
  }
  
  tags = {
    Name = "${var.project_name}-${var.environment}-web-high-memory-alarm"
  }
}

# CloudWatch Alarms for Load Balancer
resource "aws_cloudwatch_metric_alarm" "alb_response_time" {
  count = var.enable_monitoring ? 1 : 0
  
  alarm_name          = "${var.project_name}-${var.environment}-alb-response-time"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Average"
  threshold           = "2"
  alarm_description   = "This metric monitors ALB response time"
  
  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }
  
  tags = {
    Name = "${var.project_name}-${var.environment}-alb-response-time-alarm"
  }
}

resource "aws_cloudwatch_metric_alarm" "alb_5xx_errors" {
  count = var.enable_monitoring ? 1 : 0
  
  alarm_name          = "${var.project_name}-${var.environment}-alb-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HTTPCode_ELB_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors ALB 5XX errors"
  treat_missing_data  = "notBreaching"
  
  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }
  
  tags = {
    Name = "${var.project_name}-${var.environment}-alb-5xx-errors-alarm"
  }
}

resource "aws_cloudwatch_metric_alarm" "api_target_5xx_errors" {
  count = var.enable_monitoring ? 1 : 0
  
  alarm_name          = "${var.project_name}-${var.environment}-api-target-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "This metric monitors API target 5XX errors"
  treat_missing_data  = "notBreaching"
  
  dimensions = {
    TargetGroup = aws_lb_target_group.api.arn_suffix
  }
  
  tags = {
    Name = "${var.project_name}-${var.environment}-api-target-5xx-errors-alarm"
  }
}

resource "aws_cloudwatch_metric_alarm" "web_target_5xx_errors" {
  count = var.enable_monitoring ? 1 : 0
  
  alarm_name          = "${var.project_name}-${var.environment}-web-target-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "This metric monitors Web target 5XX errors"
  treat_missing_data  = "notBreaching"
  
  dimensions = {
    TargetGroup = aws_lb_target_group.web.arn_suffix
  }
  
  tags = {
    Name = "${var.project_name}-${var.environment}-web-target-5xx-errors-alarm"
  }
}

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "main" {
  count = var.enable_monitoring ? 1 : 0
  
  dashboard_name = "${var.project_name}-${var.environment}-dashboard"
  
  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        
        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ServiceName", aws_ecs_service.api.name, "ClusterName", aws_ecs_cluster.main.name],
            [".", "MemoryUtilization", ".", ".", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "API Service - CPU & Memory Utilization"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        
        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ServiceName", aws_ecs_service.web.name, "ClusterName", aws_ecs_cluster.main.name],
            [".", "MemoryUtilization", ".", ".", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Web Service - CPU & Memory Utilization"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", aws_lb.main.arn_suffix],
            [".", "TargetResponseTime", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Load Balancer - Requests & Response Time"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        
        properties = {
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", aws_db_instance.main.id],
            [".", "DatabaseConnections", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "RDS - CPU & Connections"
          period  = 300
        }
      }
    ]
  })
}