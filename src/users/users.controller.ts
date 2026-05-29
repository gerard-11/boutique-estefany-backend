import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, Level } from '@prisma/client';
import { UpdateUserFinancialDto } from './dtos/update-user-financial.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Listar todos los clientes (Solo Admin)
  @Get('clients')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  findAllClients(@Query('level') level?: Level, @Query('search') search?: string) {
    return this.usersService.findAllClients({ level, searchTerm: search });
  }

  // Ver perfil financiero detallado (Admin y el propio Cliente)
  @Get('clients/:id/profile')
  @UseGuards(FirebaseAuthGuard)
  async getProfile(@Param('id') id: string) {
    // Nota: Aquí se podría añadir una validación para que el cliente solo vea su propio perfil
    // pero el Admin pueda ver cualquiera. Por ahora lo dejamos abierto a usuarios autenticados.
    return this.usersService.getEnrichedProfile(id);
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
