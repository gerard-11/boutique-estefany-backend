import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Query,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, Level } from '@prisma/client';
import { UpdateUserFinancialDto } from './dtos/update-user-financial.dto';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Listar todos los clientes (Solo Admin)
  @Get('clients')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  findAllClients(
    @Query('level') level?: Level,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: string,
  ) {
    return this.usersService.findAllClients({
      level,
      searchTerm: search,
      sortBy,
      order,
    });
  }

  // Ver mi perfil financiero detallado (Cliente autenticado)
  @Get('me/profile')
  @UseGuards(FirebaseAuthGuard)
  getMyProfile(@Request() req: RequestWithUser) {
    return this.usersService.getEnrichedProfile(req.user.id);
  }

  // Historial de pagos y cuentas activas (Cliente autenticado)
  @Get('me/payment-history')
  @UseGuards(FirebaseAuthGuard)
  getMyPaymentHistory(@Request() req: RequestWithUser) {
    return this.usersService.getPaymentHistory(req.user.id);
  }

  // Ver perfil financiero detallado de un cliente (Solo Admin)
  @Get('clients/:id/profile')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  getProfile(@Param('id') id: string) {
    return this.usersService.getEnrichedProfile(id);
  }

  // Historial de pagos y cuentas activas (Solo Admin)
  @Get('clients/:id/payment-history')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  getPaymentHistory(@Param('id') id: string) {
    return this.usersService.getPaymentHistory(id);
  }

  // Actualizar datos financieros (Solo Admin)
  @Patch('clients/:id/financial')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  updateFinancial(
    @Param('id') id: string,
    @Body() updateDto: UpdateUserFinancialDto,
  ) {
    return this.usersService.updateFinancialData(id, updateDto);
  }
}
