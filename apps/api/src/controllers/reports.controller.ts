import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
  Logger,
  ParseUUIDPipe,
  ValidationPipe
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ReportsService } from '../services/reports.service';
import { SchedulerService } from '../services/scheduler.service';
import { GetUser } from '../decorators/get-user.decorator';
import {
  ReportType,
  ReportStatus,
  ScheduleFrequency,
  ExportFormat,
  ChartType
} from '@prisma/client';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  ValidateNested,
  IsNumber,
  Min,
  Max
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

// DTOs
class DateRangeDto {
  @IsDateString()
  start: string;

  @IsDateString()
  end: string;
}

class ReportFiltersDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeDto)
  dateRange?: DateRangeDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  campaigns?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  platforms?: string[];

  @IsOptional()
  @IsObject()
  customFilters?: Record<string, any>;
}

class GenerateReportDto {
  @IsOptional()
  @IsString()
  templateId?: string;

  @IsString()
  name: string;

  @IsEnum(ReportType)
  type: ReportType;

  @IsOptional()
  @ValidateNested()
  @Type(() => ReportFiltersDto)
  filters?: ReportFiltersDto;

  @IsOptional()
  @IsArray()
  @IsEnum(ChartType, { each: true })
  charts?: ChartType[];

  @IsOptional()
  @IsBoolean()
  saveAsTemplate?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}

class CreateScheduleDto {
  @IsString()
  name: string;

  @IsString()
  templateId: string;

  @IsEnum(ScheduleFrequency)
  frequency: ScheduleFrequency;

  @IsString()
  scheduleTime: string; // HH:mm format

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  scheduleDays?: number[]; // For weekly: 0=Sunday, 1=Monday, etc.

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  scheduleDay?: number; // For monthly: day of month

  @IsOptional()
  @ValidateNested()
  @Type(() => ReportFiltersDto)
  filters?: ReportFiltersDto;

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  emailRecipients?: string[];

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

class UpdateScheduleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(ScheduleFrequency)
  frequency?: ScheduleFrequency;

  @IsOptional()
  @IsString()
  scheduleTime?: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  scheduleDays?: number[];

  @IsOptional()
  @IsNumber()
  scheduleDay?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => ReportFiltersDto)
  filters?: ReportFiltersDto;

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  emailRecipients?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

class ExportReportDto {
  @IsString()
  reportId: string;

  @IsEnum(ExportFormat)
  format: ExportFormat;

  @IsOptional()
  @IsBoolean()
  includeCharts?: boolean;

  @IsOptional()
  @IsString()
  fileName?: string;
}

class ShareReportDto {
  @IsString()
  reportId: string;

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  emails?: string[];

  @IsOptional()
  @IsBoolean()
  publicLink?: boolean;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/reports')
export class ReportsController {
  private readonly logger = new Logger(ReportsController.name);

  constructor(
    private readonly reportsService: ReportsService,
    private readonly schedulerService: SchedulerService
  ) {}

