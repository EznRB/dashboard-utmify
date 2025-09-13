import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AuditLogService } from '../services/audit-log.service';
import { AuditLogController } from '../controllers/audit-log.controller';
import { AuditLogInterceptor, CrossTenantSecurityGuard } from '../interceptors/audit-log.interceptor';
import { PrismaService } from '../services/prisma.service';
import { TenantDatabaseService } from '../services/tenant-database.service';
import { TenantCacheService } from '../services/tenant-cache.service';
import { AuditLogCleanupScheduler } from '../schedulers/audit-log-cleanup.scheduler';

@Global()
@Module({
  imports: [
    ScheduleModule.forRoot(),
  ],
  controllers: [
    AuditLogController,
  ],
  providers: [
    AuditLogService,
    PrismaService,
    TenantDatabaseService,
    TenantCacheService,
    AuditLogCleanupScheduler,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: CrossTenantSecurityGuard,
    },
  ],
  exports: [
    AuditLogService,
    TenantDatabaseService,
    TenantCacheService,
  ],
})
export class AuditLogModule {}