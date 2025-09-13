import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/errors';

// Tipos para as métricas do dashboard
interface DashboardMetrics {
  faturamentoLiquido: {
    value: number;
    variation: number;
    period: string;
  };
  gastosAnuncios: {
    value: number;
    variation: number;
    period: string;
  };
  roas: {
    value: number;
    variation: number;
    period: string;
  };
  lucro: {
    value: number;
    variation: number;
    period: string;
  };
  roi: {
    value: number;
    variation: number;
    period: string;
  };
  margemLucro: {
    value: number;
    variation: number;
    period: string;
  };
  conversoes: {
    value: number;
    variation: number;
    period: string;
  };
  ticketMedio: {
    value: number;
    variation: number;
    period: string;
  };
}

// Middleware de autenticação
const requireAuth = async (request: any, reply: any) => {
  await authMiddleware(request, reply, {
    required: true,
    organizationRequired: true
  });
};

// Função para gerar dados mockados das métricas
function generateMockMetrics(): DashboardMetrics {
  return {
    faturamentoLiquido: {
      value: 635789.23 + (Math.random() - 0.5) * 50000,
      variation: 12.5 + (Math.random() - 0.5) * 10,
      period: 'vs mês anterior'
    },
    gastosAnuncios: {
      value: 456827.90 + (Math.random() - 0.5) * 30000,
      variation: -8.2 + (Math.random() - 0.5) * 8,
      period: 'vs mês anterior'
    },
    roas: {
      value: 1.39 + (Math.random() - 0.5) * 0.5,
      variation: 15.3 + (Math.random() - 0.5) * 12,
      period: 'vs mês anterior'
    },
    lucro: {
      value: 159887.65 + (Math.random() - 0.5) * 20000,
      variation: 22.1 + (Math.random() - 0.5) * 15,
      period: 'vs mês anterior'
    },
    roi: {
      value: 35.0 + (Math.random() - 0.5) * 10,
      variation: 18.7 + (Math.random() - 0.5) * 12,
      period: 'vs mês anterior'
    },
    margemLucro: {
      value: 25.1 + (Math.random() - 0.5) * 8,
      variation: 5.4 + (Math.random() - 0.5) * 6,
      period: 'vs mês anterior'
    },
    conversoes: {
      value: Math.floor(1247 + (Math.random() - 0.5) * 300),
      variation: 28.9 + (Math.random() - 0.5) * 20,
      period: 'vs mês anterior'
    },
    ticketMedio: {
      value: 510.23 + (Math.random() - 0.5) * 100,
      variation: -3.1 + (Math.random() - 0.5) * 8,
      period: 'vs mês anterior'
    }
  };
}

export async function dashboardRoutes(app: FastifyInstance) {
  // GET /dashboard/metrics - Obter métricas do dashboard
  app.get(
    '/metrics',
    {
      preHandler: requireAuth,
      schema: {
        tags: ['Dashboard'],
        summary: 'Get dashboard metrics',
        description: 'Retrieve main dashboard metrics with variations',
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  faturamentoLiquido: {
                    type: 'object',
                    properties: {
                      value: { type: 'number' },
                      variation: { type: 'number' },
                      period: { type: 'string' }
                    }
                  },
                  gastosAnuncios: {
                    type: 'object',
                    properties: {
                      value: { type: 'number' },
                      variation: { type: 'number' },
                      period: { type: 'string' }
                    }
                  },
                  roas: {
                    type: 'object',
                    properties: {
                      value: { type: 'number' },
                      variation: { type: 'number' },
                      period: { type: 'string' }
                    }
                  },
                  lucro: {
                    type: 'object',
                    properties: {
                      value: { type: 'number' },
                      variation: { type: 'number' },
                      period: { type: 'string' }
                    }
                  },
                  roi: {
                    type: 'object',
                    properties: {
                      value: { type: 'number' },
                      variation: { type: 'number' },
                      period: { type: 'string' }
                    }
                  },
                  margemLucro: {
                    type: 'object',
                    properties: {
                      value: { type: 'number' },
                      variation: { type: 'number' },
                      period: { type: 'string' }
                    }
                  },
                  conversoes: {
                    type: 'object',
                    properties: {
                      value: { type: 'number' },
                      variation: { type: 'number' },
                      period: { type: 'string' }
                    }
                  },
                  ticketMedio: {
                    type: 'object',
                    properties: {
                      value: { type: 'number' },
                      variation: { type: 'number' },
                      period: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    asyncHandler(async (request: any, reply) => {
      const metrics = generateMockMetrics();
      
      return reply.status(200).send({
        success: true,
        data: metrics
      });
    })
  );

  // GET /dashboard/overview - Obter visão geral do dashboard
  app.get(
    '/overview',
    {
      preHandler: requireAuth,
      schema: {
        tags: ['Dashboard'],
        summary: 'Get dashboard overview',
        description: 'Retrieve complete dashboard overview data',
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  metrics: {
                    type: 'object',
                    additionalProperties: true
                  },
                  summary: {
                    type: 'object',
                    properties: {
                      totalCampaigns: { type: 'number' },
                      activeCampaigns: { type: 'number' },
                      totalSpent: { type: 'number' },
                      totalRevenue: { type: 'number' },
                      averageRoas: { type: 'number' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    asyncHandler(async (request: any, reply) => {
      const metrics = generateMockMetrics();
      
      return reply.status(200).send({
        success: true,
        data: {
          metrics,
          summary: {
            totalCampaigns: 5,
            activeCampaigns: 3,
            totalSpent: 32378,
            totalRevenue: 89456,
            averageRoas: 2.76
          }
        }
      });
    })
  );
}