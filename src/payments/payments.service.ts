import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dtos/create-payment.dto';
import { TransactionStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async registerPayment(data: CreatePaymentDto) {
    const { userId, amount, method } = data;

    return this.prisma.$transaction(async (tx) => {
      const activeTransactions = await tx.transaction.findMany({
        where: {
          userId,
          status: {
            in: [TransactionStatus.ACTIVE, TransactionStatus.PENDING_APPROVAL],
          },
        },
        include: { payments: true },
        orderBy: { createdAt: 'asc' }, // Primero las más viejas
      });

      if (activeTransactions.length === 0) {
        // Si no hay deudas, igual registramos el pago pero no lo aplicamos a nada
        // (Aunque lo ideal es que el admin no lo haga si no debe nada)
      }

      let remainingMoney = amount;

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
        await tx.payment.create({
          data: {
            transactionId: transaction.id,
            amount: paymentForThisTx,
            method,
          },
        });

        remainingMoney -= paymentForThisTx;

        if (paymentForThisTx === debtForThisTx) {
          await tx.transaction.update({
            where: { id: transaction.id },
            data: { status: TransactionStatus.COMPLETED },
          });
        }
      }

      await tx.user.update({
        where: { id: userId },
        data: { lastPaymentDate: new Date() },
      });
      return {
        success: true,
        amountProcessed: amount - remainingMoney,
        change: remainingMoney > 0 ? remainingMoney : 0,
      };
    });
  }
}
