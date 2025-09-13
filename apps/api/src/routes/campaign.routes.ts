import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware, organizationMiddleware } from '../middleware/auth.middleware';
import { ApiError } from '../utils/errors';
import { logger } from '../utils/logger';

export async function campaignRoutes(fastify: FastifyInstance) {
  // Add middleware
  fastify.addHook('preHandler', authMiddleware);
  fastify.addHook('preHandler', organizationMiddleware);

  // Get all campaigns
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Campaigns'],
        summary: 'Get all campaigns for organization',
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
                    description: { type: 'string', nullable: true },
                    status: { type: 'string' },
                    createdAt: { type: 'string' },
                    updatedAt: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const organizationId = request.organization!.id;
        
        const campaigns = await request.server.db.campaign.findMany({
          where: {
            organizationId,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        return reply.status(200).send({
          success: true,
          data: campaigns,
        });
      } catch (error) {
        logger.error('Error getting campaigns:', error);
        throw new ApiError('Failed to get campaigns', 'CAMPAIGNS_ERROR', 500);
      }
    }
  );

  // Get campaign by ID
  fastify.get<{
    Params: { id: string };
  }>(
    '/:id',
    {
      schema: {
        tags: ['Campaigns'],
        summary: 'Get campaign by ID',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
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
                  name: { type: 'string' },
                  description: { type: 'string', nullable: true },
                  status: { type: 'string' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const organizationId = request.organization!.id;
        
        const campaign = await request.server.db.campaign.findFirst({
          where: {
            id,
            organizationId,
          },
        });

        if (!campaign) {
          throw new ApiError('Campaign not found', 'CAMPAIGN_NOT_FOUND', 404);
        }

        return reply.status(200).send({
          success: true,
          data: campaign,
        });
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        logger.error('Error getting campaign:', error);
        throw new ApiError('Failed to get campaign', 'CAMPAIGN_ERROR', 500);
      }
    }
  );

  // Create new campaign
  fastify.post<{
    Body: {
      name: string;
      description?: string;
      status?: string;
    };
  }>(
    '/',
    {
      schema: {
        tags: ['Campaigns'],
        summary: 'Create new campaign',
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1 },
            description: { type: 'string' },
            status: { type: 'string', enum: ['ACTIVE', 'PAUSED', 'DRAFT'], default: 'DRAFT' },
          },
          required: ['name'],
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
                  name: { type: 'string' },
                  description: { type: 'string', nullable: true },
                  status: { type: 'string' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{
      Body: {
        name: string;
        description?: string;
        status?: string;
      };
    }>, reply: FastifyReply) => {
      try {
        const { name, description, status = 'DRAFT' } = request.body;
        const organizationId = request.organization!.id;
        const userId = request.user!.id;
        
        const campaign = await request.server.db.campaign.create({
          data: {
            name,
            description,
            status,
            organizationId,
            createdBy: userId,
          },
        });

        logger.info('Campaign created', {
          campaignId: campaign.id,
          organizationId,
          userId,
        });

        return reply.status(201).send({
          success: true,
          data: campaign,
        });
      } catch (error) {
        logger.error('Error creating campaign:', error);
        throw new ApiError('Failed to create campaign', 'CREATE_CAMPAIGN_ERROR', 500);
      }
    }
  );

  // Update campaign
  fastify.put<{
    Params: { id: string };
    Body: {
      name?: string;
      description?: string;
      status?: string;
    };
  }>(
    '/:id',
    {
      schema: {
        tags: ['Campaigns'],
        summary: 'Update campaign',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1 },
            description: { type: 'string' },
            status: { type: 'string', enum: ['ACTIVE', 'PAUSED', 'DRAFT'] },
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
                  id: { type: 'string' },
                  name: { type: 'string' },
                  description: { type: 'string', nullable: true },
                  status: { type: 'string' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{
      Params: { id: string };
      Body: {
        name?: string;
        description?: string;
        status?: string;
      };
    }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const organizationId = request.organization!.id;
        const updateData = request.body;
        
        // Check if campaign exists and belongs to organization
        const existingCampaign = await request.server.db.campaign.findFirst({
          where: {
            id,
            organizationId,
          },
        });

        if (!existingCampaign) {
          throw new ApiError('Campaign not found', 'CAMPAIGN_NOT_FOUND', 404);
        }

        const campaign = await request.server.db.campaign.update({
          where: { id },
          data: updateData,
        });

        logger.info('Campaign updated', {
          campaignId: campaign.id,
          organizationId,
          userId: request.user!.id,
        });

        return reply.status(200).send({
          success: true,
          data: campaign,
        });
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        logger.error('Error updating campaign:', error);
        throw new ApiError('Failed to update campaign', 'UPDATE_CAMPAIGN_ERROR', 500);
      }
    }
  );

  // Delete campaign
  fastify.delete<{
    Params: { id: string };
  }>(
    '/:id',
    {
      schema: {
        tags: ['Campaigns'],
        summary: 'Delete campaign',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const organizationId = request.organization!.id;
        
        // Check if campaign exists and belongs to organization
        const existingCampaign = await request.server.db.campaign.findFirst({
          where: {
            id,
            organizationId,
          },
        });

        if (!existingCampaign) {
          throw new ApiError('Campaign not found', 'CAMPAIGN_NOT_FOUND', 404);
        }

        await request.server.db.campaign.delete({
          where: { id },
        });

        logger.info('Campaign deleted', {
          campaignId: id,
          organizationId,
          userId: request.user!.id,
        });

        return reply.status(200).send({
          success: true,
          message: 'Campaign deleted successfully',
        });
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        logger.error('Error deleting campaign:', error);
        throw new ApiError('Failed to delete campaign', 'DELETE_CAMPAIGN_ERROR', 500);
      }
    }
  );
}