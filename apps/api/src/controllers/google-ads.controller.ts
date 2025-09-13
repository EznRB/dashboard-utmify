import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  Res,
  HttpStatus,
  UseGuards,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { GoogleAdsService } from '../services/google-ads.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { GetUser } from '../decorators/get-user.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

interface AuthUser {
  id: string;
  email: string;
}

interface AuthQueryDto {
  redirect_uri: string;
}

interface CallbackQueryDto {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
}

interface SyncRequestDto {
  force?: boolean;
  customer_id?: string;
}

interface KeywordQueryDto {
  customer_id: string;
  campaign_ids?: string;
}

interface MetricsQueryDto {
  customer_id: string;
  start_date?: string;
  end_date?: string;
}

@ApiTags('Google Ads Integration')
@Controller('api/integrations/google')
export class GoogleAdsController {
  private readonly logger = new Logger(GoogleAdsController.name);

  constructor(private readonly googleAdsService: GoogleAdsService) {}

  @Post('auth')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate Google Ads OAuth flow' })
  @ApiResponse({ status: 200, description: 'OAuth URL generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid redirect URI' })
  async initiateAuth(
    @GetUser() user: AuthUser,
    @Body() body: AuthQueryDto,
  ) {
    try {
      if (!body.redirect_uri) {
        throw new BadRequestException('redirect_uri is required');
      }

      // Validate redirect URI format
      try {
        new URL(body.redirect_uri);
      } catch {
        throw new BadRequestException('Invalid redirect_uri format');
      }

      const authUrl = this.googleAdsService.generateAuthUrl(user.id, body.redirect_uri);
      
      this.logger.log(`Generated Google Ads OAuth URL for user ${user.id}`);
      
      return {
        success: true,
        data: {
          authUrl,
          message: 'Redirect user to this URL to complete authorization',
        },
      };
    } catch (error) {
      this.logger.error('Failed to initiate Google Ads OAuth', error);
      throw error;
    }
  }

  @Get('callback')
  @ApiOperation({ summary: 'Handle Google Ads OAuth callback' })
  @ApiResponse({ status: 200, description: 'Authorization completed successfully' })
  @ApiResponse({ status: 400, description: 'Authorization failed' })
  async handleCallback(
    @Query() query: CallbackQueryDto,
    @Res() res: Response,
  ) {
    try {
      if (query.error) {
        this.logger.error('OAuth error:', query.error_description || query.error);
        return res.redirect(`${process.env.FRONTEND_URL}/integrations/google?error=${encodeURIComponent(query.error_description || query.error)}`);
      }

      if (!query.code || !query.state) {
        throw new BadRequestException('Missing authorization code or state');
      }

      // Decrypt state to get user info
      const stateData = JSON.parse(
        this.googleAdsService['cryptoService'].decrypt(query.state)
      );
      
      if (!stateData.userId || !stateData.redirectUri) {
        throw new BadRequestException('Invalid state parameter');
      }

      // Exchange code for tokens
      const tokens = await this.googleAdsService.exchangeCodeForToken(
        query.code,
        stateData.redirectUri
      );

      // Store tokens
      await this.googleAdsService.storeTokens(stateData.userId, tokens);

      this.logger.log(`Google Ads OAuth completed for user ${stateData.userId}`);

      // Redirect to success page
      return res.redirect(`${process.env.FRONTEND_URL}/integrations/google?success=true`);
    } catch (error) {
      this.logger.error('Failed to handle Google Ads OAuth callback', error);
      return res.redirect(`${process.env.FRONTEND_URL}/integrations/google?error=${encodeURIComponent('Authorization failed')}`);
    }
  }

