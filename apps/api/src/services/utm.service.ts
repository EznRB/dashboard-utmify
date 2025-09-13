import { PrismaService } from '../database/prisma.service';
// import { UTMStatus, ConversionEventType, AttributionModel } from '@utmify/database';
import { nanoid } from 'nanoid';
import QRCode from 'qrcode';
// import { UAParser } from 'ua-parser-js';
// import geoip from 'geoip-lite';
import { ApiError } from '../utils/errors';

// Temporary enums until @utmify/database is properly resolved
enum UTMStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ARCHIVED = 'ARCHIVED'
}

enum ConversionEventType {
  PURCHASE = 'PURCHASE',
  LEAD = 'LEAD',
  SIGNUP = 'SIGNUP',
  VIEW_CONTENT = 'VIEW_CONTENT'
}

enum AttributionModel {
  FIRST_CLICK = 'FIRST_CLICK',
  LAST_CLICK = 'LAST_CLICK',
  LINEAR = 'LINEAR'
}

interface CreateUTMData {
  originalUrl: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  customParams?: Record<string, string>;
  title?: string;
  description?: string;
  tags?: string[];
  expiresAt?: string;
  isPublic?: boolean;
  organizationId: string;
  userId: string;
}

interface ListUTMQuery {
  page: number;
  limit: number;
  search?: string;
  status?: UTMStatus;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  sortBy: 'createdAt' | 'clickCount' | 'conversionCount' | 'title';
  sortOrder: 'asc' | 'desc';
}

interface StatsQuery {
  period: '24h' | '7d' | '30d' | '90d' | 'all';
  groupBy: 'hour' | 'day' | 'week' | 'month';
}

interface TrackingData {
  userAgent?: string;
  referer?: string;
  ipAddress?: string;
}

interface ConversionData {
  utmLinkId?: string;
  shortCode?: string;
  eventType: string;
  eventName?: string;
  value?: number;
  currency?: string;
  customerId?: string;
  customerEmail?: string;
  metadata?: Record<string, any>;
  organizationId: string;
}

export class UTMService {
  private prisma: PrismaService

  constructor() {
    this.prisma = new PrismaService()
  }

