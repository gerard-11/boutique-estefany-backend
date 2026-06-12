import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { AddToWishlistDto } from './dtos/add-to-wishlist.dto';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';

@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Post()
  @UseGuards(FirebaseAuthGuard)
  addToWishlist(
    @Request() req: RequestWithUser,
    @Body() dto: AddToWishlistDto,
  ) {
    return this.wishlistService.add(req.user.id, dto);
  }

  @Get('my-wishlist')
  @UseGuards(FirebaseAuthGuard)
  findMyWishlist(@Request() req: RequestWithUser) {
    return this.wishlistService.findMyWishlist(req.user.id);
  }

  @Get('client/:userId')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  findClientWishlist(@Param('userId') userId: string) {
    return this.wishlistService.findMyWishlist(userId);
  }

  @Delete(':productId')
  @UseGuards(FirebaseAuthGuard)
  removeFromWishlist(
    @Request() req: RequestWithUser,
    @Param('productId') productId: string,
  ) {
    return this.wishlistService.remove(req.user.id, productId);
  }

  @Get('waiting-clients/:productId')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  getWaitingClients(@Param('productId') productId: string) {
    return this.wishlistService.findWaitingClients(productId);
  }
}
