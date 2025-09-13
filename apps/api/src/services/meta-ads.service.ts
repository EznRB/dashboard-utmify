import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { CryptoService } from './crypto.service';
import axios, { AxiosInstance } from 'axios';
import { Cron, CronExpression } from '@nestjs/schedule';

interface MetaOAuthTokens {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

interface MetaAdAccount {
  id: string;
  name: string;
  account_status: number;
  currency: string;
  timezone_name: string;
  business?: {
    id: string;
    name: string;
  };
}

interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  created_time: string;
  updated_time: string;
  start_time?: string;
  stop_time?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  budget_remaining?: string;
  account_id: string;
}

interface MetaCampaignInsights {
  campaign_id: string;
  impressions: string;
  clicks: string;
  spend: string;
  ctr: string;
  cpc: string;
  cpp: string;
  cpm: string;
  reach: string;
  frequency: string;
  actions?: Array<{
    action_type: string;
    value: string;
  }>;
  cost_per_action_type?: Array<{
    action_type: string;
    value: string;
  }>;
  date_start: string;
  date_stop: string;
}

interface WebhookEntry {
  id: string;
  time: number;
  changes: Array<{
    field: string;
    value: any;
  }>;
}

@Injectable()
export class MetaAdsService {
  private readonly logger = new Logger(MetaAdsService.name);
  private readonly apiClient: AxiosInstance;
  private readonly baseUrl = 'https://graph.facebook.com/v18.0';
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
  ) {
    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
    });

    // Add request interceptor for rate limiting
    this.apiClient.interceptors.request.use(
      (config) => {
        this.logger.debug(`Making request to: ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling and retries
    this.apiClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        const { config, response } = error;
        
        // Handle rate limiting (HTTP 429)
        if (response?.status === 429) {
          const retryAfter = parseInt(response.headers['retry-after'] || '60', 10);
          this.logger.warn(`Rate limited. Retrying after ${retryAfter} seconds`);
          
          await this.delay(retryAfter * 1000);
          return this.apiClient.request(config);
        }

        // Handle token expiration (HTTP 401)
        if (response?.status === 401) {
          this.logger.warn('Access token expired, attempting refresh');
          // Token refresh logic will be handled by the calling method
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Generate OAuth authorization URL
   */
  generateAuthUrl(userId: string, redirectUri: string): string {
    const clientId = this.configService.get<string>('META_APP_ID');
    const scope = 'ads_read,ads_management,business_management';
    const state = this.cryptoService.encrypt(JSON.stringify({ userId, timestamp: Date.now() }));

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
      response_type: 'code',
      state,
    });

    return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string, redirectUri: string): Promise<MetaOAuthTokens> {
    const clientId = this.configService.get<string>('META_APP_ID');
    const clientSecret = this.configService.get<string>('META_APP_SECRET');

    try {
      const response = await this.apiClient.post('/oauth/access_token', null, {
        params: {
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          code,
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to exchange code for token', error.response?.data);
      throw new BadRequestException('Failed to obtain access token');
    }
  }

  /**
   * Get long-lived access token
   */
  async getLongLivedToken(shortLivedToken: string): Promise<MetaOAuthTokens> {
    const clientId = this.configService.get<string>('META_APP_ID');
    const clientSecret = this.configService.get<string>('META_APP_SECRET');

    try {
      const response = await this.apiClient.get('/oauth/access_token', {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: clientId,
          client_secret: clientSecret,
          fb_exchange_token: shortLivedToken,
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to get long-lived token', error.response?.data);
      throw new BadRequestException('Failed to obtain long-lived token');
    }
  }

  /**
   * Store encrypted tokens in database
   */
  async storeTokens(userId: string, tokens: MetaOAuthTokens): Promise<void> {
    const encryptedAccessToken = this.cryptoService.encrypt(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token 
      ? this.cryptoService.encrypt(tokens.refresh_token) 
      : null;

    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000));

    await this.prisma.integration.upsert({
      where: {
        userId_provider: {
          userId,
          provider: 'META_ADS',
        },
      },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        isActive: true,
        lastSyncAt: new Date(),
      },
      create: {
        userId,
        provider: 'META_ADS',
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        isActive: true,
        lastSyncAt: new Date(),
      },
    });
  }

  /**
   * Get decrypted access token for user
   */
  async getAccessToken(userId: string): Promise<string> {
    const integration = await this.prisma.integration.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: 'META_ADS',
        },
      },
    });

    if (!integration || !integration.isActive) {
      throw new UnauthorizedException('Meta Ads integration not found or inactive');
    }

    // Check if token is expired
    if (integration.expiresAt && integration.expiresAt < new Date()) {
      this.logger.warn(`Access token expired for user ${userId}`);
      // In a real implementation, you would refresh the token here
      throw new UnauthorizedException('Access token expired');
    }

    return this.cryptoService.decrypt(integration.accessToken);
  }

  /**
   * Get user's ad accounts
   */
  async getAdAccounts(userId: string): Promise<MetaAdAccount[]> {
    const accessToken = await this.getAccessToken(userId);

    try {
      const response = await this.apiClient.get('/me/adaccounts', {
        params: {
          access_token: accessToken,
          fields: 'id,name,account_status,currency,timezone_name,business{id,name}',
        },
      });

      return response.data.data || [];
    } catch (error) {
      this.logger.error('Failed to fetch ad accounts', error.response?.data);
      throw new BadRequestException('Failed to fetch ad accounts');
    }
  }

  /**
   * Get campaigns for an ad account
   */
  async getCampaigns(userId: string, adAccountId: string): Promise<MetaCampaign[]> {
    const accessToken = await this.getAccessToken(userId);

    try {
      const response = await this.apiClient.get(`/${adAccountId}/campaigns`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,status,objective,created_time,updated_time,start_time,stop_time,daily_budget,lifetime_budget,budget_remaining',
          limit: 100,
        },
      });

      return response.data.data || [];
    } catch (error) {
      this.logger.error('Failed to fetch campaigns', error.response?.data);
      throw new BadRequestException('Failed to fetch campaigns');
    }
  }

  /**
   * Get campaign insights (metrics)
   */
  async getCampaignInsights(
    userId: string,
    campaignId: string,
    dateRange?: { since: string; until: string }
  ): Promise<MetaCampaignInsights[]> {
    const accessToken = await this.getAccessToken(userId);

    const params: any = {
      access_token: accessToken,
      fields: 'impressions,clicks,spend,ctr,cpc,cpp,cpm,reach,frequency,actions,cost_per_action_type',
      level: 'campaign',
    };

    if (dateRange) {
      params.time_range = JSON.stringify({
        since: dateRange.since,
        until: dateRange.until,
      });
    }

    try {
      const response = await this.apiClient.get(`/${campaignId}/insights`, {
        params,
      });

      return response.data.data || [];
    } catch (error) {
      this.logger.error('Failed to fetch campaign insights', error.response?.data);
      throw new BadRequestException('Failed to fetch campaign insights');
    }
  }

  /**
   * Sync campaigns and metrics for a user
   */
  async syncUserData(userId: string): Promise<void> {
    this.logger.log(`Starting sync for user ${userId}`);

    try {
      const adAccounts = await this.getAdAccounts(userId);
      
      for (const account of adAccounts) {
        await this.syncAdAccountData(userId, account);
      }

      // Update last sync timestamp
      await this.prisma.integration.update({
        where: {
          userId_provider: {
            userId,
            provider: 'META_ADS',
          },
        },
        data: {
          lastSyncAt: new Date(),
        },
      });

      this.logger.log(`Sync completed for user ${userId}`);
    } catch (error) {
      this.logger.error(`Sync failed for user ${userId}`, error);
      throw error;
    }
  }

  /**
   * Sync data for a specific ad account
   */
  private async syncAdAccountData(userId: string, account: MetaAdAccount): Promise<void> {
    try {
      const campaigns = await this.getCampaigns(userId, account.id);
      
      for (const campaign of campaigns) {
        // Store campaign data
        await this.storeCampaignData(userId, account, campaign);
        
        // Get and store insights
        const insights = await this.getCampaignInsights(userId, campaign.id);
        await this.storeCampaignInsights(userId, campaign.id, insights);
      }
    } catch (error) {
      this.logger.error(`Failed to sync ad account ${account.id}`, error);
    }
  }

  /**
   * Store campaign data in database
   */
  private async storeCampaignData(
    userId: string,
    account: MetaAdAccount,
    campaign: MetaCampaign
  ): Promise<void> {
    await this.prisma.campaign.upsert({
      where: {
        externalId_platform: {
          externalId: campaign.id,
          platform: 'META_ADS',
        },
      },
      update: {
        name: campaign.name,
        status: campaign.status.toUpperCase(),
        objective: campaign.objective,
        startDate: campaign.start_time ? new Date(campaign.start_time) : null,
        endDate: campaign.stop_time ? new Date(campaign.stop_time) : null,
        dailyBudget: campaign.daily_budget ? parseFloat(campaign.daily_budget) : null,
        totalBudget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) : null,
        updatedAt: new Date(),
      },
      create: {
        userId,
        externalId: campaign.id,
        platform: 'META_ADS',
        name: campaign.name,
        status: campaign.status.toUpperCase(),
        objective: campaign.objective,
        startDate: campaign.start_time ? new Date(campaign.start_time) : null,
        endDate: campaign.stop_time ? new Date(campaign.stop_time) : null,
        dailyBudget: campaign.daily_budget ? parseFloat(campaign.daily_budget) : null,
        totalBudget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) : null,
        adAccountId: account.id,
        createdAt: new Date(campaign.created_time),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Store campaign insights in database
   */
  private async storeCampaignInsights(
    userId: string,
    campaignId: string,
    insights: MetaCampaignInsights[]
  ): Promise<void> {
    for (const insight of insights) {
      const conversions = insight.actions?.find(action => 
        ['purchase', 'complete_registration', 'lead'].includes(action.action_type)
      )?.value || '0';

      await this.prisma.campaignMetric.upsert({
        where: {
          campaignExternalId_date_platform: {
            campaignExternalId: campaignId,
            date: new Date(insight.date_start),
            platform: 'META_ADS',
          },
        },
        update: {
          impressions: parseInt(insight.impressions || '0'),
          clicks: parseInt(insight.clicks || '0'),
          spend: parseFloat(insight.spend || '0'),
          conversions: parseInt(conversions),
          ctr: parseFloat(insight.ctr || '0'),
          cpc: parseFloat(insight.cpc || '0'),
          cpm: parseFloat(insight.cpm || '0'),
          reach: parseInt(insight.reach || '0'),
          frequency: parseFloat(insight.frequency || '0'),
          updatedAt: new Date(),
        },
        create: {
          campaignExternalId: campaignId,
          platform: 'META_ADS',
          date: new Date(insight.date_start),
          impressions: parseInt(insight.impressions || '0'),
          clicks: parseInt(insight.clicks || '0'),
          spend: parseFloat(insight.spend || '0'),
          conversions: parseInt(conversions),
          ctr: parseFloat(insight.ctr || '0'),
          cpc: parseFloat(insight.cpc || '0'),
          cpm: parseFloat(insight.cpm || '0'),
          reach: parseInt(insight.reach || '0'),
          frequency: parseFloat(insight.frequency || '0'),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const appSecret = this.configService.get<string>('META_APP_SECRET');
    const crypto = require('crypto');
    
    const expectedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(payload)
      .digest('hex');
    
    return signature === `sha256=${expectedSignature}`;
  }

  /**
   * Process webhook data
   */
  async processWebhook(entries: WebhookEntry[]): Promise<void> {
    for (const entry of entries) {
      for (const change of entry.changes) {
        if (change.field === 'campaigns') {
          await this.handleCampaignChange(entry.id, change.value);
        } else if (change.field === 'insights') {
          await this.handleInsightsChange(entry.id, change.value);
        }
      }
    }
  }

  /**
   * Handle campaign changes from webhook
   */
  private async handleCampaignChange(adAccountId: string, changeValue: any): Promise<void> {
    this.logger.log(`Processing campaign change for ad account ${adAccountId}`);
    
    // Find users with this ad account integration
    const integrations = await this.prisma.integration.findMany({
      where: {
        provider: 'META_ADS',
        isActive: true,
      },
    });

    for (const integration of integrations) {
      try {
        // Trigger sync for this user
        await this.syncUserData(integration.userId);
      } catch (error) {
        this.logger.error(`Failed to sync user ${integration.userId} after webhook`, error);
      }
    }
  }

  /**
   * Handle insights changes from webhook
   */
  private async handleInsightsChange(adAccountId: string, changeValue: any): Promise<void> {
    this.logger.log(`Processing insights change for ad account ${adAccountId}`);
    // Similar to campaign change handling
  }

  /**
   * Scheduled sync job - runs every 15 minutes
   */
  @Cron(CronExpression.EVERY_15_MINUTES)
  async scheduledSync(): Promise<void> {
    this.logger.log('Starting scheduled Meta Ads sync');

    const integrations = await this.prisma.integration.findMany({
      where: {
        provider: 'META_ADS',
        isActive: true,
      },
    });

    for (const integration of integrations) {
      try {
        await this.syncUserData(integration.userId);
      } catch (error) {
        this.logger.error(`Scheduled sync failed for user ${integration.userId}`, error);
      }
    }

    this.logger.log('Scheduled Meta Ads sync completed');
  }

  /**
   * Utility method to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry mechanism for API calls
   */
  private async retryApiCall<T>(
    apiCall: () => Promise<T>,
    retries: number = this.maxRetries
  ): Promise<T> {
    try {
      return await apiCall();
    } catch (error) {
      if (retries > 0 && error.response?.status >= 500) {
        this.logger.warn(`API call failed, retrying... (${retries} retries left)`);
        await this.delay(this.retryDelay);
        return this.retryApiCall(apiCall, retries - 1);
      }
      throw error;
    }
  }
}