  // GET /api/reports/templates - Get predefined templates
  @Get('templates')
  @ApiOperation({ summary: 'Get predefined report templates' })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  @ApiQuery({ name: 'type', enum: ReportType, required: false })
  @ApiQuery({ name: 'search', type: 'string', required: false })
  async getTemplates(
    @GetUser() user: any,
    @Query('type') type?: ReportType,
    @Query('search') search?: string
  ) {
    try {
      this.logger.log(`Getting templates for user ${user.id}`);
      
      const templates = await this.reportsService.getTemplates({
        organizationId: user.organizationId,
        type,
        search
      });

      return {
        success: true,
        data: templates,
        meta: {
          total: templates.length,
          types: Object.values(ReportType)
        }
      };
    } catch (error) {
      this.logger.error('Failed to get templates:', error);
      throw new HttpException(
        'Failed to retrieve templates',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // POST /api/reports/generate - Generate report
  @Post('generate')
  @ApiOperation({ summary: 'Generate a new report' })
  @ApiResponse({ status: 201, description: 'Report generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async generateReport(
    @GetUser() user: any,
    @Body(ValidationPipe) generateReportDto: GenerateReportDto
  ) {
    try {
      this.logger.log(`Generating report for user ${user.id}: ${generateReportDto.name}`);
      
      const report = await this.reportsService.generateReport({
        ...generateReportDto,
        userId: user.id,
        organizationId: user.organizationId
      });

      return {
        success: true,
        data: report,
        message: 'Report generated successfully'
      };
    } catch (error) {
      this.logger.error('Failed to generate report:', error);
      throw new HttpException(
        error.message || 'Failed to generate report',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // GET /api/reports/schedule - Get scheduled reports
  @Get('schedule')
  @ApiOperation({ summary: 'Get scheduled reports' })
  @ApiResponse({ status: 200, description: 'Scheduled reports retrieved successfully' })
  @ApiQuery({ name: 'page', type: 'number', required: false })
  @ApiQuery({ name: 'limit', type: 'number', required: false })
  @ApiQuery({ name: 'active', type: 'boolean', required: false })
  async getScheduledReports(
    @GetUser() user: any,
    @Query('page', new ValidationPipe({ transform: true })) page: number = 1,
    @Query('limit', new ValidationPipe({ transform: true })) limit: number = 10,
    @Query('active', new ValidationPipe({ transform: true })) active?: boolean
  ) {
    try {
      this.logger.log(`Getting scheduled reports for user ${user.id}`);
      
      const schedules = await this.schedulerService.getSchedulesByUser(user.id);
      
      // Filter by active status if specified
      const filteredSchedules = active !== undefined 
        ? schedules.filter(s => s.isActive === active)
        : schedules;

      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedSchedules = filteredSchedules.slice(startIndex, endIndex);

      return {
        success: true,
        data: paginatedSchedules,
        meta: {
          total: filteredSchedules.length,
          page,
          limit,
          totalPages: Math.ceil(filteredSchedules.length / limit)
        }
      };
    } catch (error) {
      this.logger.error('Failed to get scheduled reports:', error);
      throw new HttpException(
        'Failed to retrieve scheduled reports',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // POST /api/reports/schedule - Create scheduled report
  @Post('schedule')
  @ApiOperation({ summary: 'Create a scheduled report' })
  @ApiResponse({ status: 201, description: 'Schedule created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid schedule data' })
  async createSchedule(
    @GetUser() user: any,
    @Body(ValidationPipe) createScheduleDto: CreateScheduleDto
  ) {
    try {
      this.logger.log(`Creating schedule for user ${user.id}: ${createScheduleDto.name}`);
      
      const schedule = await this.schedulerService.createSchedule({
        ...createScheduleDto,
        userId: user.id,
        organizationId: user.organizationId,
        startDate: createScheduleDto.startDate ? new Date(createScheduleDto.startDate) : undefined,
        endDate: createScheduleDto.endDate ? new Date(createScheduleDto.endDate) : undefined
      });

      return {
        success: true,
        data: schedule,
        message: 'Schedule created successfully'
      };
    } catch (error) {
      this.logger.error('Failed to create schedule:', error);
      throw new HttpException(
        error.message || 'Failed to create schedule',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // PUT /api/reports/schedule/:id - Update scheduled report
  @Put('schedule/:id')
  @ApiOperation({ summary: 'Update a scheduled report' })
  @ApiResponse({ status: 200, description: 'Schedule updated successfully' })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  async updateSchedule(
    @GetUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateScheduleDto: UpdateScheduleDto
  ) {
    try {
      this.logger.log(`Updating schedule ${id} for user ${user.id}`);
      
      const schedule = await this.schedulerService.updateSchedule(id, {
        ...updateScheduleDto,
        startDate: updateScheduleDto.startDate ? new Date(updateScheduleDto.startDate) : undefined,
        endDate: updateScheduleDto.endDate ? new Date(updateScheduleDto.endDate) : undefined
      });

      return {
        success: true,
        data: schedule,
        message: 'Schedule updated successfully'
      };
    } catch (error) {
      this.logger.error('Failed to update schedule:', error);
      throw new HttpException(
        error.message || 'Failed to update schedule',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // DELETE /api/reports/schedule/:id - Delete scheduled report
  @Delete('schedule/:id')
  @ApiOperation({ summary: 'Delete a scheduled report' })
  @ApiResponse({ status: 200, description: 'Schedule deleted successfully' })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  async deleteSchedule(
    @GetUser() user: any,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    try {
      this.logger.log(`Deleting schedule ${id} for user ${user.id}`);
      
      await this.schedulerService.deleteSchedule(id);

      return {
        success: true,
        message: 'Schedule deleted successfully'
      };
    } catch (error) {
      this.logger.error('Failed to delete schedule:', error);
      throw new HttpException(
        error.message || 'Failed to delete schedule',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // POST /api/reports/schedule/:id/execute - Execute schedule manually
  @Post('schedule/:id/execute')
  @ApiOperation({ summary: 'Execute a scheduled report manually' })
  @ApiResponse({ status: 200, description: 'Schedule executed successfully' })
  async executeSchedule(
    @GetUser() user: any,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    try {
      this.logger.log(`Manually executing schedule ${id} for user ${user.id}`);
      
      const result = await this.schedulerService.executeScheduleManually(id);

      return {
        success: result.success,
        data: result,
        message: result.success ? 'Schedule executed successfully' : 'Schedule execution failed'
      };
    } catch (error) {
      this.logger.error('Failed to execute schedule:', error);
      throw new HttpException(
        error.message || 'Failed to execute schedule',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // POST /api/reports/export - Export report
  @Post('export')
  @ApiOperation({ summary: 'Export report to PDF or Excel' })
  @ApiResponse({ status: 200, description: 'Report exported successfully' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async exportReport(
    @GetUser() user: any,
    @Body(ValidationPipe) exportReportDto: ExportReportDto
  ) {
    try {
      this.logger.log(`Exporting report ${exportReportDto.reportId} for user ${user.id}`);
      
      const exportResult = await this.reportsService.exportReport({
        reportId: exportReportDto.reportId,
        format: exportReportDto.format,
        includeCharts: exportReportDto.includeCharts ?? true,
        fileName: exportReportDto.fileName,
        userId: user.id
      });

      return {
        success: true,
        data: exportResult,
        message: 'Report exported successfully'
      };
    } catch (error) {
      this.logger.error('Failed to export report:', error);
      throw new HttpException(
        error.message || 'Failed to export report',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // GET /api/reports/history - Get report history
  @Get('history')
  @ApiOperation({ summary: 'Get report generation history' })
  @ApiResponse({ status: 200, description: 'Report history retrieved successfully' })
  @ApiQuery({ name: 'page', type: 'number', required: false })
  @ApiQuery({ name: 'limit', type: 'number', required: false })
  @ApiQuery({ name: 'type', enum: ReportType, required: false })
  @ApiQuery({ name: 'status', enum: ReportStatus, required: false })
  @ApiQuery({ name: 'search', type: 'string', required: false })
  async getReportHistory(
    @GetUser() user: any,
    @Query('page', new ValidationPipe({ transform: true })) page: number = 1,
    @Query('limit', new ValidationPipe({ transform: true })) limit: number = 20,
    @Query('type') type?: ReportType,
    @Query('status') status?: ReportStatus,
    @Query('search') search?: string
  ) {
    try {
      this.logger.log(`Getting report history for user ${user.id}`);
      
      const history = await this.reportsService.getReportHistory({
        userId: user.id,
        organizationId: user.organizationId,
        page,
        limit,
        type,
        status,
        search
      });

      return {
        success: true,
        data: history.reports,
        meta: {
          total: history.total,
          page,
          limit,
          totalPages: Math.ceil(history.total / limit)
        }
      };
    } catch (error) {
      this.logger.error('Failed to get report history:', error);
      throw new HttpException(
        'Failed to retrieve report history',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // GET /api/reports/:id - Get specific report
  @Get(':id')
  @ApiOperation({ summary: 'Get a specific report by ID' })
  @ApiResponse({ status: 200, description: 'Report retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async getReport(
    @GetUser() user: any,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    try {
      this.logger.log(`Getting report ${id} for user ${user.id}`);
      
      const report = await this.reportsService.getReportById(id, user.id);

      return {
        success: true,
        data: report
      };
    } catch (error) {
      this.logger.error('Failed to get report:', error);
      throw new HttpException(
        error.message || 'Failed to retrieve report',
        HttpStatus.NOT_FOUND
      );
    }
  }

  // POST /api/reports/:id/share - Share report
  @Post(':id/share')
  @ApiOperation({ summary: 'Share a report via email or public link' })
  @ApiResponse({ status: 200, description: 'Report shared successfully' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async shareReport(
    @GetUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) shareReportDto: ShareReportDto
  ) {
    try {
      this.logger.log(`Sharing report ${id} for user ${user.id}`);
      
      const shareResult = await this.reportsService.shareReport({
        reportId: id,
        emails: shareReportDto.emails,
        publicLink: shareReportDto.publicLink ?? false,
        expiresAt: shareReportDto.expiresAt ? new Date(shareReportDto.expiresAt) : undefined,
        userId: user.id
      });

      return {
        success: true,
        data: shareResult,
        message: 'Report shared successfully'
      };
    } catch (error) {
      this.logger.error('Failed to share report:', error);
      throw new HttpException(
        error.message || 'Failed to share report',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // DELETE /api/reports/:id - Delete report
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a report' })
  @ApiResponse({ status: 200, description: 'Report deleted successfully' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async deleteReport(
    @GetUser() user: any,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    try {
      this.logger.log(`Deleting report ${id} for user ${user.id}`);
      
      await this.reportsService.deleteReport(id, user.id);

      return {
        success: true,
        message: 'Report deleted successfully'
      };
    } catch (error) {
      this.logger.error('Failed to delete report:', error);
      throw new HttpException(
        error.message || 'Failed to delete report',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // GET /api/reports/schedule/:id/stats - Get schedule execution statistics
  @Get('schedule/:id/stats')
  @ApiOperation({ summary: 'Get schedule execution statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getScheduleStats(
    @GetUser() user: any,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    try {
      this.logger.log(`Getting schedule stats ${id} for user ${user.id}`);
      
      const stats = await this.schedulerService.getExecutionStats(id);

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      this.logger.error('Failed to get schedule stats:', error);
      throw new HttpException(
        error.message || 'Failed to retrieve schedule statistics',
        HttpStatus.BAD_REQUEST
      );
    }
  }
}