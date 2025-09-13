import { PrismaService } from '../database/prisma.service';
import { CryptoService } from './crypto.service';
import { GoogleAdsApi, Customer, enums } from 'google-ads-api';
import axios from 'axios';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/errors';

interface GoogleOAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface GoogleAdsAccount {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  status: string;
  type: string;
}

interface GoogleAdsCampaign {
  id: string;
  name: string;
  status: string;
  type: string;
  start_date?: string;
  end_date?: string;
  budget_amount?: number;
  budget_type?: string;
  customer_id: string;
}

interface GoogleAdsKeyword {
  id: string;
  text: string;
  match_type: string;
  status: string;
  quality_score?: number;
  first_page_cpc?: number;
  top_of_page_cpc?: number;
  campaign_id: string;
  ad_group_id: string;
}

interface GoogleAdsCampaignMetrics {
  campaign_id: string;
  impressions: number;
  clicks: number;
  cost_micros: number;
  conversions: number;
  ctr: number;
  average_cpc: number;
  cost_per_conversion?: number;
  date: string;
}

interface SearchTermReport {
  search_term: string;
  impressions: number;
  clicks: number;
  cost_micros: number;
  conversions: number;
  campaign_id: string;
  ad_group_id: string;
  keyword_id?: string;
}

export class GoogleAdsService {
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;
  private readonly googleAdsClients = new Map<string, GoogleAdsApi>();
  private readonly googleAdsConfig: any;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
    googleAdsConfig?: any
  ) {
    this.googleAdsConfig = googleAdsConfig;
  }

  /**
   * Generate OAuth 2.0 authorization URL
   */
  generateAuthUrl(userId: string, redirectUri: string): string {
    if (!this.googleAdsConfig) {
      throw new ApiError('Google Ads integration not configured', 'GOOGLE_ADS_NOT_CONFIGURED', 400);
    }

    const state = this.cryptoService.encrypt(JSON.stringify({ userId, redirectUri }));
    const scopes = ['https://www.googleapis.com/auth/adwords'];
    
    const params = new URLSearchParams({
      client_id: this.googleAdsConfig.clientId,
      redirect_uri: redirectUri,
      scope: scopes.join(' '),
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForToken(code: string, redirectUri: string): Promise<GoogleOAuthTokens> {
    if (!this.googleAdsConfig) {
      throw new ApiError('Google Ads integration not configured', 'GOOGLE_ADS_NOT_CONFIGURED', 400);
    }

    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: this.googleAdsConfig.clientId,
        client_secret: this.googleAdsConfig.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to exchange code for token', error);
      throw new ApiError('Failed to exchange authorization code', 'TOKEN_EXCHANGE_FAILED', 400);
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<GoogleOAuthTokens> {
    if (!this.googleAdsConfig) {
      throw new ApiError('Google Ads integration not configured', 'GOOGLE_ADS_NOT_CONFIGURED', 400);
    }

    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: this.googleAdsConfig.clientId,
        client_secret: this.googleAdsConfig.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      });

      return {
        ...response.data,
        refresh_token: refreshToken, // Keep the original refresh token
      };
    } catch (error) {
      logger.error('Failed to refresh access token', error);
      throw new ApiError('Failed to refresh access token', 'TOKEN_REFRESH_FAILED', 401);
    }
  }

  /**
   * Store OAuth tokens securely
   */
  async storeTokens(userId: string, tokens: GoogleOAuthTokens): Promise<void> {
    const encryptedAccessToken = this.cryptoService.encrypt(tokens.access_token);
    const encryptedRefreshToken = this.cryptoService.encrypt(tokens.refresh_token);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await this.prisma.integration.upsert({
      where: {
        userId_platform: {
          userId,
          platform: 'GOOGLE_ADS',
        },
      },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        isActive: true,
        lastSync: new Date(),
      },
      create: {
        userId,
        platform: 'GOOGLE_ADS',
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        isActive: true,
        lastSync: new Date(),
      },
    });

    logger.info(`Stored Google Ads tokens for user ${userId}`);
  }

  /**
   * Get valid access token (refresh if needed)
   */
  async getAccessToken(userId: string): Promise<string> {
    const integration = await this.prisma.integration.findUnique({
      where: {
        userId_platform: {
          userId,
          platform: 'GOOGLE_ADS',
        },
      },
    });

    if (!integration || !integration.isActive) {
      throw new ApiError('Google Ads integration not found or inactive', 'INTEGRATION_NOT_FOUND', 401);
    }

    // Check if token is expired
    if (integration.expiresAt && integration.expiresAt <= new Date()) {
      const refreshToken = this.cryptoService.decrypt(integration.refreshToken!);
      const newTokens = await this.refreshAccessToken(refreshToken);
      await this.storeTokens(userId, newTokens);
      return newTokens.access_token;
    }

    return this.cryptoService.decrypt(integration.accessToken!);
  }

  /**
   * Get Google Ads API client for user
   */
  private async getGoogleAdsClient(userId: string): Promise<GoogleAdsApi> {
    if (!this.googleAdsConfig) {
      throw new ApiError('Google Ads integration not configured', 'GOOGLE_ADS_NOT_CONFIGURED', 400);
    }

    const cacheKey = `google-ads-client-${userId}`;
    
    if (this.googleAdsClients.has(cacheKey)) {
      return this.googleAdsClients.get(cacheKey)!;
    }

    const accessToken = await this.getAccessToken(userId);
    
    const client = new GoogleAdsApi({
      client_id: this.googleAdsConfig.clientId,
      client_secret: this.googleAdsConfig.clientSecret,
      developer_token: this.googleAdsConfig.developerToken,
    });

    // Set the access token for the client
    client.Customer.credentials = {
      access_token: accessToken,
    };

    this.googleAdsClients.set(cacheKey, client);
    return client;
  }

  /**
   * Get accessible customer accounts
   */
  async getCustomerAccounts(userId: string): Promise<GoogleAdsAccount[]> {
    try {
      const client = await this.getGoogleAdsClient(userId);
      
      const query = `
        SELECT 
          customer.id,
          customer.descriptive_name,
          customer.currency_code,
          customer.time_zone,
          customer.status,
          customer.manager
        FROM customer
        WHERE customer.status = 'ENABLED'
      `;

      const customers = await client.Customer().report({
        query,
        login_customer_id: this.googleAdsConfig?.loginCustomerId,
      });

      return customers.map((customer: any) => ({
        id: customer.customer.id.toString(),
        name: customer.customer.descriptive_name || `Customer ${customer.customer.id}`,
        currency: customer.customer.currency_code,
        timezone: customer.customer.time_zone,
        status: customer.customer.status,
        type: customer.customer.manager ? 'MANAGER' : 'CLIENT',
      }));
    } catch (error) {
      logger.error('Failed to get customer accounts', error);
      throw new ApiError('Failed to retrieve customer accounts', 'CUSTOMER_ACCOUNTS_FAILED', 400);
    }
  }

  /**
   * Get campaigns for a customer
   */
  async getCampaigns(userId: string, customerId: string): Promise<GoogleAdsCampaign[]> {
    try {
      const client = await this.getGoogleAdsClient(userId);
      
      const query = `
        SELECT 
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.advertising_channel_type,
          campaign.start_date,
          campaign.end_date,
          campaign_budget.amount_micros,
          campaign_budget.type
        FROM campaign
        WHERE campaign.status != 'REMOVED'
        ORDER BY campaign.name
      `;

      const campaigns = await client.Customer({ customer_id: customerId }).report({
        query,
      });

      return campaigns.map((campaign: any) => ({
        id: campaign.campaign.id.toString(),
        name: campaign.campaign.name,
        status: campaign.campaign.status,
        type: campaign.campaign.advertising_channel_type,
        start_date: campaign.campaign.start_date,
        end_date: campaign.campaign.end_date,
        budget_amount: campaign.campaign_budget?.amount_micros ? 
          parseInt(campaign.campaign_budget.amount_micros) / 1000000 : undefined,
        budget_type: campaign.campaign_budget?.type,
        customer_id: customerId,
      }));
    } catch (error) {
      logger.error('Failed to get campaigns', error);
      throw new ApiError('Failed to retrieve campaigns', 'CAMPAIGNS_FAILED', 400);
    }
  }

  /**
   * Get keywords for campaigns
   */
  async getKeywords(userId: string, customerId: string, campaignIds?: string[]): Promise<GoogleAdsKeyword[]> {
    try {
      const client = await this.getGoogleAdsClient(userId);
      
      let whereClause = 'ad_group_criterion.status != "REMOVED" AND ad_group_criterion.type = "KEYWORD"';
      if (campaignIds && campaignIds.length > 0) {
        const campaignFilter = campaignIds.map(id => `"${id}"`).join(',');
        whereClause += ` AND campaign.id IN (${campaignFilter})`;
      }

      const query = `
        SELECT 
          ad_group_criterion.criterion_id,
          ad_group_criterion.keyword.text,
          ad_group_criterion.keyword.match_type,
          ad_group_criterion.status,
          ad_group_criterion.quality_info.quality_score,
          ad_group_criterion.position_estimates.first_page_cpc_micros,
          ad_group_criterion.position_estimates.top_of_page_cpc_micros,
          campaign.id,
          ad_group.id
        FROM keyword_view
        WHERE ${whereClause}
        ORDER BY ad_group_criterion.keyword.text
      `;

      const keywords = await client.Customer({ customer_id: customerId }).report({
        query,
      });

      return keywords.map((keyword: any) => ({
        id: keyword.ad_group_criterion.criterion_id.toString(),
        text: keyword.ad_group_criterion.keyword.text,
        match_type: keyword.ad_group_criterion.keyword.match_type,
        status: keyword.ad_group_criterion.status,
        quality_score: keyword.ad_group_criterion.quality_info?.quality_score,
        first_page_cpc: keyword.ad_group_criterion.position_estimates?.first_page_cpc_micros ?
          parseInt(keyword.ad_group_criterion.position_estimates.first_page_cpc_micros) / 1000000 : undefined,
        top_of_page_cpc: keyword.ad_group_criterion.position_estimates?.top_of_page_cpc_micros ?
          parseInt(keyword.ad_group_criterion.position_estimates.top_of_page_cpc_micros) / 1000000 : undefined,
        campaign_id: keyword.campaign.id.toString(),
        ad_group_id: keyword.ad_group.id.toString(),
      }));
    } catch (error) {
      logger.error('Failed to get keywords', error);
      throw new ApiError('Failed to retrieve keywords', 'KEYWORDS_FAILED', 400);
    }
  }

  /**
   * Get campaign performance metrics
   */
  async getCampaignMetrics(
    userId: string,
    customerId: string,
    dateRange?: { startDate: string; endDate: string }
  ): Promise<GoogleAdsCampaignMetrics[]> {
    try {
      const client = await this.getGoogleAdsClient(userId);
      
      let dateFilter = '';
      if (dateRange) {
        dateFilter = `AND segments.date >= '${dateRange.startDate}' AND segments.date <= '${dateRange.endDate}'`;
      }

      const query = `
        SELECT 
          campaign.id,
          segments.date,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.ctr,
          metrics.average_cpc
        FROM campaign
        WHERE campaign.status != 'REMOVED' ${dateFilter}
        ORDER BY segments.date DESC, campaign.name
      `;

      const metrics = await client.Customer({ customer_id: customerId }).report({
        query,
      });

      return metrics.map((metric: any) => ({
        campaign_id: metric.campaign.id.toString(),
        impressions: parseInt(metric.metrics.impressions) || 0,
        clicks: parseInt(metric.metrics.clicks) || 0,
        cost_micros: parseInt(metric.metrics.cost_micros) || 0,
        conversions: parseFloat(metric.metrics.conversions) || 0,
        ctr: parseFloat(metric.metrics.ctr) || 0,
        average_cpc: parseInt(metric.metrics.average_cpc) || 0,
        cost_per_conversion: metric.metrics.conversions > 0 ?
          parseInt(metric.metrics.cost_micros) / parseFloat(metric.metrics.conversions) / 1000000 : undefined,
        date: metric.segments.date,
      }));
    } catch (error) {
      logger.error('Failed to get campaign metrics', error);
      throw new ApiError('Failed to retrieve campaign metrics', 'CAMPAIGN_METRICS_FAILED', 400);
    }
  }

  /**
   * Get search terms report
   */
  async getSearchTermsReport(
    userId: string,
    customerId: string,
    dateRange?: { startDate: string; endDate: string }
  ): Promise<SearchTermReport[]> {
    try {
      const client = await this.getGoogleAdsClient(userId);
      
      let dateFilter = '';
      if (dateRange) {
        dateFilter = `AND segments.date >= '${dateRange.startDate}' AND segments.date <= '${dateRange.endDate}'`;
      }

      const query = `
        SELECT 
          search_term_view.search_term,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          campaign.id,
          ad_group.id,
          ad_group_criterion.criterion_id
        FROM search_term_view
        WHERE search_term_view.status != 'NONE' ${dateFilter}
        ORDER BY metrics.impressions DESC
      `;

      const searchTerms = await client.Customer({ customer_id: customerId }).report({
        query,
      });

      return searchTerms.map((term: any) => ({
        search_term: term.search_term_view.search_term,
        impressions: parseInt(term.metrics.impressions) || 0,
        clicks: parseInt(term.metrics.clicks) || 0,
        cost_micros: parseInt(term.metrics.cost_micros) || 0,
        conversions: parseFloat(term.metrics.conversions) || 0,
        campaign_id: term.campaign.id.toString(),
        ad_group_id: term.ad_group.id.toString(),
        keyword_id: term.ad_group_criterion?.criterion_id?.toString(),
      }));
    } catch (error) {
      logger.error('Failed to get search terms report', error);
      throw new ApiError('Failed to retrieve search terms report', 'SEARCH_TERMS_FAILED', 400);
    }
  }

  /**
   * Sync user data from Google Ads
   */
  async syncUserData(userId: string, force = false): Promise<void> {
    try {
      logger.info(`Starting Google Ads sync for user ${userId}`);
      
      const accounts = await this.getCustomerAccounts(userId);
      
      for (const account of accounts) {
        if (account.type === 'CLIENT') { // Only sync client accounts, not manager accounts
          await this.syncAccountData(userId, account);
        }
      }
      
      // Update last sync timestamp
      await this.prisma.integration.update({
        where: {
          userId_platform: {
            userId,
            platform: 'GOOGLE_ADS',
          },
        },
        data: {
          lastSync: new Date(),
        },
      });
      
      logger.info(`Completed Google Ads sync for user ${userId}`);
    } catch (error) {
      logger.error(`Failed to sync Google Ads data for user ${userId}`, error);
      throw error;
    }
  }

  /**
   * Sync data for a specific account
   */
  private async syncAccountData(userId: string, account: GoogleAdsAccount): Promise<void> {
    try {
      // Sync campaigns
      const campaigns = await this.getCampaigns(userId, account.id);
      
      for (const campaign of campaigns) {
        await this.storeCampaignData(userId, account, campaign);
        
        // Sync keywords for this campaign
        const keywords = await this.getKeywords(userId, account.id, [campaign.id]);
        for (const keyword of keywords) {
          await this.storeKeywordData(userId, keyword);
        }
        
        // Sync metrics for the last 30 days
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const metrics = await this.getCampaignMetrics(userId, account.id, { startDate, endDate });
        for (const metric of metrics) {
          await this.storeCampaignMetrics(userId, metric);
        }
      }
    } catch (error) {
      logger.error(`Failed to sync account data for ${account.id}`, error);
    }
  }

  /**
   * Store campaign data in database
   */
  private async storeCampaignData(
    userId: string,
    account: GoogleAdsAccount,
    campaign: GoogleAdsCampaign
  ): Promise<void> {
    await this.prisma.campaign.upsert({
      where: {
        externalId_platform: {
          externalId: campaign.id,
          platform: 'GOOGLE_ADS',
        },
      },
      update: {
        name: campaign.name,
        status: campaign.status,
        type: campaign.type,
        startDate: campaign.start_date ? new Date(campaign.start_date) : null,
        endDate: campaign.end_date ? new Date(campaign.end_date) : null,
        budget: campaign.budget_amount,
        updatedAt: new Date(),
      },
      create: {
        externalId: campaign.id,
        platform: 'GOOGLE_ADS',
        userId,
        accountId: account.id,
        name: campaign.name,
        status: campaign.status,
        type: campaign.type,
        startDate: campaign.start_date ? new Date(campaign.start_date) : null,
        endDate: campaign.end_date ? new Date(campaign.end_date) : null,
        budget: campaign.budget_amount,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Store keyword data in database
   */
  private async storeKeywordData(userId: string, keyword: GoogleAdsKeyword): Promise<void> {
    await this.prisma.keyword.upsert({
      where: {
        externalId_platform: {
          externalId: keyword.id,
          platform: 'GOOGLE_ADS',
        },
      },
      update: {
        text: keyword.text,
        matchType: keyword.match_type,
        status: keyword.status,
        qualityScore: keyword.quality_score,
        firstPageCpc: keyword.first_page_cpc,
        topOfPageCpc: keyword.top_of_page_cpc,
        updatedAt: new Date(),
      },
      create: {
        externalId: keyword.id,
        platform: 'GOOGLE_ADS',
        userId,
        campaignId: keyword.campaign_id,
        adGroupId: keyword.ad_group_id,
        text: keyword.text,
        matchType: keyword.match_type,
        status: keyword.status,
        qualityScore: keyword.quality_score,
        firstPageCpc: keyword.first_page_cpc,
        topOfPageCpc: keyword.top_of_page_cpc,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Store campaign metrics in database
   */
  private async storeCampaignMetrics(userId: string, metrics: GoogleAdsCampaignMetrics): Promise<void> {
    await this.prisma.campaignMetric.upsert({
      where: {
        campaignId_date_platform: {
          campaignId: metrics.campaign_id,
          date: new Date(metrics.date),
          platform: 'GOOGLE_ADS',
        },
      },
      update: {
        impressions: metrics.impressions,
        clicks: metrics.clicks,
        cost: metrics.cost_micros / 1000000, // Convert micros to currency
        conversions: metrics.conversions,
        ctr: metrics.ctr,
        averageCpc: metrics.average_cpc / 1000000, // Convert micros to currency
        costPerConversion: metrics.cost_per_conversion,
        updatedAt: new Date(),
      },
      create: {
        campaignId: metrics.campaign_id,
        platform: 'GOOGLE_ADS',
        userId,
        date: new Date(metrics.date),
        impressions: metrics.impressions,
        clicks: metrics.clicks,
        cost: metrics.cost_micros / 1000000,
        conversions: metrics.conversions,
        ctr: metrics.ctr,
        averageCpc: metrics.average_cpc / 1000000,
        costPerConversion: metrics.cost_per_conversion,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Disconnect Google Ads integration
   */
  async disconnectIntegration(userId: string): Promise<void> {
    await this.prisma.integration.update({
      where: {
        userId_platform: {
          userId,
          platform: 'GOOGLE_ADS',
        },
      },
      data: {
        isActive: false,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
      },
    });

    // Remove cached client
    const cacheKey = `google-ads-client-${userId}`;
    this.googleAdsClients.delete(cacheKey);

    logger.info(`Disconnected Google Ads integration for user ${userId}`);
  }

  /**
   * Scheduled sync job - runs every 30 minutes
   */
  async scheduledSync(): Promise<void> {
    logger.info('Starting scheduled Google Ads sync');
    
    try {
      const activeIntegrations = await this.prisma.integration.findMany({
        where: {
          platform: 'GOOGLE_ADS',
          isActive: true,
        },
        select: {
          userId: true,
          lastSync: true,
        },
      });

      for (const integration of activeIntegrations) {
        try {
          // Only sync if last sync was more than 25 minutes ago (to avoid overlapping)
          const lastSyncThreshold = new Date(Date.now() - 25 * 60 * 1000);
          if (!integration.lastSync || integration.lastSync < lastSyncThreshold) {
            await this.syncUserData(integration.userId);
            await this.delay(2000); // Rate limiting between users
          }
        } catch (error) {
          logger.error(`Failed to sync user ${integration.userId}`, error);
        }
      }
    } catch (error) {
      logger.error('Failed to run scheduled sync', error);
    }
  }

  /**
   * Utility method to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear cached clients (useful for testing or memory management)
   */
  clearClientCache(): void {
    this.googleAdsClients.clear();
  }
}