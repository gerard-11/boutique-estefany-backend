import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dtos/create-transaction.dto';
import {
  TransactionStatus,
  TransactionType,
  MovementType,
  WalletMovementType,
} from '@prisma/client';
import { ProcessReturnDto } from './dtos/process-return.dto';

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
              quantity: 1,
              priceAtTime: p.price,
              costAtTime: p.cost,
            })),
          },
        },
      });

      for (const product of products) {
        // Restar stock
        await tx.product.update({
          where: { id: product.id },
          data: { stock: { decrement: 1 } },
        });

        // Anotar en la bitácora
        await tx.inventoryMovement.create({
          data: {
            productId: product.id,
            quantity: -1, // Salida
            type: MovementType.VENTA,
            costAtTime: product.cost,
            priceAtTime: product.price,
            reason: `Venta/Apartado ID: ${transaction.id}`,
          },
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

  async confirmReturn(id: string, data: ProcessReturnDto) {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id },
        include: { items: true, payments: true },
      });

      if (!transaction)
        throw new NotFoundException('Transacción no encontrada');

      // 1. Calcular el Fondo de Reembolso (Dinero real que el cliente ha pagado)
      const refundFund = transaction.payments.reduce(
        (sum, p) => sum + p.amount,
        0,
      );

      // 2. Validar que el reparto no exceda el fondo
      const totalToDistribute =
        (data.cashAmount || 0) +
        (data.walletAmount || 0) +
        (data.debtRepayments?.reduce((sum, r) => sum + r.amount, 0) || 0);

      if (totalToDistribute > refundFund + 0.01) {
        throw new BadRequestException(
          `No se puede repartir más dinero ($${totalToDistribute}) del que el cliente ha pagado ($${refundFund})`,
        );
      }

      // 3. Devolver stock e historial de inventario
      for (const item of transaction.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: 1 } },
        });

        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            quantity: 1,
            type: MovementType.DEVOLUCION_CLIENTE,
            reason: `Devolución confirmada para Transacción ID: ${id}. ${data.notes || ''}`,
          },
        });
      }

      // 4. Ejecutar el reparto negociado

      // a. Al Monedero
      if (data.walletAmount && data.walletAmount > 0) {
        await tx.user.update({
          where: { id: transaction.userId },
          data: { balance: { increment: data.walletAmount } },
        });

        await tx.walletMovement.create({
          data: {
            userId: transaction.userId,
            amount: data.walletAmount,
            type: WalletMovementType.RETURN_CREDIT,
            reason: `Saldo por devolución de Transacción ${id}`,
          },
        });
      }

      // b. A otras deudas
      if (data.debtRepayments) {
        for (const repayment of data.debtRepayments) {
          await tx.payment.create({
            data: {
              transactionId: repayment.transactionId,
              amount: repayment.amount,
              method: 'DEVOLUCION_CREDITO',
            },
          });

          // Verificar si la otra deuda se completó
          const otherTx = await tx.transaction.findUnique({
            where: { id: repayment.transactionId },
            include: { payments: true },
          });

          if (otherTx) {
            const totalPaid = otherTx.payments.reduce(
              (sum, p) => sum + p.amount,
              0,
            );
            if (totalPaid >= otherTx.totalAmount) {
              await tx.transaction.update({
                where: { id: otherTx.id },
                data: { status: TransactionStatus.COMPLETED },
              });
            }
          }
        }
      }

      // 5. Finalizar la transacción original
      return tx.transaction.update({
        where: { id },
        data: { status: TransactionStatus.RETURNED },
      });
    });
  }

  async quickReturnByBarcode(barcode: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Encontrar el producto y su transacción de préstamo/apartado activa
      const product = await tx.product.findUnique({
        where: { barcode },
        include: {
          transactionItems: {
            where: {
              transaction: {
                status: TransactionStatus.ACTIVE,
                type: { in: [TransactionType.PRESTAMO, TransactionType.APARTADO] },
              },
            },
            include: {
              transaction: true,
            },
          },
        },
      });

      if (!product) throw new NotFoundException('Producto no encontrado');
      
      const activeItem = product.transactionItems[0];
      if (!activeItem) {
        throw new BadRequestException('Esta prenda no tiene un préstamo o apartado activo');
      }

      const transaction = activeItem.transaction;

      // 2. Devolver stock
      await tx.product.update({
        where: { id: product.id },
        data: { stock: { increment: 1 } },
      });

      // 3. Registrar movimiento
      await tx.inventoryMovement.create({
        data: {
          productId: product.id,
          quantity: 1,
          type: MovementType.DEVOLUCION_CLIENTE,
          reason: `Devolución rápida por escaneo. Tx: ${transaction.id}`,
        },
      });

      // 4. Finalizar transacción
      // Si es préstamo, se marca como completado. Si es apartado, se cancela/libera stock.
      const newStatus = transaction.type === TransactionType.PRESTAMO 
        ? TransactionStatus.COMPLETED 
        : TransactionStatus.CANCELLED;

      return tx.transaction.update({
        where: { id: transaction.id },
        data: { status: newStatus },
      });
    });
  }

  async updateWeeklyPayment(id: string, newAmount: number) {
    return this.prisma.transaction.update({
      where: { id },
      data: { weeklyPayment: newAmount },
    });
  }
}
