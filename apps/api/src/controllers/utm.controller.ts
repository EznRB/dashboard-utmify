import { FastifyRequest, FastifyReply } from 'fastify';
import { UTMService } from '../services/utm.service';
import { ApiError } from '../utils/errors';
import { z } from 'zod';

// Validation schemas
const createUTMSchema = z.object({
  originalUrl: z.string().url('URL inválida'),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmTerm: z.string().optional(),
  utmContent: z.string().optional(),
  customParams: z.record(z.string()).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  expiresAt: z.string().datetime().optional(),
  isPublic: z.boolean().optional(),
});

const bulkCreateUTMSchema = z.object({
  links: z.array(createUTMSchema).min(1).max(100),
});

const shortenUrlSchema = z.object({
  url: z.string().url('URL inválida'),
  customCode: z.string().optional(),
});

const listUTMSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'ARCHIVED']).optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  sortBy: z.enum(['createdAt', 'clickCount', 'conversionCount', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export class UTMController {
  constructor(private utmService: UTMService) {}

  /**
   * POST /api/utm/create - Criar novo link UTM
   */
  async createUTM(request: FastifyRequest, reply: FastifyReply) {
    try {
      const organizationId = (request as any).organization?.id;
      const userId = (request as any).user?.id;
      
      if (!organizationId || !userId) {
        throw new ApiError('Authentication required', 'AUTH_REQUIRED', 401);
      }
      
      const validatedData = createUTMSchema.parse(request.body);
      
      const utmLink = await this.utmService.createUTMLink({
        ...validatedData,
        organizationId,
        userId,
      });

      return reply.status(201).send({
        success: true,
        data: utmLink,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Dados inválidos',
          details: error.errors,
        });
      }
      
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  }

  /**
   * GET /api/utm/list - Listar links UTM
   */
  async listUTM(request: FastifyRequest, reply: FastifyReply) {
    try {
      const organizationId = (request as any).organization?.id;
      
      if (!organizationId) {
        throw new ApiError('Authentication required', 'AUTH_REQUIRED', 401);
      }
      const query = listUTMSchema.parse(request.query);
      
      const result = await this.utmService.listUTMLinks(organizationId, query);

      return reply.send({
        success: true,
        data: result.links,
        pagination: {
          page: query.page,
          limit: query.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / query.limit),
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Parâmetros inválidos',
          details: error.errors,
        });
      }
      
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  }

  /**
   * GET /api/utm/:id/stats - Obter estatísticas de um link UTM
   */
  async getUTMStats(request: FastifyRequest, reply: FastifyReply) {
    try {
      const organizationId = (request as any).organization?.id;
      
      if (!organizationId) {
        throw new ApiError('Authentication required', 'AUTH_REQUIRED', 401);
      }
      const { id } = request.params;
      const { period = '30d', groupBy = 'day' } = request.query;
      
      const stats = await this.utmService.getUTMStats(organizationId, id, {
        period,
        groupBy,
      });

      if (!stats) {
        return reply.status(404).send({
          success: false,
          error: 'Link UTM não encontrado',
        });
      }

      return reply.send({
        success: true,
        data: stats,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  }

  /**
   * POST /api/utm/shorten - Encurtar URL
   */
  async shortenUrl(request: FastifyRequest, reply: FastifyReply) {
    try {
      const organizationId = (request as any).organization?.id;
      
      if (!organizationId) {
        throw new ApiError('Authentication required', 'AUTH_REQUIRED', 401);
      }
      const validatedData = shortenUrlSchema.parse(request.body);
      
      const shortLink = await this.utmService.shortenUrl({
        ...validatedData,
        organizationId,
      });

      return reply.status(201).send({
        success: true,
        data: shortLink,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Dados inválidos',
          details: error.errors,
        });
      }
      
      if (error.message === 'CUSTOM_CODE_EXISTS') {
        return reply.status(409).send({
          success: false,
          error: 'Código personalizado já existe',
        });
      }
      
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  }

  /**
   * GET /api/r/:code - Redirecionar e rastrear clique
   */
  async redirectAndTrack(
    request: FastifyRequest<{
      Params: { code: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { code } = request.params;
      const userAgent = request.headers['user-agent'];
      const referer = request.headers.referer;
      const ipAddress = request.ip;
      
      const result = await this.utmService.trackClickAndRedirect(code, {
        userAgent,
        referer,
        ipAddress,
      });

      if (!result) {
        return reply.status(404).send({
          success: false,
          error: 'Link não encontrado',
        });
      }

      // Redirect to original URL
      return reply.redirect(302, result.originalUrl);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  }

  /**
   * POST /api/utm/bulk - Criação em massa de links UTM
   */
  async bulkCreateUTM(request: FastifyRequest, reply: FastifyReply) {
    try {
      const organizationId = (request as any).organization?.id;
      const userId = (request as any).user?.id;
      
      if (!organizationId || !userId) {
        throw new ApiError('Authentication required', 'AUTH_REQUIRED', 401);
      }
      const validatedData = bulkCreateUTMSchema.parse(request.body);
      
      const results = await this.utmService.bulkCreateUTMLinks({
        links: validatedData.links,
        organizationId,
        userId,
      });

      return reply.status(201).send({
        success: true,
        data: {
          created: results.created,
          failed: results.failed,
          total: validatedData.links.length,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Dados inválidos',
          details: error.errors,
        });
      }
      
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  }

  /**
   * PUT /api/utm/:id - Atualizar link UTM
   */
  async updateUTM(request: FastifyRequest, reply: FastifyReply) {
    try {
      const organizationId = (request as any).organization?.id;
      
      if (!organizationId) {
        throw new ApiError('Authentication required', 'AUTH_REQUIRED', 401);
      }
      const { id } = request.params;
      
      const updatedLink = await this.utmService.updateUTMLink(organizationId, id, request.body);

      if (!updatedLink) {
        return reply.status(404).send({
          success: false,
          error: 'Link UTM não encontrado',
        });
      }

      return reply.send({
        success: true,
        data: updatedLink,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  }

  /**
   * DELETE /api/utm/:id - Deletar link UTM
   */
  async deleteUTM(request: FastifyRequest, reply: FastifyReply) {
    try {
      const organizationId = (request as any).organization?.id;
      
      if (!organizationId) {
        throw new ApiError('Authentication required', 'AUTH_REQUIRED', 401);
      }
      const { id } = request.params;
      
      const deleted = await this.utmService.deleteUTMLink(organizationId, id);

      if (!deleted) {
        return reply.status(404).send({
          success: false,
          error: 'Link UTM não encontrado',
        });
      }

      return reply.status(204).send();
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  }

  /**
   * POST /api/utm/conversion - Registrar conversão
   */
  async trackConversion(request: FastifyRequest, reply: FastifyReply) {
    try {
      const organizationId = (request as any).organization?.id;
      
      if (!organizationId) {
        throw new ApiError('Authentication required', 'AUTH_REQUIRED', 401);
      }
      const conversionData = request.body;
      
      const conversion = await this.utmService.trackConversion({
        ...conversionData,
        organizationId,
      });

      return reply.status(201).send({
        success: true,
        data: conversion,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  }

  /**
   * GET /api/utm/export - Exportar dados UTM
   */
  async exportData(request: FastifyRequest, reply: FastifyReply) {
    try {
      const organizationId = (request as any).organization?.id;
      
      if (!organizationId) {
        throw new ApiError('Authentication required', 'AUTH_REQUIRED', 401);
      }

      const query = request.query as any;
      const exportOptions = {
        format: query.format || 'csv',
        dateRange: query.dateRange || 'last30days',
        startDate: query.startDate,
        endDate: query.endDate,
        includeClicks: query.includeClicks !== 'false',
        includeConversions: query.includeConversions !== 'false',
        includeMetrics: query.includeMetrics !== 'false',
        utmSource: query.utmSource,
        utmMedium: query.utmMedium,
        utmCampaign: query.utmCampaign,
        organizationId,
      };

      const { data, filename, mimeType } = await this.utmService.exportData(exportOptions);

      reply.header('Content-Type', mimeType);
      reply.header('Content-Disposition', `attachment; filename="${filename}"`);
      
      return reply.send(data);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  }

  // Notification methods
  async getNotifications(request: FastifyRequest, reply: FastifyReply) {
    try {
      const organizationId = (request as any).organization?.id;
      
      if (!organizationId) {
        throw new ApiError('Authentication required', 'AUTH_REQUIRED', 401);
      }

      const { page = 1, limit = 20, unread_only = false } = request.query as any;
      
      const result = await this.utmService.getNotifications(organizationId, {
        page: parseInt(page),
        limit: parseInt(limit),
        unreadOnly: unread_only
      });

      return reply.send({
        success: true,
        data: result,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  }

  async createNotificationRule(request: FastifyRequest, reply: FastifyReply) {
    try {
      const organizationId = (request as any).organization?.id;
      
      if (!organizationId) {
        throw new ApiError('Authentication required', 'AUTH_REQUIRED', 401);
      }

      const ruleData = request.body as any;
      const ruleId = await this.utmService.createNotificationRule(organizationId, ruleData);

      return reply.status(201).send({
        success: true,
        data: {
          id: ruleId,
          message: 'Regra de notificação criada com sucesso'
        }
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  }

  async getNotificationRules(request: FastifyRequest, reply: FastifyReply) {
    try {
      const organizationId = (request as any).organization?.id;
      
      if (!organizationId) {
        throw new ApiError('Authentication required', 'AUTH_REQUIRED', 401);
      }

      const rules = await this.utmService.getNotificationRules(organizationId);
      return reply.send({
        success: true,
        data: rules,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  }

  async updateNotificationRule(request: FastifyRequest, reply: FastifyReply) {
    try {
      const organizationId = (request as any).organization?.id;
      
      if (!organizationId) {
        throw new ApiError('Authentication required', 'AUTH_REQUIRED', 401);
      }

      const { id } = request.params as any;
      const updateData = request.body as any;
      
      await this.utmService.updateNotificationRule(organizationId, id, updateData);
      return reply.send({
        success: true,
        message: 'Regra de notificação atualizada com sucesso'
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  }

  async deleteNotificationRule(request: FastifyRequest, reply: FastifyReply) {
    try {
      const organizationId = (request as any).organization?.id;
      
      if (!organizationId) {
        throw new ApiError('Authentication required', 'AUTH_REQUIRED', 401);
      }

      const { id } = request.params as any;
      await this.utmService.deleteNotificationRule(organizationId, id);
      return reply.send({
        success: true,
        message: 'Regra de notificação deletada com sucesso'
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  }

  async markNotificationAsRead(request: FastifyRequest, reply: FastifyReply) {
    try {
      const organizationId = (request as any).organization?.id;
      
      if (!organizationId) {
        throw new ApiError('Authentication required', 'AUTH_REQUIRED', 401);
      }

      const { id } = request.params as any;
      await this.utmService.markNotificationAsRead(organizationId, id);
      return reply.send({
        success: true,
        message: 'Notificação marcada como lida'
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  }

  // Integration management methods
  async getIntegrations(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { organizationId } = request.query as { organizationId: string };
      
      if (!organizationId) {
        return reply.status(400).send({
          success: false,
          error: 'Organization ID is required'
        });
      }

      const integrations = await this.utmService.getIntegrations(organizationId);
      
      reply.send({
        success: true,
        data: integrations
      });
    } catch (error) {
      reply.status(500).send({
        success: false,
        error: 'Failed to fetch integrations'
      });
    }
  }

  async createIntegration(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { organizationId, type, name, config, events, enabled } = request.body as {
        organizationId: string;
        type: string;
        name: string;
        config: Record<string, any>;
        events?: string[];
        enabled?: boolean;
      };
      const userId = (request as any).user?.id;
      
      if (!organizationId || !type || !name || !config) {
        return reply.status(400).send({
          success: false,
          error: 'Missing required fields'
        });
      }

      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'User authentication required'
        });
      }

      const integration = await this.utmService.createIntegration({
        organizationId,
        userId,
        type,
        name,
        config,
        events: events || [],
        enabled: enabled ?? true
      });
      
      reply.send({
        success: true,
        data: {
          id: integration.id,
          message: 'Integration created successfully'
        }
      });
    } catch (error) {
      reply.status(500).send({
        success: false,
        error: 'Failed to create integration'
      });
    }
  }

  async updateIntegration(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const { organizationId, accountName, config, isActive } = request.body as {
        organizationId: string;
        accountName?: string;
        config?: Record<string, any>;
        isActive?: boolean;
      };
      
      if (!organizationId) {
        return reply.status(400).send({
          success: false,
          error: 'Organization ID is required'
        });
      }

      const integration = await this.utmService.updateIntegration(id, {
        organizationId,
        accountName,
        config,
        isActive
      });
      
      reply.send({
        success: true,
        data: integration
      });
    } catch (error) {
      reply.status(500).send({
        success: false,
        error: 'Failed to update integration'
      });
    }
  }

  async deleteIntegration(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const { organizationId } = request.query as { organizationId: string };
      
      if (!organizationId) {
        return reply.status(400).send({
          success: false,
          error: 'Organization ID is required'
        });
      }

      await this.utmService.deleteIntegration(id, organizationId);
      
      reply.send({
        success: true,
        data: { message: 'Integration deleted successfully' }
      });
    } catch (error) {
      reply.status(500).send({
        success: false,
        error: 'Failed to delete integration'
      });
    }
  }

  async testIntegration(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const { organizationId } = request.body as { organizationId: string };
      
      if (!organizationId) {
        return reply.status(400).send({
          success: false,
          error: 'Organization ID is required'
        });
      }

      const result = await this.utmService.testIntegration(id, organizationId);
      
      reply.send({
        success: true,
        data: result
      });
    } catch (error) {
      reply.status(500).send({
        success: false,
        error: 'Failed to test integration'
      });
    }
  }

  async sendEventToIntegrations(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { organizationId, eventType, eventData, utmLinkId } = request.body as {
        organizationId: string;
        eventType: string;
        eventData: Record<string, any>;
        utmLinkId?: string;
      };
      
      if (!organizationId || !eventType || !eventData) {
        return reply.status(400).send({
          success: false,
          error: 'Missing required fields'
        });
      }

      const results = await this.utmService.sendEventToIntegrations({
        organizationId,
        eventType,
        eventData,
        utmLinkId
      });
      
      reply.send({
        success: true,
        data: results
      });
    } catch (error) {
      reply.status(500).send({
        success: false,
        error: 'Failed to send event to integrations'
      });
    }
  }

  async generateSessionId(request: FastifyRequest, reply: FastifyReply) {
    try {
      const sessionId = crypto.randomUUID();
      
      reply.send({
        success: true,
        data: { sessionId }
      });
    } catch (error) {
      reply.status(500).send({
        success: false,
        error: 'Failed to generate session ID'
      });
    }
  }
}