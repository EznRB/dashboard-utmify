import { FastifyInstance } from 'fastify';
import { ROASROIService } from '../services/roas-roi.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { z } from 'zod';
import { subDays, parseISO } from 'date-fns';

// Validation schemas
const dateRangeSchema = z.object({
  startDate: z.string().optional().default(() => subDays(new Date(), 30).toISOString().split('T')[0]),
  endDate: z.string().optional().default(() => new Date().toISOString().split('T')[0]),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10)
});

const roiConfigSchema = z.object({
  operationalCostPercentage: z.number().min(0).max(1).optional().default(0.1),
  platformFeePercentage: z.number().min(0).max(1).optional().default(0.05)
});

const trendsSchema = z.object({
  granularity: z.enum(['daily', 'weekly', 'monthly']).optional().default('daily')
});

export async function roasRoiRoutes(fastify: FastifyInstance) {
  const roasRoiService = new ROASROIService(fastify.db);

  // Apply auth middleware to all routes
  fastify.addHook('preHandler', authMiddleware);

  // Get ROAS calculations for campaigns
  fastify.get('/roas', {
    schema: {
      description: 'Calculate ROAS for campaigns in date range',
      tags: ['ROAS/ROI'],
      querystring: {
        type: 'object',
        properties: {
          startDate: {
            type: 'string',
            format: 'date',
            description: 'Start date (YYYY-MM-DD)'
          },
          endDate: {
            type: 'string',
            format: 'date',
            description: 'End date (YYYY-MM-DD)'
          },
          limit: {
            type: 'string',
            description: 'Limit number of results'
          }
        }
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
                  campaignId: { type: 'string' },
                  campaignName: { type: 'string' },
                  platform: { type: 'string' },
                  revenue: { type: 'number' },
                  adSpend: { type: 'number' },
                  roas: { type: 'number' },
                  roasPercentage: { type: 'number' },
                  status: { type: 'string', enum: ['excellent', 'good', 'average', 'poor'] },
                  period: { type: 'string' }
                }
              }
            },
            metadata: {
              type: 'object',
              properties: {
                totalCampaigns: { type: 'number' },
                dateRange: {
                  type: 'object',
                  properties: {
                    startDate: { type: 'string' },
                    endDate: { type: 'string' }
                  }
                },
                averageROAS: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { startDate, endDate, limit } = dateRangeSchema.parse(request.query);
      const organizationId = request.user.organizationId;

      const startDateObj = parseISO(startDate);
      const endDateObj = parseISO(endDate);

      const roasCalculations = await roasRoiService.calculateCampaignROAS(
        organizationId,
        startDateObj,
        endDateObj
      );

      // Sort by ROAS and limit results
      const sortedResults = roasCalculations
        .sort((a, b) => b.roas - a.roas)
        .slice(0, limit);

      const averageROAS = roasCalculations.length > 0
        ? roasCalculations.reduce((sum, calc) => sum + calc.roas, 0) / roasCalculations.length
        : 0;

      return reply.send({
        success: true,
        data: sortedResults,
        metadata: {
          totalCampaigns: roasCalculations.length,
          dateRange: {
            startDate,
            endDate
          },
          averageROAS: parseFloat(averageROAS.toFixed(2))
        }
      });
    } catch (error) {
      fastify.log.error('Failed to calculate ROAS:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to calculate ROAS'
      });
    }
  });

  // Get ROI calculations for campaigns
  fastify.post('/roi', {
    schema: {
      description: 'Calculate ROI for campaigns in date range with custom cost parameters',
      tags: ['ROAS/ROI'],
      querystring: {
        type: 'object',
        properties: {
          startDate: {
            type: 'string',
            format: 'date',
            description: 'Start date (YYYY-MM-DD)'
          },
          endDate: {
            type: 'string',
            format: 'date',
            description: 'End date (YYYY-MM-DD)'
          },
          limit: {
            type: 'string',
            description: 'Limit number of results'
          }
        }
      },
      body: {
        type: 'object',
        properties: {
          operationalCostPercentage: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: 'Operational cost as percentage of revenue (0.1 = 10%)'
          },
          platformFeePercentage: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: 'Platform fees as percentage of ad spend (0.05 = 5%)'
          }
        }
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
                  campaignId: { type: 'string' },
                  campaignName: { type: 'string' },
                  platform: { type: 'string' },
                  revenue: { type: 'number' },
                  totalCost: { type: 'number' },
                  profit: { type: 'number' },
                  roi: { type: 'number' },
                  roiPercentage: { type: 'number' },
                  status: { type: 'string', enum: ['excellent', 'good', 'average', 'poor'] },
                  costBreakdown: {
                    type: 'object',
                    properties: {
                      adSpend: { type: 'number' },
                      operationalCost: { type: 'number' },
                      platformFees: { type: 'number' }
                    }
                  },
                  period: { type: 'string' }
                }
              }
            },
            metadata: {
              type: 'object',
              properties: {
                totalCampaigns: { type: 'number' },
                dateRange: {
                  type: 'object',
                  properties: {
                    startDate: { type: 'string' },
                    endDate: { type: 'string' }
                  }
                },
                averageROI: { type: 'number' },
                totalProfit: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { startDate, endDate, limit } = dateRangeSchema.parse(request.query);
      const { operationalCostPercentage, platformFeePercentage } = roiConfigSchema.parse(request.body);
      const organizationId = request.user.organizationId;

      const startDateObj = parseISO(startDate);
      const endDateObj = parseISO(endDate);

      const roiCalculations = await roasRoiService.calculateCampaignROI(
        organizationId,
        startDateObj,
        endDateObj,
        operationalCostPercentage,
        platformFeePercentage
      );

      // Sort by ROI and limit results
      const sortedResults = roiCalculations
        .sort((a, b) => b.roi - a.roi)
        .slice(0, limit);

      const averageROI = roiCalculations.length > 0
        ? roiCalculations.reduce((sum, calc) => sum + calc.roi, 0) / roiCalculations.length
        : 0;

      const totalProfit = roiCalculations.reduce((sum, calc) => sum + calc.profit, 0);

      return reply.send({
        success: true,
        data: sortedResults,
        metadata: {
          totalCampaigns: roiCalculations.length,
          dateRange: {
            startDate,
            endDate
          },
          averageROI: parseFloat(averageROI.toFixed(2)),
          totalProfit: parseFloat(totalProfit.toFixed(2))
        }
      });
    } catch (error) {
      fastify.log.error('Failed to calculate ROI:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to calculate ROI'
      });
    }
  });

  // Get ROAS/ROI trends over time
  fastify.get('/trends', {
    schema: {
      description: 'Get ROAS/ROI trends over time',
      tags: ['ROAS/ROI'],
      querystring: {
        type: 'object',
        properties: {
          startDate: {
            type: 'string',
            format: 'date',
            description: 'Start date (YYYY-MM-DD)'
          },
          endDate: {
            type: 'string',
            format: 'date',
            description: 'End date (YYYY-MM-DD)'
          },
          granularity: {
            type: 'string',
            enum: ['daily', 'weekly', 'monthly'],
            description: 'Data granularity'
          }
        }
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
                  date: { type: 'string' },
                  roas: { type: 'number' },
                  roi: { type: 'number' },
                  revenue: { type: 'number' },
                  adSpend: { type: 'number' },
                  totalCost: { type: 'number' },
                  profit: { type: 'number' }
                }
              }
            },
            analysis: {
              type: 'object',
              properties: {
                roiTrend: {
                  type: 'object',
                  properties: {
                    currentROI: { type: 'number' },
                    previousROI: { type: 'number' },
                    changePercentage: { type: 'number' },
                    trend: { type: 'string', enum: ['improving', 'declining', 'stable', 'insufficient_data'] }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { startDate, endDate } = dateRangeSchema.parse(request.query);
      const { granularity } = trendsSchema.parse(request.query);
      const organizationId = request.user.organizationId;

      const startDateObj = parseISO(startDate);
      const endDateObj = parseISO(endDate);

      const trends = await roasRoiService.getROASROITrends(
        organizationId,
        startDateObj,
        endDateObj,
        granularity
      );

      const roiTrendAnalysis = roasRoiService.analyzeROITrend(trends);

      return reply.send({
        success: true,
        data: trends,
        analysis: {
          roiTrend: roiTrendAnalysis
        }
      });
    } catch (error) {
      fastify.log.error('Failed to get ROAS/ROI trends:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to get trends'
      });
    }
  });

  // Get comprehensive ROAS/ROI analysis
  fastify.get('/analysis', {
    schema: {
      description: 'Get comprehensive ROAS/ROI analysis with alerts and insights',
      tags: ['ROAS/ROI'],
      querystring: {
        type: 'object',
        properties: {
          startDate: {
            type: 'string',
            format: 'date',
            description: 'Start date (YYYY-MM-DD)'
          },
          endDate: {
            type: 'string',
            format: 'date',
            description: 'End date (YYYY-MM-DD)'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                summary: {
                  type: 'object',
                  properties: {
                    totalRevenue: { type: 'number' },
                    totalAdSpend: { type: 'number' },
                    totalCost: { type: 'number' },
                    totalProfit: { type: 'number' },
                    avgROAS: { type: 'number' },
                    avgROI: { type: 'number' },
                    bestPerformingCampaign: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        roas: { type: 'number' },
                        roi: { type: 'number' }
                      }
                    },
                    worstPerformingCampaign: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        roas: { type: 'number' },
                        roi: { type: 'number' }
                      }
                    }
                  }
                },
                alerts: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string', enum: ['critical', 'warning', 'info'] },
                      message: { type: 'string' },
                      campaignId: { type: 'string' },
                      campaignName: { type: 'string' },
                      metric: { type: 'string', enum: ['roas', 'roi'] },
                      value: { type: 'number' },
                      threshold: { type: 'number' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { startDate, endDate } = dateRangeSchema.parse(request.query);
      const organizationId = request.user.organizationId;

      const startDateObj = parseISO(startDate);
      const endDateObj = parseISO(endDate);

      const analysis = await roasRoiService.generateROASROIAnalysis(
        organizationId,
        startDateObj,
        endDateObj
      );

      return reply.send({
        success: true,
        data: analysis
      });
    } catch (error) {
      fastify.log.error('Failed to generate ROAS/ROI analysis:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to generate analysis'
      });
    }
  });

  // Get top performing campaigns by ROAS
  fastify.get('/top-roas', {
    schema: {
      description: 'Get top performing campaigns by ROAS',
      tags: ['ROAS/ROI'],
      querystring: {
        type: 'object',
        properties: {
          startDate: {
            type: 'string',
            format: 'date',
            description: 'Start date (YYYY-MM-DD)'
          },
          endDate: {
            type: 'string',
            format: 'date',
            description: 'End date (YYYY-MM-DD)'
          },
          limit: {
            type: 'string',
            description: 'Limit number of results'
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { startDate, endDate, limit } = dateRangeSchema.parse(request.query);
      const organizationId = request.user.organizationId;

      const startDateObj = parseISO(startDate);
      const endDateObj = parseISO(endDate);

      const topCampaigns = await roasRoiService.getTopCampaignsByROAS(
        organizationId,
        startDateObj,
        endDateObj,
        limit
      );

      return reply.send({
        success: true,
        data: topCampaigns
      });
    } catch (error) {
      fastify.log.error('Failed to get top ROAS campaigns:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to get top campaigns'
      });
    }
  });

  // Get top performing campaigns by ROI
  fastify.get('/top-roi', {
    schema: {
      description: 'Get top performing campaigns by ROI',
      tags: ['ROAS/ROI'],
      querystring: {
        type: 'object',
        properties: {
          startDate: {
            type: 'string',
            format: 'date',
            description: 'Start date (YYYY-MM-DD)'
          },
          endDate: {
            type: 'string',
            format: 'date',
            description: 'End date (YYYY-MM-DD)'
          },
          limit: {
            type: 'string',
            description: 'Limit number of results'
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { startDate, endDate, limit } = dateRangeSchema.parse(request.query);
      const organizationId = request.user.organizationId;

      const startDateObj = parseISO(startDate);
      const endDateObj = parseISO(endDate);

      const topCampaigns = await roasRoiService.getTopCampaignsByROI(
        organizationId,
        startDateObj,
        endDateObj,
        limit
      );

      return reply.send({
        success: true,
        data: topCampaigns
      });
    } catch (error) {
      fastify.log.error('Failed to get top ROI campaigns:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to get top campaigns'
      });
    }
  });

  // Simple ROAS calculator endpoint
  fastify.post('/calculate/roas', {
    schema: {
      description: 'Calculate ROAS from revenue and ad spend',
      tags: ['ROAS/ROI'],
      body: {
        type: 'object',
        required: ['revenue', 'adSpend'],
        properties: {
          revenue: {
            type: 'number',
            minimum: 0,
            description: 'Total revenue'
          },
          adSpend: {
            type: 'number',
            minimum: 0,
            description: 'Total ad spend'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                revenue: { type: 'number' },
                adSpend: { type: 'number' },
                roas: { type: 'number' },
                roasPercentage: { type: 'number' },
                status: { type: 'string', enum: ['excellent', 'good', 'average', 'poor'] }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { revenue, adSpend } = request.body as { revenue: number; adSpend: number };
      
      const roas = roasRoiService.calculateROAS(revenue, adSpend);
      const roasPercentage = roas * 100;
      const status = roasRoiService.getROASStatus(roas);

      return reply.send({
        success: true,
        data: {
          revenue,
          adSpend,
          roas,
          roasPercentage,
          status
        }
      });
    } catch (error) {
      fastify.log.error('Failed to calculate ROAS:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to calculate ROAS'
      });
    }
  });

  // Simple ROI calculator endpoint
  fastify.post('/calculate/roi', {
    schema: {
      description: 'Calculate ROI from revenue and total cost',
      tags: ['ROAS/ROI'],
      body: {
        type: 'object',
        required: ['revenue', 'totalCost'],
        properties: {
          revenue: {
            type: 'number',
            minimum: 0,
            description: 'Total revenue'
          },
          totalCost: {
            type: 'number',
            minimum: 0,
            description: 'Total cost (ad spend + operational costs + fees)'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                revenue: { type: 'number' },
                totalCost: { type: 'number' },
                profit: { type: 'number' },
                roi: { type: 'number' },
                roiPercentage: { type: 'number' },
                status: { type: 'string', enum: ['excellent', 'good', 'average', 'poor'] }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { revenue, totalCost } = request.body as { revenue: number; totalCost: number };
      
      const roi = roasRoiService.calculateROI(revenue, totalCost);
      const profit = revenue - totalCost;
      const status = roasRoiService.getROIStatus(roi);

      return reply.send({
        success: true,
        data: {
          revenue,
          totalCost,
          profit,
          roi,
          roiPercentage: roi,
          status
        }
      });
    } catch (error) {
      fastify.log.error('Failed to calculate ROI:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to calculate ROI'
      });
    }
  });
}