  /**
   * Criar novo link UTM
   */
  async createUTMLink(data: CreateUTMData) {
    const shortCode = nanoid(8);
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const shortUrl = `${baseUrl}/r/${shortCode}`;

    // Construir URL completa com parâmetros UTM
    const url = new URL(data.originalUrl);
    if (data.utmSource) url.searchParams.set('utm_source', data.utmSource);
    if (data.utmMedium) url.searchParams.set('utm_medium', data.utmMedium);
    if (data.utmCampaign) url.searchParams.set('utm_campaign', data.utmCampaign);
    if (data.utmTerm) url.searchParams.set('utm_term', data.utmTerm);
    if (data.utmContent) url.searchParams.set('utm_content', data.utmContent);
    
    // Adicionar parâmetros customizados
    if (data.customParams) {
      Object.entries(data.customParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    const finalUrl = url.toString();

    // Gerar QR Code
    const qrCodeDataUrl = await QRCode.toDataURL(shortUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    const utmLink = await this.prisma.UTMLink.create({
      data: {
        organizationId: data.organizationId,
        originalUrl: finalUrl,
        utmSource: data.utmSource,
        utmMedium: data.utmMedium,
        utmCampaign: data.utmCampaign,
        utmTerm: data.utmTerm,
        utmContent: data.utmContent,
        customParams: data.customParams,
        shortCode,
        shortUrl,
        qrCodeUrl: qrCodeDataUrl,
        title: data.title,
        description: data.description,
        tags: data.tags || null,
        isPublic: data.isPublic || false,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    });

    return utmLink;
  }

  /**
   * Listar links UTM
   */
  async listUTMLinks(organizationId: string, query: ListUTMQuery) {
    const where: any = {
      organizationId,
    };

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { originalUrl: { contains: query.search, mode: 'insensitive' } },
        { utmSource: { contains: query.search, mode: 'insensitive' } },
        { utmMedium: { contains: query.search, mode: 'insensitive' } },
        { utmCampaign: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.utmSource) {
      where.utmSource = query.utmSource;
    }

    if (query.utmMedium) {
      where.utmMedium = query.utmMedium;
    }

    if (query.utmCampaign) {
      where.utmCampaign = query.utmCampaign;
    }

    const [links, total] = await Promise.all([
      this.prisma.UTMLink.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: {
          [query.sortBy]: query.sortOrder,
        },
        include: {
          _count: {
            select: {
              clicks: true,
              conversions: true,
            },
          },
        },
      }),
      this.prisma.UTMLink.count({ where }),
    ]);

    return { links, total };
  }

  /**
   * Obter estatísticas de um link UTM
   */
  async getUTMStats(organizationId: string, linkId: string, query: StatsQuery) {
    const utmLink = await this.prisma.UTMLink.findFirst({
      where: {
        id: linkId,
        organizationId,
      },
    });

    if (!utmLink) {
      return null;
    }

    // Calcular período
    const now = new Date();
    let startDate: Date;

    switch (query.period) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0);
    }

    const whereClause = {
      utmLinkId: linkId,
      clickedAt: {
        gte: startDate,
      },
    };

    // Estatísticas básicas
    const [totalClicks, uniqueClicks, conversions, clicksByCountry, clicksByDevice] = await Promise.all([
      this.prisma.uTMClick.count({ where: whereClause }),
      this.prisma.uTMClick.count({ where: { ...whereClause, isUnique: true } }),
      this.prisma.uTMConversion.count({
        where: {
          utmLinkId: linkId,
          convertedAt: {
            gte: startDate,
          },
        },
      }),
      this.prisma.uTMClick.groupBy({
        by: ['country'],
        where: whereClause,
        _count: true,
        orderBy: {
          _count: {
            country: 'desc',
          },
        },
        take: 10,
      }),
      this.prisma.uTMClick.groupBy({
        by: ['deviceType'],
        where: whereClause,
        _count: true,
        orderBy: {
          _count: {
            deviceType: 'desc',
          },
        },
      }),
    ]);

    // Cliques ao longo do tempo
    const clicksOverTime = await this.getClicksOverTime(linkId, startDate, query.groupBy);

    // Taxa de conversão
    const conversionRate = totalClicks > 0 ? (conversions / totalClicks) * 100 : 0;

    return {
      link: utmLink,
      stats: {
        totalClicks,
        uniqueClicks,
        conversions,
        conversionRate: Math.round(conversionRate * 100) / 100,
        clicksByCountry,
        clicksByDevice,
        clicksOverTime,
      },
    };
  }

  /**
   * Encurtar URL
   */
  async shortenUrl(data: { url: string; customCode?: string; organizationId: string }) {
    let shortCode = data.customCode;

    if (shortCode) {
      // Verificar se o código personalizado já existe
      const existing = await this.prisma.UTMLink.findUnique({
        where: { shortCode },
      });

      if (existing) {
        throw new Error('CUSTOM_CODE_EXISTS');
      }
    } else {
      shortCode = nanoid(8);
    }

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const shortUrl = `${baseUrl}/r/${shortCode}`;

    const utmLink = await this.prisma.UTMLink.create({
      data: {
        organizationId: data.organizationId,
        originalUrl: data.url,
        shortCode,
        shortUrl,
      },
    });

    return utmLink;
  }

