import { PrismaClient } from '@prisma/client'

// Mock data for development when DB is not available
const mockData = {
  users: [],
  organizations: [],
  utmLinks: [],
  utmClicks: [],
  utmConversions: []
}

// Extend PrismaClient with custom methods if needed
class ExtendedPrismaClient extends PrismaClient {
  private isConnected = false
  private mockMode = false

  constructor() {
    super({
      log: [
        {
          emit: 'event',
          level: 'query',
        },
        {
          emit: 'stdout',
          level: 'error',
        },
        {
          emit: 'stdout',
          level: 'info',
        },
        {
          emit: 'stdout',
          level: 'warn',
        },
      ],
      errorFormat: 'pretty',
    })

    // Test connection on startup
    this.testConnection()
  }

  private async testConnection() {
    try {
      await this.$connect()
      this.isConnected = true
      console.log('✅ Database connected successfully')
    } catch (error) {
      console.warn('⚠️  Database connection failed, falling back to mock mode:', error)
      this.isConnected = false
      this.mockMode = true
    }

    // Log slow queries in development
    if (process.env.NODE_ENV === 'development') {
      // Note: Query logging temporarily disabled due to type issues
      // this.$on('query', (e: any) => {
      //   if (e.duration > 1000) {
      //     console.log('🐌 Slow Query:', e.query)
      //     console.log('⏱️  Duration:', e.duration + 'ms')
      //   }
      // })
    }
  }

  // Custom method to get organization with user count
  async getOrganizationWithStats(organizationId: string) {
    const [organization, userCount, campaignCount, totalSpend] = await Promise.all([
      this.organization.findUnique({
        where: { id: organizationId },
        include: {
          users: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              isActive: true,
              lastLoginAt: true,
            },
          },
        },
      }),
      this.user.count({
        where: { organizationId, isActive: true },
      }),
      this.campaign.count({
        where: { organizationId },
      }),
      this.campaignMetric.aggregate({
        where: {
          campaign: {
            organizationId: organizationId,
          },
        },
        _sum: {
          spent: true,
          revenue: true,
        },
      }),
    ])

    return {
      ...organization,
      stats: {
        userCount,
        campaignCount,
        totalSpend: totalSpend._sum?.spent || 0,
        totalRevenue: totalSpend._sum?.revenue || 0,
      },
    }
  }

  // Custom method to get campaign performance
  async getCampaignPerformance(campaignId: string, days: number = 30) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const metrics = await this.campaignMetric.findMany({
      where: {
        campaignId,
        date: {
          gte: startDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
    })

    const totals = await this.campaignMetric.aggregate({
      where: {
        campaignId,
        date: {
          gte: startDate,
        },
      },
      _sum: {
        impressions: true,
        clicks: true,
        conversions: true,
        spent: true,
        revenue: true,
      },
    })

    const totalImpressions = Number(totals._sum?.impressions || 0)
    const totalClicks = Number(totals._sum?.clicks || 0)
    const totalConversions = Number(totals._sum?.conversions || 0)
    const totalSpend = Number(totals._sum?.spent || 0)
    const totalRevenue = Number(totals._sum?.revenue || 0)

    return {
      metrics,
      summary: {
        impressions: totalImpressions,
        clicks: totalClicks,
        conversions: totalConversions,
        spend: totalSpend,
        revenue: totalRevenue,
        ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
        cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
        cpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
        roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
        conversionRate: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
      },
    }
  }
}

// Global instance to prevent multiple connections
const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined
}

export const db = globalForPrisma.prisma ?? new ExtendedPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Export the client for direct use
export { ExtendedPrismaClient as PrismaClient }
export default db