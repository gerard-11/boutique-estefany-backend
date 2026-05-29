import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { DeliveryRequestsService } from './delivery-requests.service';
import { CreateDeliveryRequestDto } from './dtos/create-delivery-request.dto';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, DeliveryStatus } from '@prisma/client';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';

@Controller('delivery-requests')
export class DeliveryRequestsController {
  constructor(private readonly deliveryService: DeliveryRequestsService) {}

  @Post()
  @UseGuards(FirebaseAuthGuard)
  create(
    @Request() req: RequestWithUser,
    @Body() createDto: CreateDeliveryRequestDto,
  ) {
    return this.deliveryService.create(req.user.id, createDto);
  }

  @Get('my-requests')
  @UseGuards(FirebaseAuthGuard)
  findMyRequests(@Request() req: RequestWithUser) {
    return this.deliveryService.findByUserId(req.user.id);
  }

  @Get()
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  findAll() {
    return this.deliveryService.findAll();
  }

  @Patch(':id/status')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: DeliveryStatus,
  ) {
    return this.deliveryService.updateStatus(id, status);
  }

  @Patch(':id/reject-to-wishlist')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  rejectToWishlist(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.deliveryService.rejectAndMoveToWishlist(id, reason);
  }
}
