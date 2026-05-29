import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToWishlistDto } from './dtos/add-to-wishlist.dto';

@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) {}

  async add(userId: string, data: AddToWishlistDto) {
    const existing = await this.prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId,
          productId: data.productId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Este producto ya está en tu lista de deseos');
    }

    return this.prisma.wishlist.create({
      data: {
        userId,
        productId: data.productId,
      },
      include: {
        product: true,
      },
    });
  }

  async remove(userId: string, productId: string) {
    return this.prisma.wishlist.delete({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });
  }

  async findMyWishlist(userId: string) {
    return this.prisma.wishlist.findMany({
      where: { userId },
      include: {
        product: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Lógica de Prioridad para el Admin
  async findWaitingClients(productId: string) {
    return this.prisma.wishlist.findMany({
      where: { productId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            level: true,
          },
        },
      },
      orderBy: [
        { user: { level: 'desc' } }, // ORO > PLATA > BRONCE (Enum order?)
        { createdAt: 'asc' }, // FIFO dentro del mismo nivel
      ],
    });
  }
}