  /**
   * Rastrear clique e redirecionar
   */
  async trackClickAndRedirect(shortCode: string, trackingData: TrackingData) {
    const utmLink = await this.prisma.UTMLink.findUnique({
      where: { shortCode },
    });

    if (!utmLink || utmLink.status !== 'ACTIVE') {
      return null;
    }

    // Verificar se o link expirou
    if (utmLink.expiresAt && utmLink.expiresAt < new Date()) {
      return null;
    }

    // Analisar User Agent
    const parser = new UAParser(trackingData.userAgent);
    const device = parser.getResult();

    // Obter geolocalização
    const geo = trackingData.ipAddress ? geoip.lookup(trackingData.ipAddress) : null;

    // Verificar se é um clique único (baseado no IP e User Agent)
    const sessionId = this.generateSessionId(trackingData.ipAddress, trackingData.userAgent);
    const existingClick = await this.prisma.uTMClick.findFirst({
      where: {
        utmLinkId: utmLink.id,
        sessionId,
      },
    });

    const isUnique = !existingClick;

    // Registrar o clique
    await this.prisma.uTMClick.create({
      data: {
        utmLinkId: utmLink.id,
        organizationId: utmLink.organizationId,
        ipAddress: trackingData.ipAddress,
        userAgent: trackingData.userAgent,
        referer: trackingData.referer,
        country: geo?.country,
        region: geo?.region,
        city: geo?.city,
        latitude: geo?.ll?.[0],
        longitude: geo?.ll?.[1],
        deviceType: device.device.type || 'desktop',
        browser: device.browser.name,
        browserVersion: device.browser.version,
        os: device.os.name,
        osVersion: device.os.version,
        sessionId,
        isUnique,
      },
    });

    // Atualizar contadores
    await this.prisma.UTMLink.update({
      where: { id: utmLink.id },
      data: {
        clickCount: {
          increment: 1,
        },
        uniqueClicks: isUnique
          ? {
              increment: 1,
            }
          : undefined,
      },
    });

    return {
      originalUrl: utmLink.originalUrl,
    };
  }

