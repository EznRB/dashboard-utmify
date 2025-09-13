import { Module } from '@nestjs/common';
import { GoogleAdsController } from '../controllers/google-ads.controller';
import { GoogleAdsService } from '../services/google-ads.service';
import { PrismaService } from '../services/prisma.service';
import { CryptoService } from '../services/crypto.service';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'google-ads-sync',
    }),
  ],
  controllers: [GoogleAdsController],
  providers: [
    GoogleAdsService,
    PrismaService,
    CryptoService,
  ],
  exports: [GoogleAdsService],
})
export class GoogleAdsModule {}