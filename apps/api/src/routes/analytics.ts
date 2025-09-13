import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { monitorDatabaseQuery, addBreadcrumb } from '../lib/sentry';

// Validation schemas
const analyticsEventSchema = z.object({
  name: z.string().min(1).max(100),
  properties: z.record(z.any()).optional(),
  userId: z.string().optional(),
  timestamp: z.number().optional(),
  sessionId: z.string().optional(),
  deviceId: z.string().optional(),
});

const batchAnalyticsSchema = z.object({
  events: z.array(analyticsEventSchema).max(100),
});

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  userId?: string;
  timestamp?: number;
  sessionId?: string;
  deviceId?: string;
}

interface AnalyticsRequest extends FastifyRequest {
  body: AnalyticsEvent | { events: AnalyticsEvent[] };
}

export default async function analyticsRoutes(fastify: FastifyInstance) {
  // Single event tracking
  fastify.post('/analytics', {
    schema: {
      body: analyticsEventSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            eventId: { type: 'string' },
          },
        },
      },
    },
  }, async (request: AnalyticsRequest, reply: FastifyReply) => {
    try {
      const event = request.body as AnalyticsEvent;
      const eventId = await processAnalyticsEvent(event, request);
      
      addBreadcrumb('Analytics event processed', 'analytics', {
        eventName: event.name,
        eventId,
      });
      
      return reply.code(200).send({
        success: true,
        eventId,
      });
    } catch (error) {
      fastify.log.error('Failed to process analytics event:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to process analytics event',
      });
    }
  });

  // Batch event tracking
  fastify.post('/analytics/batch', {
    schema: {
      body: batchAnalyticsSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            processedCount: { type: 'number' },
            eventIds: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  }, async (request: AnalyticsRequest, reply: FastifyReply) => {
    try {
      const { events } = request.body as { events: AnalyticsEvent[] };
      const eventIds: string[] = [];
      
      for (const event of events) {
        try {
          const eventId = await processAnalyticsEvent(event, request);
          eventIds.push(eventId);
        } catch (error) {
          fastify.log.error('Failed to process batch event:', error);
          // Continue processing other events
        }
      }
      
      addBreadcrumb('Batch analytics events processed', 'analytics', {
        totalEvents: events.length,
        processedCount: eventIds.length,
      });
      
      return reply.code(200).send({
        success: true,
        processedCount: eventIds.length,
        eventIds,
      });
    } catch (error) {
      fastify.log.error('Failed to process batch analytics events:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to process batch analytics events',
      });
    }
  });

  // Analytics dashboard data
  fastify.get('/analytics/dashboard', {
    preHandler: [fastify.authenticate], // Require authentication
    schema: {
      querystring: {
        type: 'object',
        properties: {
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          userId: { type: 'string' },
          eventName: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { startDate, endDate, userId, eventName } = request.query as any;
      
      const dashboardData = await monitorDatabaseQuery(
        'get_analytics_dashboard',
        () => getAnalyticsDashboard({
          startDate: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: endDate ? new Date(endDate) : new Date(),
          userId,
          eventName,
        })
      );
      
      return reply.code(200).send(dashboardData);
    } catch (error) {
      fastify.log.error('Failed to get analytics dashboard:', error);
      return reply.code(500).send({
        error: 'Failed to get analytics dashboard',
      });
    }
  });

  // User analytics
  fastify.get('/analytics/users/:userId', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId } = request.params as { userId: string };
      const { startDate, endDate } = request.query as any;
      
      const userAnalytics = await monitorDatabaseQuery(
        'get_user_analytics',
        () => getUserAnalytics(userId, {
          startDate: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: endDate ? new Date(endDate) : new Date(),
        })
      );
      
      return reply.code(200).send(userAnalytics);
    } catch (error) {
      fastify.log.error('Failed to get user analytics:', error);
      return reply.code(500).send({
        error: 'Failed to get user analytics',
      });
    }
  });

  // Event metrics
  fastify.get('/analytics/events/:eventName/metrics', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { eventName } = request.params as { eventName: string };
      const { startDate, endDate, groupBy } = request.query as any;
      
      const eventMetrics = await monitorDatabaseQuery(
        'get_event_metrics',
        () => getEventMetrics(eventName, {
          startDate: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: endDate ? new Date(endDate) : new Date(),
          groupBy: groupBy || 'day',
        })
      );
      
      return reply.code(200).send(eventMetrics);
    } catch (error) {
      fastify.log.error('Failed to get event metrics:', error);
      return reply.code(500).send({
        error: 'Failed to get event metrics',
      });
    }
  });
}