  @Get('accounts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user\'s Google Ads customer accounts' })
  @ApiResponse({ status: 200, description: 'Customer accounts retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Integration not found or inactive' })
  async getCustomerAccounts(@GetUser() user: AuthUser) {
    try {
      const accounts = await this.googleAdsService.getCustomerAccounts(user.id);
      
      return {
        success: true,
        data: accounts,
      };
    } catch (error) {
      this.logger.error('Failed to get Google Ads customer accounts', error);
      throw error;
    }
  }

  @Get('campaigns')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get campaigns for a customer account' })
  @ApiResponse({ status: 200, description: 'Campaigns retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Customer ID is required' })
  @ApiQuery({ name: 'customer_id', required: true, description: 'Google Ads Customer ID' })
  async getCampaigns(
    @GetUser() user: AuthUser,
    @Query('customer_id') customerId: string,
  ) {
    try {
      if (!customerId) {
        throw new BadRequestException('customer_id is required');
      }

      const campaigns = await this.googleAdsService.getCampaigns(user.id, customerId);
      
      return {
        success: true,
        data: campaigns,
      };
    } catch (error) {
      this.logger.error('Failed to get Google Ads campaigns', error);
      throw error;
    }
  }

  @Get('keywords')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get keywords for campaigns' })
  @ApiResponse({ status: 200, description: 'Keywords retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Customer ID is required' })
  @ApiQuery({ name: 'customer_id', required: true, description: 'Google Ads Customer ID' })
  @ApiQuery({ name: 'campaign_ids', required: false, description: 'Comma-separated campaign IDs (optional)' })
  async getKeywords(
    @GetUser() user: AuthUser,
    @Query() query: KeywordQueryDto,
  ) {
    try {
      if (!query.customer_id) {
        throw new BadRequestException('customer_id is required');
      }

      const campaignIds = query.campaign_ids ? 
        query.campaign_ids.split(',').map(id => id.trim()) : undefined;

      const keywords = await this.googleAdsService.getKeywords(
        user.id,
        query.customer_id,
        campaignIds
      );
      
      return {
        success: true,
        data: keywords,
      };
    } catch (error) {
      this.logger.error('Failed to get Google Ads keywords', error);
      throw error;
    }
  }

  @Get('metrics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get campaign performance metrics' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Customer ID is required' })
  @ApiQuery({ name: 'customer_id', required: true, description: 'Google Ads Customer ID' })
  @ApiQuery({ name: 'start_date', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'end_date', required: false, description: 'End date (YYYY-MM-DD)' })
  async getCampaignMetrics(
    @GetUser() user: AuthUser,
    @Query() query: MetricsQueryDto,
  ) {
    try {
      if (!query.customer_id) {
        throw new BadRequestException('customer_id is required');
      }

      const dateRange = query.start_date && query.end_date ? {
        startDate: query.start_date,
        endDate: query.end_date,
      } : undefined;

      const metrics = await this.googleAdsService.getCampaignMetrics(
        user.id,
        query.customer_id,
        dateRange
      );
      
      return {
        success: true,
        data: metrics,
      };
    } catch (error) {
      this.logger.error('Failed to get Google Ads metrics', error);
      throw error;
    }
  }

  @Get('search-terms')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get search terms report' })
  @ApiResponse({ status: 200, description: 'Search terms retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Customer ID is required' })
  @ApiQuery({ name: 'customer_id', required: true, description: 'Google Ads Customer ID' })
  @ApiQuery({ name: 'start_date', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'end_date', required: false, description: 'End date (YYYY-MM-DD)' })
  async getSearchTermsReport(
    @GetUser() user: AuthUser,
    @Query() query: MetricsQueryDto,
  ) {
    try {
      if (!query.customer_id) {
        throw new BadRequestException('customer_id is required');
      }

      const dateRange = query.start_date && query.end_date ? {
        startDate: query.start_date,
        endDate: query.end_date,
      } : undefined;

      const searchTerms = await this.googleAdsService.getSearchTermsReport(
        user.id,
        query.customer_id,
        dateRange
      );
      
      return {
        success: true,
        data: searchTerms,
      };
    } catch (error) {
      this.logger.error('Failed to get Google Ads search terms', error);
      throw error;
    }
  }

  @Post('sync')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trigger manual data synchronization' })
  @ApiResponse({ status: 200, description: 'Sync initiated successfully' })
  @ApiResponse({ status: 401, description: 'Integration not found or inactive' })
  async syncData(
    @GetUser() user: AuthUser,
    @Body() body: SyncRequestDto,
  ) {
    try {
      await this.googleAdsService.syncUserData(user.id, body.force || false);
      
      this.logger.log(`Manual Google Ads sync completed for user ${user.id}`);
      
      return {
        success: true,
        data: {
          message: 'Data synchronization completed successfully',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error('Failed to sync Google Ads data', error);
      throw error;
    }
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Google Ads integration status' })
  @ApiResponse({ status: 200, description: 'Status retrieved successfully' })
  async getIntegrationStatus(@GetUser() user: AuthUser) {
    try {
      // Get integration from database
      const integration = await this.googleAdsService['prisma'].integration.findUnique({
        where: {
          userId_platform: {
            userId: user.id,
            platform: 'GOOGLE_ADS',
          },
        },
      });

      if (!integration) {
        return {
          success: true,
          data: {
            connected: false,
            status: 'not_connected',
          },
        };
      }

      const isExpired = integration.expiresAt && integration.expiresAt <= new Date();
      const status = !integration.isActive ? 'inactive' : 
                    isExpired ? 'expired' : 'active';

      return {
        success: true,
        data: {
          connected: integration.isActive && !isExpired,
          status,
          connectedAt: integration.createdAt,
          lastSync: integration.lastSync,
          expiresAt: integration.expiresAt,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get Google Ads integration status', error);
      throw error;
    }
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect Google Ads integration' })
  @ApiResponse({ status: 200, description: 'Integration disconnected successfully' })
  async disconnectIntegration(@GetUser() user: AuthUser) {
    try {
      await this.googleAdsService.disconnectIntegration(user.id);
      
      this.logger.log(`Google Ads integration disconnected for user ${user.id}`);
      
      return {
        success: true,
        data: {
          message: 'Google Ads integration disconnected successfully',
        },
      };
    } catch (error) {
      this.logger.error('Failed to disconnect Google Ads integration', error);
      throw error;
    }
  }

  @Post('refresh-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh Google Ads access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Integration not found or refresh failed' })
  async refreshToken(@GetUser() user: AuthUser) {
    try {
      // Get current integration
      const integration = await this.googleAdsService['prisma'].integration.findUnique({
        where: {
          userId_platform: {
            userId: user.id,
            platform: 'GOOGLE_ADS',
          },
        },
      });

      if (!integration || !integration.refreshToken) {
        throw new UnauthorizedException('Google Ads integration not found or no refresh token available');
      }

      // Decrypt and use refresh token
      const refreshToken = this.googleAdsService['cryptoService'].decrypt(integration.refreshToken);
      const newTokens = await this.googleAdsService.refreshAccessToken(refreshToken);
      
      // Store new tokens
      await this.googleAdsService.storeTokens(user.id, newTokens);
      
      this.logger.log(`Google Ads token refreshed for user ${user.id}`);
      
      return {
        success: true,
        data: {
          message: 'Access token refreshed successfully',
          expiresAt: new Date(Date.now() + newTokens.expires_in * 1000),
        },
      };
    } catch (error) {
      this.logger.error('Failed to refresh Google Ads token', error);
      throw error;
    }
  }

  @Get('quality-scores')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get quality scores for keywords' })
  @ApiResponse({ status: 200, description: 'Quality scores retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Customer ID is required' })
  @ApiQuery({ name: 'customer_id', required: true, description: 'Google Ads Customer ID' })
  @ApiQuery({ name: 'campaign_ids', required: false, description: 'Comma-separated campaign IDs (optional)' })
  async getQualityScores(
    @GetUser() user: AuthUser,
    @Query() query: KeywordQueryDto,
  ) {
    try {
      if (!query.customer_id) {
        throw new BadRequestException('customer_id is required');
      }

      const campaignIds = query.campaign_ids ? 
        query.campaign_ids.split(',').map(id => id.trim()) : undefined;

      // Get keywords with quality scores
      const keywords = await this.googleAdsService.getKeywords(
        user.id,
        query.customer_id,
        campaignIds
      );
      
      // Filter and format quality score data
      const qualityScores = keywords
        .filter(keyword => keyword.quality_score !== undefined)
        .map(keyword => ({
          keyword_id: keyword.id,
          keyword_text: keyword.text,
          quality_score: keyword.quality_score,
          first_page_cpc: keyword.first_page_cpc,
          top_of_page_cpc: keyword.top_of_page_cpc,
          campaign_id: keyword.campaign_id,
          ad_group_id: keyword.ad_group_id,
        }));
      
      return {
        success: true,
        data: qualityScores,
      };
    } catch (error) {
      this.logger.error('Failed to get Google Ads quality scores', error);
      throw error;
    }
  }
}