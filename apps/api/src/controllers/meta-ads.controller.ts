import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  Res,
  Headers,
  HttpStatus,
  UseGuards,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { MetaAdsService } from '../services/meta-ads.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { GetUser } from '../decorators/get-user.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

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
}

interface WebhookDto {
  object: string;
  entry: Array<{
    id: string;
    time: number;
    changes: Array<{
      field: string;
      value: any;
    }>;
  }>;
}

@ApiTags('Meta Ads Integration')
@Controller('api/integrations/meta')
export class MetaAdsController {
  private readonly logger = new Logger(MetaAdsController.name);

  constructor(private readonly metaAdsService: MetaAdsService) {}

  @Post('auth')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate Meta Ads OAuth flow' })
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

      const authUrl = this.metaAdsService.generateAuthUrl(user.id, body.redirect_uri);
      
      this.logger.log(`Generated OAuth URL for user ${user.id}`);
      
      return {
        success: true,
        data: {
          authUrl,
          message: 'Redirect user to this URL to complete authorization',
        },
      };
    } catch (error) {
      this.logger.error('Failed to initiate OAuth', error);
      throw error;
    }
  }

  @Get('callback')
  @ApiOperation({ summary: 'Handle Meta Ads OAuth callback' })
  @ApiResponse({ status: 200, description: 'Authorization completed successfully' })
  @ApiResponse({ status: 400, description: 'Authorization failed' })
  async handleCallback(
    @Query() query: CallbackQueryDto,
    @Res() res: Response,
  ) {
    try {
      // Handle OAuth errors
      if (query.error) {
        this.logger.error(`OAuth error: ${query.error} - ${query.error_description}`);
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: query.error,
          error_description: query.error_description,
        });
      }

      if (!query.code || !query.state) {
        throw new BadRequestException('Missing authorization code or state');
      }

      // Decrypt and validate state
      let stateData: { userId: string; timestamp: number };
      try {
        const decryptedState = this.metaAdsService['cryptoService'].decrypt(query.state);
        stateData = JSON.parse(decryptedState);
      } catch {
        throw new BadRequestException('Invalid state parameter');
      }

      // Check state timestamp (valid for 10 minutes)
      const stateAge = Date.now() - stateData.timestamp;
      if (stateAge > 10 * 60 * 1000) {
        throw new BadRequestException('State parameter expired');
      }

      // Exchange code for tokens
      const redirectUri = `${process.env.FRONTEND_URL}/integrations/meta/callback`;
      const shortLivedTokens = await this.metaAdsService.exchangeCodeForToken(
        query.code,
        redirectUri,
      );

      // Get long-lived token
      const longLivedTokens = await this.metaAdsService.getLongLivedToken(
        shortLivedTokens.access_token,
      );

      // Store tokens
      await this.metaAdsService.storeTokens(stateData.userId, longLivedTokens);

      // Trigger initial sync
      this.metaAdsService.syncUserData(stateData.userId).catch((error) => {
        this.logger.error(`Initial sync failed for user ${stateData.userId}`, error);
      });

      this.logger.log(`OAuth completed successfully for user ${stateData.userId}`);

      // Redirect to success page
      return res.redirect(`${process.env.FRONTEND_URL}/integrations/meta?success=true`);
    } catch (error) {
      this.logger.error('OAuth callback failed', error);
      return res.redirect(
        `${process.env.FRONTEND_URL}/integrations/meta?error=${encodeURIComponent(error.message)}`,
      );
    }
  }

  @Get('accounts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user\'s Meta ad accounts' })
  @ApiResponse({ status: 200, description: 'Ad accounts retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Integration not found or inactive' })
  async getAdAccounts(@GetUser() user: AuthUser) {
    try {
      const accounts = await this.metaAdsService.getAdAccounts(user.id);
      
      return {
        success: true,
        data: accounts,
        count: accounts.length,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch ad accounts for user ${user.id}`, error);
      throw error;
    }
  }

  @Get('campaigns')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get campaigns for an ad account' })
  @ApiResponse({ status: 200, description: 'Campaigns retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Ad account ID is required' })
  async getCampaigns(
    @GetUser() user: AuthUser,
    @Query('ad_account_id') adAccountId: string,
  ) {
    try {
      if (!adAccountId) {
        throw new BadRequestException('ad_account_id query parameter is required');
      }

      const campaigns = await this.metaAdsService.getCampaigns(user.id, adAccountId);
      
      return {
        success: true,
        data: campaigns,
        count: campaigns.length,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch campaigns for user ${user.id}`, error);
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
      // Start sync in background
      const syncPromise = this.metaAdsService.syncUserData(user.id);
      
      if (body.force) {
        // Wait for sync to complete if force is true
        await syncPromise;
        return {
          success: true,
          message: 'Data synchronized successfully',
        };
      } else {
        // Return immediately and sync in background
        syncPromise.catch((error) => {
          this.logger.error(`Background sync failed for user ${user.id}`, error);
        });
        
        return {
          success: true,
          message: 'Data synchronization initiated',
        };
      }
    } catch (error) {
      this.logger.error(`Sync failed for user ${user.id}`, error);
      throw error;
    }
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get integration status' })
  @ApiResponse({ status: 200, description: 'Status retrieved successfully' })
  async getIntegrationStatus(@GetUser() user: AuthUser) {
    try {
      // This would typically query the database for integration status
      const integration = await this.metaAdsService['prisma'].integration.findUnique({
        where: {
          userId_provider: {
            userId: user.id,
            provider: 'META_ADS',
          },
        },
        select: {
          isActive: true,
          lastSyncAt: true,
          createdAt: true,
          expiresAt: true,
        },
      });

      if (!integration) {
        return {
          success: true,
          data: {
            connected: false,
            message: 'Meta Ads integration not configured',
          },
        };
      }

      const isExpired = integration.expiresAt && integration.expiresAt < new Date();
      
      return {
        success: true,
        data: {
          connected: integration.isActive && !isExpired,
          lastSync: integration.lastSyncAt,
          connectedAt: integration.createdAt,
          expiresAt: integration.expiresAt,
          status: isExpired ? 'expired' : integration.isActive ? 'active' : 'inactive',
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get integration status for user ${user.id}`, error);
      throw error;
    }
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect Meta Ads integration' })
  @ApiResponse({ status: 200, description: 'Integration disconnected successfully' })
  async disconnectIntegration(@GetUser() user: AuthUser) {
    try {
      await this.metaAdsService['prisma'].integration.updateMany({
        where: {
          userId: user.id,
          provider: 'META_ADS',
        },
        data: {
          isActive: false,
        },
      });

      this.logger.log(`Meta Ads integration disconnected for user ${user.id}`);
      
      return {
        success: true,
        message: 'Meta Ads integration disconnected successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to disconnect integration for user ${user.id}`, error);
      throw error;
    }
  }
}

@Controller('api/webhooks')
@ApiTags('Webhooks')
export class MetaWebhookController {
  private readonly logger = new Logger(MetaWebhookController.name);

  constructor(private readonly metaAdsService: MetaAdsService) {}

  @Get('meta')
  @ApiOperation({ summary: 'Verify Meta webhook subscription' })
  @ApiResponse({ status: 200, description: 'Webhook verified successfully' })
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.challenge') challenge: string,
    @Query('hub.verify_token') verifyToken: string,
  ) {
    const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
    
    if (mode === 'subscribe' && verifyToken === expectedToken) {
      this.logger.log('Meta webhook verified successfully');
      return challenge;
    } else {
      this.logger.error('Meta webhook verification failed');
      throw new UnauthorizedException('Webhook verification failed');
    }
  }

  @Post('meta')
  @ApiOperation({ summary: 'Receive Meta webhook notifications' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async receiveWebhook(
    @Body() body: WebhookDto,
    @Headers('x-hub-signature-256') signature: string,
    @Req() req: Request,
  ) {
    try {
      // Verify webhook signature
      const payload = JSON.stringify(body);
      const isValid = this.metaAdsService.verifyWebhookSignature(payload, signature);
      
      if (!isValid) {
        this.logger.error('Invalid webhook signature');
        throw new UnauthorizedException('Invalid webhook signature');
      }

      // Process webhook data
      if (body.object === 'adaccount') {
        await this.metaAdsService.processWebhook(body.entry);
        this.logger.log(`Processed webhook for ${body.entry.length} entries`);
      }

      return { success: true };
    } catch (error) {
      this.logger.error('Webhook processing failed', error);
      throw error;
    }
  }
}