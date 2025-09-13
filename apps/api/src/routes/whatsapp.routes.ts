import type { FastifyInstance } from 'fastify'
import { WhatsAppController } from '../controllers/whatsapp.controller'
import { WhatsAppService } from '../services/whatsapp.service'
import { WhatsAppTemplateService } from '../services/whatsapp-template.service'
import { WhatsAppAutomationService } from '../services/whatsapp-automation.service'
import { PrismaService } from '../database/prisma.service'
import { CryptoService } from '../services/crypto.service'
import { authMiddleware } from '../middleware/auth.middleware'

// WhatsApp routes
export async function whatsappRoutes(app: FastifyInstance) {
  // Initialize services
  const prismaService = new PrismaService()
  const cryptoService = new CryptoService()
  const whatsappTemplateService = new WhatsAppTemplateService(prismaService)
  const whatsappAutomationService = new WhatsAppAutomationService(
    prismaService,
    null, // Bull queue will be injected
    null, // WhatsApp service will be injected
    whatsappTemplateService
  )
  // Simple config service for environment variables
  const configService = {
    get: (key: string, defaultValue?: any) => process.env[key] || defaultValue
  }
  
  const whatsappService = new WhatsAppService(
    prismaService,
    null, // Bull queue will be injected
    cryptoService,
    configService
  )
  const whatsappController = new WhatsAppController(
    whatsappService,
    whatsappTemplateService,
    whatsappAutomationService
  )

  // Apply auth middleware to all routes
  app.addHook('preHandler', authMiddleware)

  // Configuration routes
  app.get('/config', {
    schema: {
      tags: ['WhatsApp'],
      summary: 'Get WhatsApp configuration',
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            twilioAccountSid: { type: 'string' },
            twilioPhoneNumber: { type: 'string' },
            isActive: { type: 'boolean' },
            dailyLimit: { type: 'number' },
            messagesUsedToday: { type: 'number' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    return whatsappController.getConfig(request, reply)
  })

  app.put('/config', {
    schema: {
      tags: ['WhatsApp'],
      summary: 'Update WhatsApp configuration',
      body: {
        type: 'object',
        properties: {
          twilioAccountSid: { type: 'string' },
          twilioAuthToken: { type: 'string' },
          twilioPhoneNumber: { type: 'string' },
          dailyLimit: { type: 'number' },
          isActive: { type: 'boolean' }
        }
      }
    }
  }, async (request, reply) => {
    return whatsappController.updateConfig(request, reply)
  })

  app.post('/test-connection', {
    schema: {
      tags: ['WhatsApp'],
      summary: 'Test WhatsApp connection'
    }
  }, async (request, reply) => {
    return whatsappController.testConnection(request, reply)
  })

  // Message routes
  app.post('/send', {
    schema: {
      tags: ['WhatsApp'],
      summary: 'Send WhatsApp message',
      body: {
        type: 'object',
        required: ['to', 'message'],
        properties: {
          to: { type: 'string' },
          message: { type: 'string' },
          templateId: { type: 'string' },
          variables: { type: 'object' }
        }
      }
    }
  }, async (request, reply) => {
    return whatsappController.sendMessage(request, reply)
  })

  app.post('/broadcast', {
    schema: {
      tags: ['WhatsApp'],
      summary: 'Send broadcast message',
      body: {
        type: 'object',
        required: ['recipients'],
        properties: {
          recipients: {
            type: 'array',
            items: { type: 'string' }
          },
          message: { type: 'string' },
          templateId: { type: 'string' },
          variables: { type: 'object' }
        }
      }
    }
  }, async (request, reply) => {
    return whatsappController.broadcast(request, reply)
  })

  app.get('/messages', {
    schema: {
      tags: ['WhatsApp'],
      summary: 'Get messages',
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', default: 1 },
          limit: { type: 'number', default: 20 }
        }
      }
    }
  }, async (request, reply) => {
    return whatsappController.getMessages(request, reply)
  })

  // Template routes
  app.get('/templates', {
    schema: {
      tags: ['WhatsApp Templates'],
      summary: 'Get all templates'
    }
  }, async (request, reply) => {
    return whatsappController.getTemplates(request, reply)
  })

  app.post('/templates', {
    schema: {
      tags: ['WhatsApp Templates'],
      summary: 'Create template',
      body: {
        type: 'object',
        required: ['name', 'content', 'category'],
        properties: {
          name: { type: 'string' },
          content: { type: 'string' },
          category: {
            type: 'string',
            enum: ['sale', 'budget', 'report', 'welcome', 'custom']
          }
        }
      }
    }
  }, async (request, reply) => {
    return whatsappController.createTemplate(request, reply)
  })

  app.put('/templates/:id', {
    schema: {
      tags: ['WhatsApp Templates'],
      summary: 'Update template',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    return whatsappController.updateTemplate(request, reply)
  })

  app.delete('/templates/:id', {
    schema: {
      tags: ['WhatsApp Templates'],
      summary: 'Delete template'
    }
  }, async (request, reply) => {
    return whatsappController.deleteTemplate(request, reply)
  })

  app.post('/templates/:id/preview', {
    schema: {
      tags: ['WhatsApp Templates'],
      summary: 'Preview template with variables'
    }
  }, async (request, reply) => {
    return whatsappController.previewTemplate(request, reply)
  })

  // Conversation routes
  app.get('/conversations', {
    schema: {
      tags: ['WhatsApp Conversations'],
      summary: 'Get conversations'
    }
  }, async (request, reply) => {
    return whatsappController.getConversations(request, reply)
  })

  app.get('/conversations/:id', {
    schema: {
      tags: ['WhatsApp Conversations'],
      summary: 'Get conversation by ID'
    }
  }, async (request, reply) => {
    return whatsappController.getConversation(request, reply)
  })

  // Automation routes
  app.get('/automations', {
    schema: {
      tags: ['WhatsApp Automations'],
      summary: 'Get all automations'
    }
  }, async (request, reply) => {
    return whatsappController.getAutomations(request, reply)
  })

  app.post('/automations', {
    schema: {
      tags: ['WhatsApp Automations'],
      summary: 'Create automation'
    }
  }, async (request, reply) => {
    return whatsappController.createAutomation(request, reply)
  })

  app.put('/automations/:id', {
    schema: {
      tags: ['WhatsApp Automations'],
      summary: 'Update automation'
    }
  }, async (request, reply) => {
    return whatsappController.updateAutomation(request, reply)
  })

  app.delete('/automations/:id', {
    schema: {
      tags: ['WhatsApp Automations'],
      summary: 'Delete automation'
    }
  }, async (request, reply) => {
    return whatsappController.deleteAutomation(request, reply)
  })

  app.patch('/automations/:id/toggle', {
    schema: {
      tags: ['WhatsApp Automations'],
      summary: 'Toggle automation'
    }
  }, async (request, reply) => {
    return whatsappController.toggleAutomation(request, reply)
  })

  // Metrics routes
  app.get('/metrics', {
    schema: {
      tags: ['WhatsApp Metrics'],
      summary: 'Get metrics'
    }
  }, async (request, reply) => {
    return whatsappController.getMetrics(request, reply)
  })

  app.get('/stats', {
    schema: {
      tags: ['WhatsApp Stats'],
      summary: 'Get dashboard stats'
    }
  }, async (request, reply) => {
    return whatsappController.getDashboardStats(request, reply)
  })

  // Webhook routes (no auth required)
  app.register(async function (app) {
    app.post('/webhook', {
      schema: {
        tags: ['WhatsApp Webhook'],
        summary: 'WhatsApp webhook endpoint'
      }
    }, async (request, reply) => {
      // Webhook controller logic here
      return { received: true }
    })

    app.get('/webhook', {
      schema: {
        tags: ['WhatsApp Webhook'],
        summary: 'WhatsApp webhook verification'
      }
    }, async (request, reply) => {
      // Webhook verification logic here
      const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = request.query as any
      
      if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
        return challenge
      }
      
      reply.code(403).send('Forbidden')
    })
  }, { prefix: '/webhook' })
}