// Helper functions
async function processAnalyticsEvent(event: AnalyticsEvent, request: FastifyRequest): Promise<string> {
  const eventId = generateEventId();
  const timestamp = event.timestamp || Date.now();
  const ipAddress = request.ip;
  const userAgent = request.headers['user-agent'];
  
  // Enrich event with request metadata
  const enrichedEvent = {
    ...event,
    id: eventId,
    timestamp,
    ipAddress,
    userAgent,
    createdAt: new Date(),
  };
  
  // Store in database
  await storeAnalyticsEvent(enrichedEvent);
  
  // Process real-time analytics if needed
  await processRealTimeAnalytics(enrichedEvent);
  
  return eventId;
}

async function storeAnalyticsEvent(event: any): Promise<void> {
  // This would typically use your database client (Prisma, etc.)
  // For now, we'll use a placeholder implementation
  
  try {
    // Example with Prisma (uncomment when Prisma is set up)
    /*
    await prisma.analyticsEvent.create({
      data: {
        id: event.id,
        name: event.name,
        properties: event.properties || {},
        userId: event.userId,
        sessionId: event.sessionId,
        deviceId: event.deviceId,
        timestamp: new Date(event.timestamp),
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
      },
    });
    */
    
    // Placeholder: Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Analytics event stored:', event);
    }
  } catch (error) {
    console.error('Failed to store analytics event:', error);
    throw error;
  }
}

async function processRealTimeAnalytics(event: any): Promise<void> {
  // Process real-time analytics (e.g., update counters, trigger alerts)
  // This could involve Redis, WebSocket notifications, etc.
  
  try {
    // Example: Update real-time counters
    if (event.name === 'utm_clicked') {
      // Increment UTM click counter
      // await redis.incr(`utm_clicks:${event.properties.utm_id}`);
    }
    
    if (event.name === 'page_view') {
      // Update active users counter
      // await redis.sadd('active_users', event.userId);
    }
  } catch (error) {
    console.error('Failed to process real-time analytics:', error);
    // Don't throw here to avoid failing the main event processing
  }
}

async function getAnalyticsDashboard(filters: {
  startDate: Date;
  endDate: Date;
  userId?: string;
  eventName?: string;
}) {
  // This would query your database for dashboard metrics
  // Placeholder implementation
  return {
    totalEvents: 0,
    uniqueUsers: 0,
    topEvents: [],
    eventsByDay: [],
    usersByDay: [],
    conversionRates: {},
  };
}

async function getUserAnalytics(userId: string, filters: {
  startDate: Date;
  endDate: Date;
}) {
  // This would query user-specific analytics
  // Placeholder implementation
  return {
    userId,
    totalEvents: 0,
    lastActive: null,
    topEvents: [],
    sessionCount: 0,
    averageSessionDuration: 0,
  };
}

async function getEventMetrics(eventName: string, filters: {
  startDate: Date;
  endDate: Date;
  groupBy: string;
}) {
  // This would query event-specific metrics
  // Placeholder implementation
  return {
    eventName,
    totalCount: 0,
    uniqueUsers: 0,
    averagePropertiesValues: {},
    timeSeriesData: [],
  };
}

function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}