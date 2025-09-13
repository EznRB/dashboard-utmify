import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { MetaAdsService } from '../services/meta-ads.service';
import { CryptoService } from '../services/crypto.service';
import { MetaAdsController, MetaWebhookController } from '../controllers/meta-ads.controller';
import { PrismaService } from '../database/prisma.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../strategies/jwt.strategy';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET || 'your-secret-key',
        signOptions: {
          expiresIn: '7d',
        },
      }),
    }),
  ],
  controllers: [MetaAdsController, MetaWebhookController],
  providers: [
    MetaAdsService,
    CryptoService,
    PrismaService,
    JwtStrategy,
  ],
  exports: [MetaAdsService, CryptoService],
})
export class MetaAdsModule {}