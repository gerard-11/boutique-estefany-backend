import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dtos/create-transaction.dto';
import { TransactionStatus, TransactionType } from '@prisma/client';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  private calculateWeeklyPayment(total: number): number {
    if (total <= 1000) return 200;
    const extraBlocks = Math.ceil((total - 1000) / 500);
    return 200 + extraBlocks * 50;
  }

  async create(data: CreateTransactionDto) {
    const { userId, type, productBarcodes, forceApproval } = data;

    return this.prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { barcode: { in: productBarcodes } },
      });

      if (products.length !== productBarcodes.length) {
        throw new NotFoundException(
          'Uno o más productos no fueron encontrados',
        );
      }

      for (const product of products) {
        if (product.stock <= 0) {
          throw new BadRequestException(
            `El producto ${product.name} no tiene stock disponible`,
          );
        }
      }

      const originalAmount = products.reduce((sum, p) => sum + p.price, 0);
      const discountPercentage = data.discountPercentage || 0;
      const totalAmount = originalAmount * (1 - discountPercentage / 100);

      let status: TransactionStatus = TransactionStatus.PENDING_APPROVAL;
      if (type === TransactionType.CONTADO)
        status = TransactionStatus.COMPLETED;
      if (
        forceApproval ||
        type === TransactionType.APARTADO ||
        type === TransactionType.PRESTAMO
      ) {
        status = TransactionStatus.ACTIVE;
      }

      const weeklyPayment =
        type === TransactionType.CREDITO_SEMANAL ||
        type === TransactionType.APARTADO
          ? this.calculateWeeklyPayment(totalAmount)
          : null;

      const transaction = await tx.transaction.create({
        data: {
          userId,
          type,
          status,
          originalAmount,
          discountPercentage,
          totalAmount,
          weeklyPayment,
          ...(type === TransactionType.APARTADO
            ? { expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
            : {}),
          items: {
            create: products.map((p) => ({
              productId: p.id,
              quantity: 1, // Por ahora 1 por cada escaneo
              priceAtTime: p.price,
            })),
          },
        },
        include: { items: { include: { product: true } } },
      });
      for (const product of products) {
        await tx.product.update({
          where: { id: product.id },
          data: { stock: { decrement: 1 } },
        });
      }

      return transaction;
    });
  }

  async requestReturn(id: string, userId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
    });
    if (!transaction || transaction.userId !== userId)
      throw new NotFoundException();
    if (transaction.status !== TransactionStatus.ACTIVE) {
      throw new BadRequestException(
        'Solo se pueden devolver transacciones activas',
      );
    }

    const diffDays =
      (new Date().getTime() - transaction.createdAt.getTime()) /
      (1000 * 3600 * 24);
    if (diffDays > 7) {
      throw new BadRequestException(
        'El plazo de 7 días para solicitar devolución ha expirado',
      );
    }

    return this.prisma.transaction.update({
      where: { id },
      data: { status: TransactionStatus.RETURN_REQUESTED },
    });
  }

  async confirmReturn(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!transaction) throw new NotFoundException();

      const updatedTx = await tx.transaction.update({
        where: { id },
        data: { status: TransactionStatus.RETURNED },
      });

      for (const item of transaction.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: 1 } },
        });
      }

      return updatedTx;
    });
  }

  // --- AJUSTES MANUALES ADMIN ---
  async updateWeeklyPayment(id: string, newAmount: number) {
    return this.prisma.transaction.update({
      where: { id },
      data: { weeklyPayment: newAmount },
    });
  }
}
