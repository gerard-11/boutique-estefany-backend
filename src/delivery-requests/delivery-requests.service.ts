import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeliveryRequestDto } from './dtos/create-delivery-request.dto';
import { DeliveryStatus } from '@prisma/client';

@Injectable()
export class DeliveryRequestsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, data: CreateDeliveryRequestDto) {
    return this.prisma.deliveryRequest.create({
      data: {
        userId,
        address: data.address,
        notes: data.notes,
        items: {
          create: data.productIds.map((id) => ({
            productId: id,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.deliveryRequest.findMany({
      include: {
        user: true,
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: DeliveryStatus) {
    const request = await this.prisma.deliveryRequest.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!request) throw new NotFoundException('Solicitud no encontrada');

    if (status === DeliveryStatus.ACCEPTED) {
      // Verificar stock antes de aceptar
      for (const item of request.items) {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
        });
        if (!product || product.stock < item.quantity) {
          throw new BadRequestException(
            `No hay suficiente stock para el producto: ${product?.name || item.productId}`,
          );
        }
      }
    }

    return this.prisma.deliveryRequest.update({
      where: { id },
      data: { status },
    });
  }

  async rejectAndMoveToWishlist(id: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.deliveryRequest.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!request) throw new NotFoundException('Solicitud no encontrada');

      // 1. Marcar como Rechazada
      await tx.deliveryRequest.update({
        where: { id },
        data: { status: DeliveryStatus.REJECTED, notes: reason },
      });

      // 2. Mover cada item a la Wishlist
      for (const item of request.items) {
        await tx.wishlist.upsert({
          where: {
            userId_productId: {
              userId: request.userId,
              productId: item.productId,
            },
          },
          update: {},
          create: {
            userId: request.userId,
            productId: item.productId,
          },
        });
      }

      return { message: 'Solicitud rechazada y movida a lista de espera' };
    });
  }

  async findByUserId(userId: string) {
    return this.prisma.deliveryRequest.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
