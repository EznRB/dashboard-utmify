import type { FastifyInstance } from 'fastify'
import { MetricsService } from '@/services/metrics.service'
import { PrismaService } from '@/database/prisma.service'
import { authMiddleware } from '@/middleware/auth.middleware'
import { ApiError, asyncHandler } from '@/utils/errors'
import { logger } from '@/utils/logger'
import type { Prisma } from '@prisma/client'

// Schemas para validação
const calculateMetricsSchema = {
  body: {
    type: 'object',
    properties: {
      campaignIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'IDs das campanhas para calcular métricas'
      },
      startDate: {
        type: 'string',
        format: 'date',
        description: 'Data de início (YYYY-MM-DD)'
      },
      endDate: {
        type: 'string',
        format: 'date',
        description: 'Data de fim (YYYY-MM-DD)'
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
            roas: { type: 'number' },
            roi: { type: 'number' },
            cac: { type: 'number' },
            ltv: { type: 'number' },
            arpu: { type: 'number' },
            cpc: { type: 'number' },
            cpm: { type: 'number' },
            ctr: { type: 'number' },
            conversionRate: { type: 'number' },
            margin: { type: 'number' }
          }
        }
      }
    }
  }
}

const dashboardSchema = {
  querystring: {
    type: 'object',
    properties: {
      campaignIds: {
        type: 'string',
        description: 'IDs das campanhas separados por vírgula'
      },
      startDate: {
        type: 'string',
        format: 'date',
        description: 'Data de início (YYYY-MM-DD)'
      },
      endDate: {
        type: 'string',
        format: 'date',
        description: 'Data de fim (YYYY-MM-DD)'
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
            totalRevenue: { type: 'number' },
            totalSpend: { type: 'number' },
            totalConversions: { type: 'number' },
            totalImpressions: { type: 'number' },
            totalClicks: { type: 'number' },
            kpis: {
              type: 'object',
              properties: {
                roas: { type: 'number' },
                roi: { type: 'number' },
                cac: { type: 'number' },
                ltv: { type: 'number' },
                arpu: { type: 'number' },
                cpc: { type: 'number' },
                cpm: { type: 'number' },
                ctr: { type: 'number' },
                conversionRate: { type: 'number' },
                margin: { type: 'number' }
              }
            },
            trends: {
              type: 'object',
              properties: {
                revenue: {
                  type: 'object',
                  properties: {
                    current: { type: 'number' },
                    previous: { type: 'number' },
                    change: { type: 'number' }
                  }
                },
                spend: {
                  type: 'object',
                  properties: {
                    current: { type: 'number' },
                    previous: { type: 'number' },
                    change: { type: 'number' }
                  }
                },
                roas: {
                  type: 'object',
                  properties: {
                    current: { type: 'number' },
                    previous: { type: 'number' },
                    change: { type: 'number' }
                  }
                },
                conversions: {
                  type: 'object',
                  properties: {
                    current: { type: 'number' },
                    previous: { type: 'number' },
                    change: { type: 'number' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

const historySchema = {
  querystring: {
    type: 'object',
    properties: {
      startDate: {
        type: 'string',
        format: 'date',
        description: 'Data de início (YYYY-MM-DD)'
      },
      endDate: {
        type: 'string',
        format: 'date',
        description: 'Data de fim (YYYY-MM-DD)'
      },
      campaignIds: {
        type: 'string',
        description: 'IDs das campanhas separados por vírgula'
      },
      groupBy: {
        type: 'string',
        enum: ['day', 'week', 'month'],
        default: 'day',
        description: 'Agrupamento dos dados'
      }
    },
    required: ['startDate', 'endDate']
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
              metrics: {
                type: 'object',
                properties: {
                  impressions: { type: 'number' },
                  clicks: { type: 'number' },
                  conversions: { type: 'number' },
                  spend: { type: 'number' },
                  revenue: { type: 'number' },
                  kpis: {
                    type: 'object',
                    properties: {
                      roas: { type: 'number' },
                      roi: { type: 'number' },
                      cac: { type: 'number' },
                      ltv: { type: 'number' },
                      arpu: { type: 'number' },
                      cpc: { type: 'number' },
                      cpm: { type: 'number' },
                      ctr: { type: 'number' },
                      conversionRate: { type: 'number' },
                      margin: { type: 'number' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

const compareSchema = {
  querystring: {
    type: 'object',
    properties: {
      period1Start: {
        type: 'string',
        format: 'date',
        description: 'Data de início do período 1 (YYYY-MM-DD)'
      },
      period1End: {
        type: 'string',
        format: 'date',
        description: 'Data de fim do período 1 (YYYY-MM-DD)'
      },
      period2Start: {
        type: 'string',
        format: 'date',
        description: 'Data de início do período 2 (YYYY-MM-DD)'
      },
      period2End: {
        type: 'string',
        format: 'date',
        description: 'Data de fim do período 2 (YYYY-MM-DD)'
      },
      campaignIds: {
        type: 'string',
        description: 'IDs das campanhas separados por vírgula'
      }
    },
    required: ['period1Start', 'period1End', 'period2Start', 'period2End']
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            period1: {
              type: 'object',
              properties: {
                startDate: { type: 'string' },
                endDate: { type: 'string' },
                metrics: { type: 'object' }
              }
            },
            period2: {
              type: 'object',
              properties: {
                startDate: { type: 'string' },
                endDate: { type: 'string' },
                metrics: { type: 'object' }
              }
            },
            comparison: {
              type: 'object',
              properties: {
                revenue: {
                  type: 'object',
                  properties: {
                    change: { type: 'number' },
                    percentage: { type: 'number' }
                  }
                },
                spend: {
                  type: 'object',
                  properties: {
                    change: { type: 'number' },
                    percentage: { type: 'number' }
                  }
                },
                roas: {
                  type: 'object',
                  properties: {
                    change: { type: 'number' },
                    percentage: { type: 'number' }
                  }
                },
                conversions: {
                  type: 'object',
                  properties: {
                    change: { type: 'number' },
                    percentage: { type: 'number' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

const exportSchema = {
  querystring: {
    type: 'object',
    properties: {
      startDate: {
        type: 'string',
        format: 'date',
        description: 'Data de início (YYYY-MM-DD)'
      },
      endDate: {
        type: 'string',
        format: 'date',
        description: 'Data de fim (YYYY-MM-DD)'
      },
      campaignIds: {
        type: 'string',
        description: 'IDs das campanhas separados por vírgula'
      },
      format: {
        type: 'string',
        enum: ['csv'],
        default: 'csv',
        description: 'Formato de exportação'
      }
    },
    required: ['startDate', 'endDate']
  },
  response: {
    200: {
      type: 'string',
      description: 'Arquivo CSV com as métricas'
    }
  }
}

// Middleware de autenticação para métricas
const requireAuth = async (request: any, reply: any) => {
  await authMiddleware(request, reply, {
    required: true,
    organizationRequired: true
  })
}

// Helper para parsear datas
function parseDate(dateString: string): Date {
  const date = new Date(dateString + 'T00:00:00.000Z')
  if (isNaN(date.getTime())) {
    throw new ApiError('Invalid date format. Use YYYY-MM-DD', 'INVALID_DATE_FORMAT', 400)
  }
  return date
}

// Helper para parsear IDs de campanhas
function parseCampaignIds(campaignIdsString?: string): string[] | undefined {
  if (!campaignIdsString) return undefined
  return campaignIdsString.split(',').map(id => id.trim()).filter(id => id.length > 0)
}

// Rotas de métricas
export async function metricsRoutes(app: FastifyInstance) {
  const prismaService = new PrismaService()
  const metricsService = new MetricsService(prismaService)

  // POST /api/v1/metrics/calculate - Calcular métricas sob demanda
  app.post(
    '/calculate',
    {
      preHandler: requireAuth,
      schema: calculateMetricsSchema
    },
    asyncHandler(async (request: any, reply) => {
      const { campaignIds, startDate, endDate } = request.body
      const organizationId = request.organization.id

      const parsedStartDate = startDate ? parseDate(startDate) : undefined
      const parsedEndDate = endDate ? parseDate(endDate) : undefined

      const kpis = await metricsService.calculateMetricsOnDemand(
        organizationId,
        campaignIds,
        parsedStartDate,
        parsedEndDate
      )

      logger.info('Metrics calculated on demand', {
        organizationId,
        campaignIds: campaignIds?.length || 0,
        startDate: parsedStartDate?.toISOString(),
        endDate: parsedEndDate?.toISOString()
      })

      return reply.status(200).send({
        success: true,
        data: kpis
      })
    })
  )

  // GET /api/v1/metrics/dashboard - Obter dados do dashboard
  app.get(
    '/dashboard',
    {
      preHandler: requireAuth,
      schema: dashboardSchema
    },
    asyncHandler(async (request: any, reply) => {
      const { campaignIds, startDate, endDate } = request.query
      const organizationId = request.organization.id

      const parsedCampaignIds = parseCampaignIds(campaignIds)
      const parsedStartDate = startDate ? parseDate(startDate) : undefined
      const parsedEndDate = endDate ? parseDate(endDate) : undefined

      const dashboardData = await metricsService.getDashboardMetrics(
        organizationId,
        parsedCampaignIds,
        parsedStartDate,
        parsedEndDate
      )

      return reply.status(200).send({
        success: true,
        data: dashboardData
      })
    })
  )

  // GET /api/v1/metrics/history - Obter histórico de métricas
  app.get(
    '/history',
    {
      preHandler: requireAuth,
      schema: historySchema
    },
    asyncHandler(async (request: any, reply) => {
      const { startDate, endDate, campaignIds, groupBy = 'day' } = request.query
      const organizationId = request.organization.id

      const parsedStartDate = parseDate(startDate)
      const parsedEndDate = parseDate(endDate)
      const parsedCampaignIds = parseCampaignIds(campaignIds)

      const historyData = await metricsService.getMetricsHistory(
        organizationId,
        parsedStartDate,
        parsedEndDate,
        parsedCampaignIds,
        groupBy as 'day' | 'week' | 'month'
      )

      return reply.status(200).send({
        success: true,
        data: historyData
      })
    })
  )

  // GET /api/v1/metrics/compare - Comparar métricas entre períodos
  app.get(
    '/compare',
    {
      preHandler: requireAuth,
      schema: compareSchema
    },
    asyncHandler(async (request: any, reply) => {
      const {
        period1Start,
        period1End,
        period2Start,
        period2End,
        campaignIds
      } = request.query
      const organizationId = request.organization.id

      const parsedPeriod1Start = parseDate(period1Start)
      const parsedPeriod1End = parseDate(period1End)
      const parsedPeriod2Start = parseDate(period2Start)
      const parsedPeriod2End = parseDate(period2End)
      const parsedCampaignIds = parseCampaignIds(campaignIds)

      const comparisonData = await metricsService.compareMetrics(
        organizationId,
        parsedPeriod1Start,
        parsedPeriod1End,
        parsedPeriod2Start,
        parsedPeriod2End,
        parsedCampaignIds
      )

      return reply.status(200).send({
        success: true,
        data: comparisonData
      })
    })
  )

  // GET /api/v1/metrics/export - Exportar métricas
  app.get(
    '/export',
    {
      preHandler: requireAuth,
      schema: exportSchema
    },
    asyncHandler(async (request: any, reply) => {
      const { startDate, endDate, campaignIds, format = 'csv' } = request.query
      const organizationId = request.organization.id

      const parsedStartDate = parseDate(startDate)
      const parsedEndDate = parseDate(endDate)
      const parsedCampaignIds = parseCampaignIds(campaignIds)

      if (format !== 'csv') {
        throw new ApiError('Only CSV format is supported', 'UNSUPPORTED_FORMAT', 400)
      }

      const csvContent = await metricsService.exportMetricsToCSV(
        organizationId,
        parsedStartDate,
        parsedEndDate,
        parsedCampaignIds
      )

      const filename = `metrics_${startDate}_${endDate}.csv`
      
      reply.header('Content-Type', 'text/csv')
      reply.header('Content-Disposition', `attachment; filename="${filename}"`)
      
      logger.info('Metrics exported', {
        organizationId,
        startDate,
        endDate,
        campaignIds: parsedCampaignIds?.length || 0,
        format
      })

      return reply.status(200).send(csvContent)
    })
  )

  // POST /api/v1/metrics/aggregate - Endpoint interno para agregação manual
  app.post(
    '/aggregate',
    {
      preHandler: requireAuth,
      schema: {
        body: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              format: 'date',
              description: 'Data para agregação (YYYY-MM-DD)'
            }
          },
          required: ['date']
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' }
            }
          }
        }
      }
    },
    asyncHandler(async (request: any, reply) => {
      const { date } = request.body
      const organizationId = request.organization.id
      
      // Verificar se o usuário tem permissão de admin
      if (request.user.role !== 'ADMIN' && request.user.role !== 'OWNER') {
        throw new ApiError('Insufficient permissions', 'INSUFFICIENT_PERMISSIONS', 403)
      }

      const parsedDate = parseDate(date)
      
      await metricsService.aggregateDailyMetrics(parsedDate, organizationId)

      logger.info('Manual metrics aggregation completed', {
        organizationId,
        date: parsedDate.toISOString(),
        triggeredBy: request.user.id
      })

      return reply.status(200).send({
        success: true,
        message: `Metrics aggregated successfully for ${date}`
      })
    })
  )
}