import { Module } from '@nestjs/common';
import { DashboardReportService } from './dashboard-report.service';
import { DashboardReportController } from './dashboard-report.controller';

@Module({
  providers: [DashboardReportService],
  controllers: [DashboardReportController]
})
export class DashboardReportModule {}
