import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dtos/create-payment.dto';
import { TransactionStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private readonly paymentTolerance = 0.01;

  constructor(private prisma: PrismaService) {}

  async registerPayment(data: CreatePaymentDto) {
    const { userId, amount } = data;
    const method = data.method ?? 'Efectivo';

    return this.prisma.$transaction(async (tx) => {
      const activeTransactions = await tx.transaction.findMany({
        where: {
          userId,
          status: {
            in: [TransactionStatus.ACTIVE, TransactionStatus.PENDING_APPROVAL],
          },
        },
        include: { payments: true, items: true },
        orderBy: { createdAt: 'asc' }, // Primero las más viejas
      });

      if (activeTransactions.length === 0) {
        // Si no hay deudas, igual registramos el pago pero no lo aplicamos a nada
        // (Aunque lo ideal es que el admin no lo haga si no debe nada)
      }

      let remainingMoney = amount;
      const completedTransactions: {
        id: string;
        type: string;
        productIds: string[];
      }[] = [];
      const appliedPayments: {
        id: string;
        transactionId: string;
        amount: number;
        method: string;
        paymentDate: Date;
      }[] = [];

      for (const transaction of activeTransactions) {
        if (remainingMoney <= 0) break;

        const alreadyPaid = transaction.payments.reduce(
          (sum, p) => sum + p.amount,
          0,
        );
        const debtForThisTx = transaction.totalAmount - alreadyPaid;

        if (debtForThisTx <= 0) continue;

        const paymentForThisTx = Math.min(remainingMoney, debtForThisTx);

        // Creamos el registro del pago vinculado a esta transacción específica
        const payment = await tx.payment.create({
          data: {
            transactionId: transaction.id,
            amount: paymentForThisTx,
            method,
          },
        });

        appliedPayments.push({
          id: payment.id,
          transactionId: payment.transactionId,
          amount: payment.amount,
          method: payment.method,
          paymentDate: payment.paymentDate,
        });

        remainingMoney -= paymentForThisTx;
        const remainingDebt = debtForThisTx - paymentForThisTx;

        if (remainingDebt <= this.paymentTolerance) {
          await tx.transaction.update({
            where: { id: transaction.id },
            data: { status: TransactionStatus.COMPLETED },
          });

          completedTransactions.push({
            id: transaction.id,
            type: transaction.type,
            productIds: transaction.items.map((item) => item.productId),
          });
        }
      }

      const lastPaymentDate = new Date();
      await tx.user.update({
        where: { id: userId },
        data: { lastPaymentDate },
      });
      return {
        success: true,
        amountProcessed: amount - remainingMoney,
        change: remainingMoney > 0 ? remainingMoney : 0,
        paymentDate: appliedPayments[0]?.paymentDate ?? lastPaymentDate,
        appliedPayments,
        completedTransactions,
      };
    });
  }
}