  /**
   * Criação em massa de links UTM
   */
  async bulkCreateUTMLinks(data: {
    links: CreateUTMData[];
    organizationId: string;
    userId: string;
  }) {
    const results = {
      created: [],
      failed: [],
    };

    for (const linkData of data.links) {
      try {
        const utmLink = await this.createUTMLink({
          ...linkData,
          organizationId: data.organizationId,
          userId: data.userId,
        });
        results.created.push(utmLink);
      } catch (error) {
        results.failed.push({
          data: linkData,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Atualizar link UTM
   */
  async updateUTMLink(organizationId: string, linkId: string, data: Partial<CreateUTMData>) {
    const utmLink = await this.prisma.UTMLink.findFirst({
      where: {
        id: linkId,
        organizationId,
      },
    });

    if (!utmLink) {
      return null;
    }

    return await this.prisma.UTMLink.update({
      where: { id: linkId },
      data: {
        ...data,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      },
    });
  }

  /**
   * Deletar link UTM
   */
  async deleteUTMLink(organizationId: string, linkId: string) {
    const utmLink = await this.prisma.UTMLink.findFirst({
      where: {
        id: linkId,
        organizationId,
      },
    });

    if (!utmLink) {
      return false;
    }

    await this.prisma.UTMLink.delete({
      where: { id: linkId },
    });

    return true;
  }

  /**
   * Rastrear conversão
   */
  async trackConversion(data: ConversionData) {
    let utmLinkId = data.utmLinkId;

    // Se não foi fornecido o ID do link, buscar pelo código curto
    if (!utmLinkId && data.shortCode) {
      const utmLink = await this.prisma.UTMLink.findUnique({
        where: { shortCode: data.shortCode },
      });
      utmLinkId = utmLink?.id;
    }

    if (!utmLinkId) {
      throw new Error('Link UTM não encontrado');
    }

    const conversion = await this.prisma.uTMConversion.create({
      data: {
        utmLinkId,
        organizationId: data.organizationId,
        eventType: data.eventType as ConversionEventType,
        eventName: data.eventName,
        value: data.value,
        currency: data.currency,
        customerId: data.customerId,
        customerEmail: data.customerEmail,
        metadata: data.metadata,
        attributionModel: AttributionModel.LAST_CLICK,
        attributionWeight: 1.0,
      },
    });

    // Atualizar contador de conversões
    await this.prisma.UTMLink.update({
      where: { id: utmLinkId },
      data: {
        conversionCount: {
          increment: 1,
        },
        conversionValue: data.value
          ? {
              increment: data.value,
            }
          : undefined,
      },
    });

    return conversion;
  }

  /**
   * Obter cliques ao longo do tempo
   */
  private async getClicksOverTime(linkId: string, startDate: Date, groupBy: string) {
    // Esta é uma implementação simplificada
    // Em produção, você pode usar queries SQL mais complexas
    const clicks = await this.prisma.uTMClick.findMany({
      where: {
        utmLinkId: linkId,
        clickedAt: {
          gte: startDate,
        },
      },
      select: {
        clickedAt: true,
      },
      orderBy: {
        clickedAt: 'asc',
      },
    });

    // Agrupar por período
    const grouped = {};
    clicks.forEach((click) => {
      let key: string;
      const date = new Date(click.clickedAt);

      switch (groupBy) {
        case 'hour':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
          break;
        case 'day':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = `${weekStart.getFullYear()}-W${Math.ceil(weekStart.getDate() / 7)}`;
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      grouped[key] = (grouped[key] || 0) + 1;
    });

    return Object.entries(grouped).map(([date, count]) => ({
      date,
      count,
    }));
  }

  /**
   * Exportar dados UTM
   */
  async exportData(options: {
    format: 'csv' | 'json' | 'xlsx';
    dateRange: string;
    startDate?: string;
    endDate?: string;
    includeClicks: boolean;
    includeConversions: boolean;
    includeMetrics: boolean;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    organizationId: string;
  }) {
    // Calculate date range
    let startDate: Date;
    let endDate: Date = new Date();

    switch (options.dateRange) {
      case 'last7days':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last30days':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'last90days':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        startDate = options.startDate ? new Date(options.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        endDate = options.endDate ? new Date(options.endDate) : new Date();
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    // Build where clause for UTM links
    const whereClause: any = {
      organizationId: options.organizationId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (options.utmSource) whereClause.utmSource = { contains: options.utmSource };
    if (options.utmMedium) whereClause.utmMedium = { contains: options.utmMedium };
    if (options.utmCampaign) whereClause.utmCampaign = { contains: options.utmCampaign };

    // Fetch UTM links with related data
    const utmLinks = await this.prisma.UTMLink.findMany({
      where: whereClause,
      include: {
        clicks: options.includeClicks ? {
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        } : false,
        conversions: options.includeConversions ? {
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        } : false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Prepare export data
    const exportData = utmLinks.map(link => {
      const baseData = {
        id: link.id,
        title: link.title,
        originalUrl: link.originalUrl,
        shortUrl: link.shortUrl,
        shortCode: link.shortCode,
        utmSource: link.utmSource,
        utmMedium: link.utmMedium,
        utmCampaign: link.utmCampaign,
        utmTerm: link.utmTerm,
        utmContent: link.utmContent,
        status: link.status,
        createdAt: link.createdAt,
        expiresAt: link.expiresAt,
      };

      if (options.includeMetrics) {
        Object.assign(baseData, {
          clickCount: link.clickCount,
          conversionCount: link.conversionCount,
          conversionValue: link.conversionValue,
          conversionRate: link.clickCount > 0 ? (link.conversionCount / link.clickCount * 100).toFixed(2) + '%' : '0%',
        });
      }

      return baseData;
    });

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `utm-export-${timestamp}.${options.format}`;

    // Format data based on export format
    switch (options.format) {
      case 'csv':
        return {
          data: this.generateCSV(exportData),
          filename,
          mimeType: 'text/csv',
        };
      case 'json':
        return {
          data: JSON.stringify({
            exportDate: new Date().toISOString(),
            dateRange: {
              start: startDate.toISOString(),
              end: endDate.toISOString(),
            },
            filters: {
              utmSource: options.utmSource,
              utmMedium: options.utmMedium,
              utmCampaign: options.utmCampaign,
            },
            data: exportData,
            summary: {
              totalLinks: exportData.length,
              totalClicks: exportData.reduce((sum, item) => sum + (item.clickCount || 0), 0),
              totalConversions: exportData.reduce((sum, item) => sum + (item.conversionCount || 0), 0),
              totalValue: exportData.reduce((sum, item) => sum + (item.conversionValue || 0), 0),
            },
          }, null, 2),
          filename,
          mimeType: 'application/json',
        };
      case 'xlsx':
        // For now, return CSV format for XLSX (would need xlsx library for proper implementation)
        return {
          data: this.generateCSV(exportData),
          filename: filename.replace('.xlsx', '.csv'),
          mimeType: 'text/csv',
        };
      default:
        throw new Error('Formato de export não suportado');
    }
  }

  /**
   * Gerar CSV a partir dos dados
   */
  private generateCSV(data: any[]): string {
    if (data.length === 0) {
      return 'Nenhum dado encontrado';
    }

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = data.map(row => {
      return headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      }).join(',');
    });

    return [csvHeaders, ...csvRows].join('\n');
  }

  // Notification methods
  async getNotifications(organizationId: string, options: {
    page: number;
    limit: number;
    unreadOnly: boolean;
  }) {
    const skip = (options.page - 1) * options.limit;
    
    const whereClause: any = {
      organizationId
    };
    
    if (options.unreadOnly) {
      whereClause.isRead = false;
    }
    
    const [alerts, total] = await Promise.all([
      this.prisma.notificationAlert.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: options.limit,
        include: {
          rule: {
            select: {
              name: true
            }
          },
          utmLink: {
            select: {
              campaign: true
            }
          }
        }
      }),
      this.prisma.notificationAlert.count({ where: whereClause })
    ]);
    
    return {
      alerts: alerts.map(alert => ({
        id: alert.id,
        ruleId: alert.ruleId,
        ruleName: alert.rule.name,
        message: alert.message,
        severity: alert.severity,
        utmLinkId: alert.utmLinkId,
        utmCampaign: alert.utmLink?.campaign,
        data: alert.data as Record<string, any>,
        isRead: alert.isRead,
        createdAt: alert.createdAt.toISOString()
      })),
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        totalPages: Math.ceil(total / options.limit)
      }
    };
  }
  
  async createNotificationRule(organizationId: string, ruleData: any) {
    const rule = await this.prisma.notificationRule.create({
      data: {
        organizationId,
        name: ruleData.name,
        description: ruleData.description || '',
        isActive: ruleData.isActive ?? true,
        triggerType: ruleData.triggerType,
        condition: ruleData.condition,
        channels: ruleData.channels,
        recipients: ruleData.recipients,
        message: ruleData.message,
        utmCampaigns: ruleData.utmCampaigns || []
      }
    });
    
    return rule.id;
  }
  
  async getNotificationRules(organizationId: string) {
    const rules = await this.prisma.notificationRule.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            alerts: true
          }
        }
      }
    });
    
    return {
      rules: rules.map(rule => ({
        id: rule.id,
        name: rule.name,
        description: rule.description,
        isActive: rule.isActive,
        triggerType: rule.triggerType,
        condition: rule.condition as Record<string, any>,
        channels: rule.channels,
        recipients: rule.recipients,
        message: rule.message,
        utmCampaigns: rule.utmCampaigns,
        createdAt: rule.createdAt.toISOString(),
        lastTriggered: rule.lastTriggered?.toISOString(),
        alertCount: rule._count.alerts
      }))
    };
  }
  
  async updateNotificationRule(organizationId: string, ruleId: string, updateData: any) {
    await this.prisma.notificationRule.updateMany({
      where: {
        id: ruleId,
        organizationId
      },
      data: {
        name: updateData.name,
        description: updateData.description,
        isActive: updateData.isActive,
        triggerType: updateData.triggerType,
        condition: updateData.condition,
        channels: updateData.channels,
        recipients: updateData.recipients,
        message: updateData.message,
        utmCampaigns: updateData.utmCampaigns,
        updatedAt: new Date()
      }
    });
  }
  
  async deleteNotificationRule(organizationId: string, ruleId: string) {
    await this.prisma.notificationRule.deleteMany({
      where: {
        id: ruleId,
        organizationId
      }
    });
  }
  
  async markNotificationAsRead(organizationId: string, alertId: string) {
    await this.prisma.notificationAlert.updateMany({
      where: {
        id: alertId,
        organizationId
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });
  }
  
  // Method to check rules and trigger notifications
  async checkNotificationRules(utmLinkId: string) {
    const utmLink = await this.prisma.UTMLink.findUnique({
      where: { id: utmLinkId },
      include: {
        clicks: {
          where: {
            clickedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          }
        },
        conversions: {
          where: {
            convertedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          }
        }
      }
    });
    
    if (!utmLink) return;
    
    const rules = await this.prisma.notificationRule.findMany({
      where: {
        organizationId: utmLink.organizationId,
        isActive: true,
        OR: [
          { utmCampaigns: { isEmpty: true } },
          { utmCampaigns: { has: utmLink.utmCampaign } }
        ]
      }
    });
    
    for (const rule of rules) {
      const shouldTrigger = await this.evaluateRule(rule, utmLink);
      
      if (shouldTrigger) {
        await this.createAlert(rule, utmLink);
        
        // Update last triggered
        await this.prisma.notificationRule.update({
          where: { id: rule.id },
          data: { lastTriggered: new Date() }
        });
      }
    }
  }
  
  private async evaluateRule(rule: any, utmLink: any): Promise<boolean> {
    const condition = rule.condition as any;
    const clickCount = utmLink.clicks.length;
    const conversionCount = utmLink.conversions.length;
    const conversionRate = clickCount > 0 ? (conversionCount / clickCount) * 100 : 0;
    
    let value: number;
    
    switch (rule.triggerType) {
      case 'click_threshold':
        value = clickCount;
        break;
      case 'conversion_rate':
        value = conversionRate;
        break;
      default:
        return false;
    }
    
    switch (condition.operator) {
      case 'greater_than':
        return value > condition.value;
      case 'less_than':
        return value < condition.value;
      case 'equals':
        return value === condition.value;
      case 'between':
        return value >= condition.value && value <= (condition.secondValue || 0);
      default:
        return false;
    }
  }
  
  private async createAlert(rule: any, utmLink: any) {
    const clickCount = utmLink.clicks.length;
    const conversionCount = utmLink.conversions.length;
    const conversionRate = clickCount > 0 ? (conversionCount / clickCount) * 100 : 0;
    
    // Replace template variables in message
    let message = rule.message;
    message = message.replace(/{{campaign}}/g, utmLink.utmCampaign || 'N/A');
    message = message.replace(/{{clicks}}/g, clickCount.toString());
    message = message.replace(/{{conversions}}/g, conversionCount.toString());
    message = message.replace(/{{rate}}/g, conversionRate.toFixed(2));
    
    // Determine severity based on rule type and values
    let severity = 'medium';
    if (rule.triggerType === 'click_threshold' && clickCount > 5000) {
      severity = 'high';
    } else if (rule.triggerType === 'conversion_rate' && conversionRate < 1) {
      severity = 'critical';
    }
    
    await this.prisma.notificationAlert.create({
      data: {
        organizationId: utmLink.organizationId,
        ruleId: rule.id,
        utmLinkId: utmLink.id,
        message,
        severity,
        data: {
          clicks: clickCount,
          conversions: conversionCount,
          conversionRate,
          campaign: utmLink.utmCampaign
        },
        isRead: false
      }
    });
  }

  // Integration management methods
  async getIntegrations(organizationId: string) {
    const integrations = await this.prisma.integration.findMany({
      where: {
        organizationId
      },
      select: {
        id: true,
        platform: true,
        isActive: true,
        lastSync: true,
        accountName: true,
        syncStatus: true,
        settings: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return integrations;
  }

  async createIntegration(data: {
    organizationId: string;
    userId: string;
    platform: 'GOOGLE_ANALYTICS' | 'FACEBOOK_PIXEL' | 'GOOGLE_ADS' | 'WEBHOOK';
    config: Record<string, any>;
    accountName?: string;
  }) {
    // Validate configuration based on integration platform
    await this.validateIntegrationConfig(data.platform, data.config);

    const integration = await this.prisma.integration.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        platform: data.platform,
        settings: data.config,
        accountName: data.accountName || data.platform,
        isActive: false,
        syncStatus: 'PENDING'
      }
    });

    return integration;
  }

  async updateIntegration(id: string, data: {
    organizationId: string;
    accountName?: string;
    config?: Record<string, any>;
    isActive?: boolean;
  }) {
    // Verify integration belongs to organization
    const existingIntegration = await this.prisma.integration.findFirst({
      where: {
        id,
        organizationId: data.organizationId
      }
    });

    if (!existingIntegration) {
      throw new Error('Integration not found');
    }

    // Validate configuration if provided
    if (data.config) {
      await this.validateIntegrationConfig(existingIntegration.platform, data.config);
    }

    const updateData: any = {};
    if (data.accountName !== undefined) updateData.accountName = data.accountName;
    if (data.config !== undefined) updateData.settings = data.config;
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
      updateData.syncStatus = data.isActive ? 'SYNCING' : 'PENDING';
    }

    const integration = await this.prisma.integration.update({
      where: { id },
      data: updateData
    });

    return integration;
  }

  async deleteIntegration(id: string, organizationId: string) {
    // Verify integration belongs to organization
    const integration = await this.prisma.integration.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    await this.prisma.integration.delete({
      where: { id }
    });
  }

  async testIntegration(id: string, organizationId: string) {
    const integration = await this.prisma.integration.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    // Test connection based on integration platform
    const testResult = await this.performIntegrationTest(integration);

    // Update last sync time if test is successful
    if (testResult.success) {
      await this.prisma.integration.update({
        where: { id },
        data: {
          lastSync: new Date(),
          syncStatus: 'SYNCING',
          isActive: true,
          lastError: null
        }
      });
    } else {
      await this.prisma.integration.update({
        where: { id },
        data: {
          syncStatus: 'ERROR',
          lastError: testResult.error
        }
      });
    }

    return testResult;
  }

  async sendEventToIntegrations(data: {
    organizationId: string;
    eventType: string;
    eventData: Record<string, any>;
    utmLinkId?: string;
  }) {
    const integrations = await this.prisma.integration.findMany({
      where: {
        organizationId: data.organizationId,
        enabled: true,
        status: 'connected',
        events: {
          has: data.eventType
        }
      }
    });

    const results = [];

    for (const integration of integrations) {
      try {
        const result = await this.sendEventToIntegration(integration, data);
        results.push({
          integrationId: integration.id,
          integrationName: integration.name,
          success: true,
          result
        });
      } catch (error) {
        results.push({
          integrationId: integration.id,
          integrationName: integration.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  private async validateIntegrationConfig(platform: string, config: Record<string, any>) {
    switch (platform) {
      case 'GOOGLE_ANALYTICS':
        if (!config.measurementId || !config.apiSecret) {
          throw new Error('Google Analytics requires measurementId and apiSecret');
        }
        break;
      case 'FACEBOOK_PIXEL':
        if (!config.pixelId || !config.accessToken) {
          throw new Error('Facebook Pixel requires pixelId and accessToken');
        }
        break;
      case 'GOOGLE_ADS':
        if (!config.customerId || !config.conversionId) {
          throw new Error('Google Ads requires customerId and conversionId');
        }
        break;
      case 'WEBHOOK':
        if (!config.url) {
          throw new Error('Webhook requires url');
        }
        break;
      default:
        throw new Error(`Unknown integration platform: ${platform}`);
    }
  }

  private async performIntegrationTest(integration: any) {
    switch (integration.platform) {
      case 'GOOGLE_ANALYTICS':
        return await this.testGoogleAnalytics(integration.settings);
      case 'FACEBOOK_PIXEL':
        return await this.testFacebookPixel(integration.settings);
      case 'GOOGLE_ADS':
        return await this.testGoogleAds(integration.settings);
      case 'WEBHOOK':
        return await this.testWebhook(integration.settings);
      default:
        return { success: false, message: 'Unknown integration platform', error: 'Unsupported platform' };
    }
  }

  private async testGoogleAnalytics(config: any) {
    try {
      // Simulate Google Analytics API test
      // In real implementation, you would make an actual API call
      if (!config.measurementId || !config.apiSecret) {
        return { success: false, message: 'Invalid configuration' };
      }
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return { success: true, message: 'Google Analytics connection successful' };
    } catch (error) {
      return { success: false, message: 'Failed to connect to Google Analytics' };
    }
  }

  private async testFacebookPixel(config: any) {
    try {
      // Simulate Facebook Pixel API test
      if (!config.pixelId || !config.accessToken) {
        return { success: false, message: 'Invalid configuration' };
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return { success: true, message: 'Facebook Pixel connection successful' };
    } catch (error) {
      return { success: false, message: 'Failed to connect to Facebook Pixel' };
    }
  }

  private async testGoogleAds(config: any) {
    try {
      // Simulate Google Ads API test
      if (!config.customerId || !config.conversionId) {
        return { success: false, message: 'Invalid configuration' };
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return { success: true, message: 'Google Ads connection successful' };
    } catch (error) {
      return { success: false, message: 'Failed to connect to Google Ads' };
    }
  }

  private async testWebhook(config: any) {
    try {
      // Test webhook by sending a test payload
      const testPayload = {
        test: true,
        timestamp: new Date().toISOString(),
        message: 'Test webhook connection'
      };

      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers
        },
        body: JSON.stringify(testPayload)
      });

      if (response.ok) {
        return { success: true, message: 'Webhook connection successful' };
      } else {
        return { success: false, message: `Webhook returned status ${response.status}` };
      }
    } catch (error) {
      return { success: false, message: 'Failed to connect to webhook' };
    }
  }

  private async sendEventToIntegration(integration: any, eventData: any) {
    switch (integration.type) {
      case 'google_analytics':
        return await this.sendToGoogleAnalytics(integration.config, eventData);
      case 'facebook_pixel':
        return await this.sendToFacebookPixel(integration.config, eventData);
      case 'google_ads':
        return await this.sendToGoogleAds(integration.config, eventData);
      case 'webhook':
        return await this.sendToWebhook(integration.config, eventData);
      default:
        throw new Error('Unknown integration type');
    }
  }

  private async sendToGoogleAnalytics(config: any, eventData: any) {
    // Simulate sending event to Google Analytics
    const payload = {
      client_id: eventData.clientId || 'anonymous',
      events: [{
        name: eventData.eventType,
        params: {
          ...eventData.eventData,
          utm_source: eventData.eventData.utm_source,
          utm_medium: eventData.eventData.utm_medium,
          utm_campaign: eventData.eventData.utm_campaign
        }
      }]
    };

    // In real implementation, send to GA4 Measurement Protocol
    console.log('Sending to Google Analytics:', payload);
    
    return { success: true, payload };
  }

  private async sendToFacebookPixel(config: any, eventData: any) {
    // Simulate sending event to Facebook Pixel
    const payload = {
      data: [{
        event_name: eventData.eventType,
        event_time: Math.floor(Date.now() / 1000),
        custom_data: eventData.eventData,
        user_data: {
          client_ip_address: eventData.clientIp,
          client_user_agent: eventData.userAgent
        }
      }]
    };

    console.log('Sending to Facebook Pixel:', payload);
    
    return { success: true, payload };
  }

  private async sendToGoogleAds(config: any, eventData: any) {
    // Simulate sending conversion to Google Ads
    const payload = {
      conversion_action: config.conversionId,
      conversion_value: eventData.eventData.value || 0,
      conversion_time: new Date().toISOString(),
      order_id: eventData.eventData.orderId
    };

    console.log('Sending to Google Ads:', payload);
    
    return { success: true, payload };
  }

  private async sendToWebhook(config: any, eventData: any) {
    const payload = {
      event_type: eventData.eventType,
      event_data: eventData.eventData,
      utm_link_id: eventData.utmLinkId,
      timestamp: new Date().toISOString()
    };

    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Webhook failed with status ${response.status}`);
    }

    return { success: true, payload, response: await response.text() };
  }

  /**
   * Gerar ID de sessão
   */
  private generateSessionId(ipAddress?: string, userAgent?: string): string {
    const crypto = require('crypto');
    const data = `${ipAddress || 'unknown'}-${userAgent || 'unknown'}`;
    return crypto.createHash('md5').update(data).digest('hex');
  }
}