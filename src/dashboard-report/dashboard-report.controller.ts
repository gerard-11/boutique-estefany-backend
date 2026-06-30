import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardReportService } from './dashboard-report.service';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('dashboard-report')
export class DashboardReportController {
  constructor(private readonly dashboardService: DashboardReportService) {}

  @Get('summary')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  getSummary() {
    return this.dashboardService.getFinancialSummary();
  }

  @Get('monthly-profit')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  getMonthlyProfit(
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    return this.dashboardService.getMonthlyProfit({ year, month });
  }
}
