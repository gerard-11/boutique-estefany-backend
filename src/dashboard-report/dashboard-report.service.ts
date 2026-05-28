import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionStatus, MovementType } from '@prisma/client';

@Injectable()
export class DashboardReportService {
  constructor(private prisma: PrismaService) {}

  async getFinancialSummary() {
    // 1. Capital Total (Dinero en mercancía actual)
    // Calculado como Suma(Stock * Costo actual)
    const products = await this.prisma.product.findMany({
      select: {
        stock: true,
        cost: true,
      },
    });
    const totalCapital = products.reduce(
      (sum, p) => sum + p.stock * p.cost,
      0,
    );

    // 2. Dinero Volando (Cuentas por cobrar)
    // Suma de totalAmount de transacciones ACTIVAS/PENDIENTES menos lo ya pagado
    const activeTransactions = await this.prisma.transaction.findMany({
      where: {
        status: {
          in: [TransactionStatus.ACTIVE, TransactionStatus.PENDING_APPROVAL],
        },
      },
      include: {
        payments: true,
      },
    });

    let moneyInTheAir = 0;
    activeTransactions.forEach((tx) => {
      const totalPaid = tx.payments.reduce((sum, p) => sum + p.amount, 0);
      moneyInTheAir += tx.totalAmount - totalPaid;
    });

    // 3. Mermas del mes (Pérdidas reales)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const mermas = await this.prisma.inventoryMovement.findMany({
      where: {
        type: MovementType.MERMA,
        createdAt: { gte: startOfMonth },
      },
    });
    // Recordar que quantity en merma es negativa, usamos Math.abs
    const totalMermas = mermas.reduce(
      (sum, m) => sum + Math.abs(m.quantity) * m.costAtTime,
      0,
    );

    // 4. Ventas del día (Liquidez inmediata)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayPayments = await this.prisma.payment.aggregate({
      where: {
        paymentDate: { gte: startOfDay },
      },
      _sum: {
        amount: true,
      },
    });

    return {
      totalCapital,
      moneyInTheAir,
      totalMermas,
      todayLiquidity: todayPayments._sum.amount || 0,
      timestamp: new Date(),
    };
  }
}
