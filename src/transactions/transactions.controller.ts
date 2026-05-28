import {
  Controller,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dtos/create-transaction.dto';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() createDto: CreateTransactionDto) {
    return this.transactionsService.create(createDto);
  }

  @Patch(':id/request-return')
  @UseGuards(FirebaseAuthGuard)
  requestReturn(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.transactionsService.requestReturn(id, req.user.id);
  }

  @Patch(':id/confirm-return')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  confirmReturn(@Param('id') id: string) {
    return this.transactionsService.confirmReturn(id);
  }

  @Patch(':id/weekly-payment')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  updatePayment(@Param('id') id: string, @Body('amount') amount: number) {
    return this.transactionsService.updateWeeklyPayment(id, amount);
  }
}
