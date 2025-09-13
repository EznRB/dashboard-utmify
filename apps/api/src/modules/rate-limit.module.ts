import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { TenantRateLimitService } from '../services/tenant-rate-limit.service';
import { RateLimitController } from '../controllers/rate-limit.controller';
import { RateLimitInterceptor, RateLimitGuard } from '../interceptors/rate-limit.interceptor';
import { RateLimitCleanupScheduler } from '../schedulers/rate-limit-cleanup.scheduler';
import { TenantCacheService } from '../services/tenant-cache.service';
import { TenantDatabaseService } from '../services/tenant-database.service';
import { PrismaService } from '../services/prisma.service';

@Global()
@Module({
  imports: [
    ScheduleModule.forRoot(),
  ],
  controllers: [RateLimitController],
  providers: [
    // Serviços
    TenantRateLimitService,
    TenantCacheService,
    TenantDatabaseService,
    PrismaService,
    
    // Interceptors e Guards globais
    {
      provide: APP_INTERCEPTOR,
      useClass: RateLimitInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
    
    // Interceptor e Guard para uso manual
    RateLimitInterceptor,
    RateLimitGuard,
    
    // Schedulers
    RateLimitCleanupScheduler,
  ],
  exports: [
    TenantRateLimitService,
    RateLimitInterceptor,
    RateLimitGuard,
    TenantCacheService,
    TenantDatabaseService,
  ],
})
export class RateLimitModule {}