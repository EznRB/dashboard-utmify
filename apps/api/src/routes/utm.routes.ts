import { FastifyInstance } from 'fastify';
import { UTMController } from '../controllers/utm.controller';
import { UTMService } from '../services/utm.service';
import { requireAuth } from '../middleware/auth.middleware';

export async function utmRoutes(fastify: FastifyInstance) {
  // Initialize services
  const utmService = new UTMService();
  const utmController = new UTMController(utmService);

  // Apply authentication middleware to protected routes
  fastify.addHook('preHandler', async (request, reply) => {
    // Skip auth for redirect endpoint
    if (request.url.startsWith('/r/')) {
      return;
    }
    
    // Apply JWT auth for other endpoints
    await requireAuth(request, reply);
  });

  // UTM Management Routes
  fastify.post('/create', {
    schema: {
      description: 'Criar novo link UTM',
      tags: ['UTM'],
      body: {
        type: 'object',
        required: ['originalUrl'],
        properties: {
          originalUrl: { type: 'string', format: 'uri' },
          utmSource: { type: 'string' },
          utmMedium: { type: 'string' },
          utmCampaign: { type: 'string' },
          utmTerm: { type: 'string' },
          utmContent: { type: 'string' },
          customParams: { type: 'object' },
          title: { type: 'string' },
          description: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          expiresAt: { type: 'string', format: 'date-time' },
          isPublic: { type: 'boolean' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                shortCode: { type: 'string' },
                shortUrl: { type: 'string' },
                originalUrl: { type: 'string' },
                qrCodeUrl: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, utmController.createUTM.bind(utmController));

  fastify.get('/list', {
    schema: {
      description: 'Listar links UTM',
      tags: ['UTM'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', minimum: 1, default: 1 },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
          search: { type: 'string' },
          status: { type: 'string', enum: ['ACTIVE', 'PAUSED', 'ARCHIVED'] },
          utmSource: { type: 'string' },
          utmMedium: { type: 'string' },
          utmCampaign: { type: 'string' },
          sortBy: { type: 'string', enum: ['createdAt', 'clickCount', 'conversionCount', 'title'], default: 'createdAt' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  shortCode: { type: 'string' },
                  shortUrl: { type: 'string' },
                  originalUrl: { type: 'string' },
                  clickCount: { type: 'number' },
                  conversionCount: { type: 'number' },
                  status: { type: 'string' },
                  createdAt: { type: 'string' },
                },
              },
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number' },
                limit: { type: 'number' },
                total: { type: 'number' },
                totalPages: { type: 'number' },
              },
            },
          },
        },
      },
    },
  }, utmController.listUTM.bind(utmController));

  fastify.get('/:id/stats', {
    schema: {
      description: 'Obter estatísticas de um link UTM',
      tags: ['UTM'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          period: { type: 'string', enum: ['24h', '7d', '30d', '90d', 'all'], default: '30d' },
          groupBy: { type: 'string', enum: ['hour', 'day', 'week', 'month'], default: 'day' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                link: { type: 'object' },
                stats: {
                  type: 'object',
                  properties: {
                    totalClicks: { type: 'number' },
                    uniqueClicks: { type: 'number' },
                    conversions: { type: 'number' },
                    conversionRate: { type: 'number' },
                    clicksByCountry: { type: 'array' },
                    clicksByDevice: { type: 'array' },
                    clicksOverTime: { type: 'array' },
                  },
                },
              },
            },
          },
        },
      },
    },
  }, utmController.getUTMStats.bind(utmController));

  fastify.post('/shorten', {
    schema: {
      description: 'Encurtar URL',
      tags: ['UTM'],
      body: {
        type: 'object',
        required: ['url'],
        properties: {
          url: { type: 'string', format: 'uri' },
          customCode: { type: 'string', minLength: 3, maxLength: 20 },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                shortCode: { type: 'string' },
                shortUrl: { type: 'string' },
                originalUrl: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, utmController.shortenUrl.bind(utmController));

  fastify.post('/bulk', {
    schema: {
      description: 'Criação em massa de links UTM',
      tags: ['UTM'],
      body: {
        type: 'object',
        required: ['links'],
        properties: {
          links: {
            type: 'array',
            minItems: 1,
            maxItems: 100,
            items: {
              type: 'object',
              required: ['originalUrl'],
              properties: {
                originalUrl: { type: 'string', format: 'uri' },
                utmSource: { type: 'string' },
                utmMedium: { type: 'string' },
                utmCampaign: { type: 'string' },
                utmTerm: { type: 'string' },
                utmContent: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
              },
            },
          },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                created: { type: 'array' },
                failed: { type: 'array' },
                total: { type: 'number' },
              },
            },
          },
        },
      },
    },
  }, utmController.bulkCreateUTM.bind(utmController));

  fastify.put('/:id', {
    schema: {
      description: 'Atualizar link UTM',
      tags: ['UTM'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          status: { type: 'string', enum: ['ACTIVE', 'PAUSED', 'ARCHIVED'] },
          expiresAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  }, utmController.updateUTM.bind(utmController));

  fastify.delete('/:id', {
    schema: {
      description: 'Deletar link UTM',
      tags: ['UTM'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, utmController.deleteUTM.bind(utmController));

  fastify.post('/conversion', {
    schema: {
      description: 'Registrar conversão',
      tags: ['UTM'],
      body: {
        type: 'object',
        properties: {
          utmLinkId: { type: 'string' },
          shortCode: { type: 'string' },
          eventType: { type: 'string' },
          eventName: { type: 'string' },
          value: { type: 'number' },
          currency: { type: 'string' },
          customerId: { type: 'string' },
          customerEmail: { type: 'string', format: 'email' },
          metadata: { type: 'object' },
        },
      },
    },
  }, utmController.trackConversion.bind(utmController));

  fastify.get('/export', {
    schema: {
      description: 'Exportar dados UTM',
      tags: ['UTM'],
      querystring: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['csv', 'json', 'xlsx'], default: 'csv' },
          dateRange: { type: 'string', enum: ['last7days', 'last30days', 'last90days', 'custom'], default: 'last30days' },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          includeClicks: { type: 'boolean', default: true },
          includeConversions: { type: 'boolean', default: true },
          includeMetrics: { type: 'boolean', default: true },
          utmSource: { type: 'string' },
          utmMedium: { type: 'string' },
          utmCampaign: { type: 'string' },
        },
      },
    },
  }, utmController.exportData.bind(utmController));

  // Notification routes
  fastify.get('/notifications', {
    schema: {
      description: 'Get notification alerts for organization',
      tags: ['utm'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          unread_only: { type: 'boolean', default: false }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            alerts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  ruleId: { type: 'string' },
                  ruleName: { type: 'string' },
                  message: { type: 'string' },
                  severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                  utmLinkId: { type: 'string' },
                  utmCampaign: { type: 'string' },
                  data: { type: 'object' },
                  isRead: { type: 'boolean' },
                  createdAt: { type: 'string' }
                }
              }
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' }
              }
            }
          }
        }
      }
    }
  }, utmController.getNotifications.bind(utmController));

  fastify.post('/notifications/rules', {
    schema: {
      description: 'Create notification rule',
      tags: ['utm'],
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          isActive: { type: 'boolean', default: true },
          triggerType: { type: 'string', enum: ['click_threshold', 'conversion_rate', 'budget_limit', 'time_based', 'performance_drop'] },
          condition: {
            type: 'object',
            properties: {
              operator: { type: 'string', enum: ['greater_than', 'less_than', 'equals', 'between'] },
              value: { type: 'number' },
              secondValue: { type: 'number' },
              timeframe: { type: 'string', enum: ['hour', 'day', 'week', 'month'] }
            },
            required: ['operator', 'value']
          },
          channels: {
            type: 'array',
            items: { type: 'string', enum: ['email', 'sms', 'webhook', 'in_app'] }
          },
          recipients: {
            type: 'array',
            items: { type: 'string' }
          },
          message: { type: 'string' },
          utmCampaigns: {
            type: 'array',
            items: { type: 'string' }
          }
        },
        required: ['name', 'triggerType', 'condition', 'channels', 'recipients', 'message']
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, utmController.createNotificationRule.bind(utmController));

  fastify.get('/notifications/rules', {
    schema: {
      description: 'Get notification rules for organization',
      tags: ['utm'],
      response: {
        200: {
          type: 'object',
          properties: {
            rules: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                  isActive: { type: 'boolean' },
                  triggerType: { type: 'string' },
                  condition: { type: 'object' },
                  channels: { type: 'array', items: { type: 'string' } },
                  recipients: { type: 'array', items: { type: 'string' } },
                  message: { type: 'string' },
                  utmCampaigns: { type: 'array', items: { type: 'string' } },
                  createdAt: { type: 'string' },
                  lastTriggered: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, utmController.getNotificationRules.bind(utmController));

  fastify.put('/notifications/rules/:id', {
    schema: {
      description: 'Update notification rule',
      tags: ['utm'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          isActive: { type: 'boolean' },
          triggerType: { type: 'string', enum: ['click_threshold', 'conversion_rate', 'budget_limit', 'time_based', 'performance_drop'] },
          condition: {
            type: 'object',
            properties: {
              operator: { type: 'string', enum: ['greater_than', 'less_than', 'equals', 'between'] },
              value: { type: 'number' },
              secondValue: { type: 'number' },
              timeframe: { type: 'string', enum: ['hour', 'day', 'week', 'month'] }
            }
          },
          channels: {
            type: 'array',
            items: { type: 'string', enum: ['email', 'sms', 'webhook', 'in_app'] }
          },
          recipients: {
            type: 'array',
            items: { type: 'string' }
          },
          message: { type: 'string' },
          utmCampaigns: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        }
      }
    }
  }, utmController.updateNotificationRule.bind(utmController));

  fastify.delete('/notifications/rules/:id', {
    schema: {
      description: 'Delete notification rule',
      tags: ['utm'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        }
      }
    }
  }, utmController.deleteNotificationRule.bind(utmController));

  fastify.patch('/notifications/:id/read', {
    schema: {
      description: 'Mark notification as read',
      tags: ['utm'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        }
      }
    }
  }, utmController.markNotificationAsRead.bind(utmController));

  // Integration management routes
  fastify.get('/integrations', {
    schema: {
      tags: ['UTM Integrations'],
      summary: 'Get user integrations',
      querystring: {
        type: 'object',
        properties: {
          organizationId: { type: 'string' }
        },
        required: ['organizationId']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  type: { type: 'string' },
                  status: { type: 'string' },
                  config: { type: 'object' },
                  lastSync: { type: 'string' },
                  events: { type: 'array', items: { type: 'string' } }
                }
              }
            }
          }
        }
      }
    }
  }, utmController.getIntegrations.bind(utmController));

  fastify.post('/integrations', {
    schema: {
      tags: ['UTM Integrations'],
      summary: 'Create or update integration',
      body: {
        type: 'object',
        properties: {
          organizationId: { type: 'string' },
          type: { type: 'string', enum: ['google_analytics', 'facebook_pixel', 'google_ads', 'webhook'] },
          name: { type: 'string' },
          config: { type: 'object' },
          events: { type: 'array', items: { type: 'string' } },
          enabled: { type: 'boolean' }
        },
        required: ['organizationId', 'type', 'name', 'config']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, utmController.createIntegration.bind(utmController));

  fastify.put('/integrations/:id', {
    schema: {
      tags: ['UTM Integrations'],
      summary: 'Update integration',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          organizationId: { type: 'string' },
          name: { type: 'string' },
          config: { type: 'object' },
          events: { type: 'array', items: { type: 'string' } },
          enabled: { type: 'boolean' }
        },
        required: ['organizationId']
      }
    }
  }, utmController.updateIntegration.bind(utmController));

  fastify.delete('/integrations/:id', {
    schema: {
      tags: ['UTM Integrations'],
      summary: 'Delete integration',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      querystring: {
        type: 'object',
        properties: {
          organizationId: { type: 'string' }
        },
        required: ['organizationId']
      }
    }
  }, utmController.deleteIntegration.bind(utmController));

  fastify.post('/integrations/:id/test', {
    schema: {
      tags: ['UTM Integrations'],
      summary: 'Test integration connection',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          organizationId: { type: 'string' }
        },
        required: ['organizationId']
      }
    }
  }, utmController.testIntegration.bind(utmController));

  fastify.post('/integrations/send-event', {
    schema: {
      tags: ['UTM Integrations'],
      summary: 'Send event to integrations',
      body: {
        type: 'object',
        properties: {
          organizationId: { type: 'string' },
          eventType: { type: 'string' },
          eventData: { type: 'object' },
          utmLinkId: { type: 'string' }
        },
        required: ['organizationId', 'eventType', 'eventData']
      }
    }
  }, utmController.sendEventToIntegrations.bind(utmController));

  // Public redirect route (no authentication required)
  fastify.get('/r/:code', {
    schema: {
      description: 'Redirecionar e rastrear clique',
      tags: ['UTM'],
      params: {
        type: 'object',
        required: ['code'],
        properties: {
          code: { type: 'string' },
        },
      },
    },
    preHandler: [], // Override global auth middleware
  }, utmController.redirectAndTrack.bind(utmController));
}