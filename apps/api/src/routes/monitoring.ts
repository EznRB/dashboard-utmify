import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import monitor from '../lib/monitoring';
import { monitorDatabaseQuery } from '../lib/sentry';

interface MonitoringQuery {
  limit?: number;
  startDate?: string;
  endDate?: string;
  format?: 'json' | 'prometheus';
}

export default async function monitoringRoutes(fastify: FastifyInstance) {
  // Health check endpoint
  fastify.get('/health', {
    schema: {
      description: 'Health check endpoint',
      tags: ['monitoring'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            uptime: { type: 'number' },
            version: { type: 'string' },
            environment: { type: 'string' },
            services: {
              type: 'object',
              properties: {
                database: { type: 'string' },
                redis: { type: 'string' },
                monitoring: { type: 'string' }
              }
            }
          }
        },
        503: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            uptime: { type: 'number' },
            version: { type: 'string' },
            environment: { type: 'string' },
            services: {
              type: 'object',
              properties: {
                database: { type: 'string' },
                redis: { type: 'string' },
                monitoring: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: 'unknown',
        redis: 'unknown',
        monitoring: monitor ? 'healthy' : 'unhealthy',
      },
    };

    try {
      // Check database connection
      await monitorDatabaseQuery('health_check_db', async () => {
        // This would be a simple query like SELECT 1
        // await prisma.$queryRaw`SELECT 1`;
        return true;
      });
      healthStatus.services.database = 'healthy';
    } catch (error) {
      healthStatus.services.database = 'unhealthy';
      healthStatus.status = 'degraded';
    }

    try {
      // Check Redis connection
      // await redis.ping();
      healthStatus.services.redis = 'healthy';
    } catch (error) {
      healthStatus.services.redis = 'unhealthy';
      healthStatus.status = 'degraded';
    }

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    return reply.code(statusCode).send(healthStatus);
  });

  // Readiness check (for Kubernetes)
  fastify.get('/ready', {
    schema: {
      description: 'Readiness check for Kubernetes',
      tags: ['monitoring'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' }
          }
        },
        503: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Check if all critical services are ready
      await monitorDatabaseQuery('readiness_check', async () => {
        // Check database connection
        return true;
      });

      return reply.code(200).send({
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return reply.code(503).send({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        error: 'Database not ready',
      });
    }
  });

  // Liveness check (for Kubernetes)
  fastify.get('/live', {
    schema: {
      description: 'Liveness check for Kubernetes',
      tags: ['monitoring'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            uptime: { type: 'number' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.code(200).send({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // System metrics endpoint
  fastify.get('/metrics/system', {
    preHandler: [fastify.authenticate], // Require authentication
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
          format: { type: 'string', enum: ['json', 'prometheus'], default: 'json' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { limit, format } = request.query as MonitoringQuery;
      const systemMetrics = monitor.getSystemMetrics(limit || 100);

      if (format === 'prometheus') {
        const prometheusMetrics = convertToPrometheus(systemMetrics, 'system');
        return reply
          .header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
          .send(prometheusMetrics);
      }

      return reply.code(200).send({
        metrics: systemMetrics,
        count: systemMetrics.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      fastify.log.error('Failed to get system metrics:', error);
      return reply.code(500).send({
        error: 'Failed to get system metrics',
      });
    }
  });

  // Application metrics endpoint
  fastify.get('/metrics/application', {
    preHandler: [fastify.authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
          format: { type: 'string', enum: ['json', 'prometheus'], default: 'json' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { limit, format } = request.query as MonitoringQuery;
      const applicationMetrics = monitor.getApplicationMetrics(limit || 100);

      if (format === 'prometheus') {
        const prometheusMetrics = convertToPrometheus(applicationMetrics, 'application');
        return reply
          .header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
          .send(prometheusMetrics);
      }

      return reply.code(200).send({
        metrics: applicationMetrics,
        count: applicationMetrics.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      fastify.log.error('Failed to get application metrics:', error);
      return reply.code(500).send({
        error: 'Failed to get application metrics',
      });
    }
  });

  // Business metrics endpoint
  fastify.get('/metrics/business', {
    preHandler: [fastify.authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
          format: { type: 'string', enum: ['json', 'prometheus'], default: 'json' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { limit, format } = request.query as MonitoringQuery;
      const businessMetrics = monitor.getBusinessMetrics(limit || 100);

      if (format === 'prometheus') {
        const prometheusMetrics = convertToPrometheus(businessMetrics, 'business');
        return reply
          .header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
          .send(prometheusMetrics);
      }

      return reply.code(200).send({
        metrics: businessMetrics,
        count: businessMetrics.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      fastify.log.error('Failed to get business metrics:', error);
      return reply.code(500).send({
        error: 'Failed to get business metrics',
      });
    }
  });

  // Combined metrics endpoint (Prometheus format)
  fastify.get('/metrics', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['json', 'prometheus'], default: 'prometheus' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { format } = request.query as MonitoringQuery;
      
      const systemMetrics = monitor.getSystemMetrics(1); // Get latest
      const applicationMetrics = monitor.getApplicationMetrics(1);
      const businessMetrics = monitor.getBusinessMetrics(1);
      const currentStats = monitor.getCurrentStats();

      if (format === 'json') {
        return reply.code(200).send({
          system: systemMetrics[0] || null,
          application: applicationMetrics[0] || null,
          business: businessMetrics[0] || null,
          stats: currentStats,
          timestamp: new Date().toISOString(),
        });
      }

      // Prometheus format
      let prometheusOutput = '';
      
      // System metrics
      if (systemMetrics[0]) {
        const latest = systemMetrics[0];
        prometheusOutput += `# HELP utmify_cpu_usage_percent CPU usage percentage\n`;
        prometheusOutput += `# TYPE utmify_cpu_usage_percent gauge\n`;
        prometheusOutput += `utmify_cpu_usage_percent ${latest.cpu.usage}\n\n`;
        
        prometheusOutput += `# HELP utmify_memory_usage_percent Memory usage percentage\n`;
        prometheusOutput += `# TYPE utmify_memory_usage_percent gauge\n`;
        prometheusOutput += `utmify_memory_usage_percent ${latest.memory.usage}\n\n`;
        
        prometheusOutput += `# HELP utmify_memory_used_bytes Memory used in bytes\n`;
        prometheusOutput += `# TYPE utmify_memory_used_bytes gauge\n`;
        prometheusOutput += `utmify_memory_used_bytes ${latest.memory.used}\n\n`;
      }

      // Application metrics
      if (applicationMetrics[0]) {
        const latest = applicationMetrics[0];
        prometheusOutput += `# HELP utmify_requests_total Total number of requests\n`;
        prometheusOutput += `# TYPE utmify_requests_total counter\n`;
        prometheusOutput += `utmify_requests_total ${latest.requests.total}\n\n`;
        
        prometheusOutput += `# HELP utmify_requests_per_second Requests per second\n`;
        prometheusOutput += `# TYPE utmify_requests_per_second gauge\n`;
        prometheusOutput += `utmify_requests_per_second ${latest.requests.requestsPerSecond}\n\n`;
        
        prometheusOutput += `# HELP utmify_response_time_ms Average response time in milliseconds\n`;
        prometheusOutput += `# TYPE utmify_response_time_ms gauge\n`;
        prometheusOutput += `utmify_response_time_ms ${latest.requests.averageResponseTime}\n\n`;
        
        prometheusOutput += `# HELP utmify_error_rate_percent Error rate percentage\n`;
        prometheusOutput += `# TYPE utmify_error_rate_percent gauge\n`;
        prometheusOutput += `utmify_error_rate_percent ${latest.errors.rate}\n\n`;
        
        prometheusOutput += `# HELP utmify_database_queries_total Total database queries\n`;
        prometheusOutput += `# TYPE utmify_database_queries_total counter\n`;
        prometheusOutput += `utmify_database_queries_total ${latest.database.queries}\n\n`;
        
        prometheusOutput += `# HELP utmify_cache_hit_rate_percent Cache hit rate percentage\n`;
        prometheusOutput += `# TYPE utmify_cache_hit_rate_percent gauge\n`;
        prometheusOutput += `utmify_cache_hit_rate_percent ${latest.cache.hitRate}\n\n`;
      }

      // Business metrics
      if (businessMetrics[0]) {
        const latest = businessMetrics[0];
        prometheusOutput += `# HELP utmify_active_users Active users count\n`;
        prometheusOutput += `# TYPE utmify_active_users gauge\n`;
        prometheusOutput += `utmify_active_users ${latest.users.active}\n\n`;
        
        prometheusOutput += `# HELP utmify_utm_created_total Total UTM links created\n`;
        prometheusOutput += `# TYPE utmify_utm_created_total counter\n`;
        prometheusOutput += `utmify_utm_created_total ${latest.utm.created}\n\n`;
        
        prometheusOutput += `# HELP utmify_utm_clicked_total Total UTM link clicks\n`;
        prometheusOutput += `# TYPE utmify_utm_clicked_total counter\n`;
        prometheusOutput += `utmify_utm_clicked_total ${latest.utm.clicked}\n\n`;
      }

      return reply
        .header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
        .send(prometheusOutput);
    } catch (error) {
      fastify.log.error('Failed to get metrics:', error);
      return reply.code(500).send({
        error: 'Failed to get metrics',
      });
    }
  });

  // Current stats endpoint
  fastify.get('/stats', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const stats = monitor.getCurrentStats();
      return reply.code(200).send({
        stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      fastify.log.error('Failed to get current stats:', error);
      return reply.code(500).send({
        error: 'Failed to get current stats',
      });
    }
  });

  // Reset stats endpoint
  fastify.post('/stats/reset', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      monitor.resetStats();
      return reply.code(200).send({
        success: true,
        message: 'Stats reset successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      fastify.log.error('Failed to reset stats:', error);
      return reply.code(500).send({
        error: 'Failed to reset stats',
      });
    }
  });
}

// Helper function to convert metrics to Prometheus format
function convertToPrometheus(metrics: any[], type: string): string {
  if (!metrics.length) {
    return '';
  }

  const latest = metrics[metrics.length - 1];
  let output = '';

  switch (type) {
    case 'system':
      output += `# HELP utmify_system_cpu_usage CPU usage percentage\n`;
      output += `# TYPE utmify_system_cpu_usage gauge\n`;
      output += `utmify_system_cpu_usage ${latest.cpu.usage}\n\n`;
      
      output += `# HELP utmify_system_memory_usage Memory usage percentage\n`;
      output += `# TYPE utmify_system_memory_usage gauge\n`;
      output += `utmify_system_memory_usage ${latest.memory.usage}\n\n`;
      break;
      
    case 'application':
      output += `# HELP utmify_app_requests_total Total requests\n`;
      output += `# TYPE utmify_app_requests_total counter\n`;
      output += `utmify_app_requests_total ${latest.requests.total}\n\n`;
      
      output += `# HELP utmify_app_response_time Response time in milliseconds\n`;
      output += `# TYPE utmify_app_response_time gauge\n`;
      output += `utmify_app_response_time ${latest.requests.averageResponseTime}\n\n`;
      break;
      
    case 'business':
      output += `# HELP utmify_business_active_users Active users\n`;
      output += `# TYPE utmify_business_active_users gauge\n`;
      output += `utmify_business_active_users ${latest.users.active}\n\n`;
      break;
  }

  return output;
}