import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionStatus, TransactionType } from '@prisma/client';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyChecks() {
    this.logger.log('Iniciando revisión diaria de deudas y apartados...');
    await this.checkOverduePayments();
    await this.checkExpiredLayaways();
    this.logger.log('Revisión diaria completada.');
  }

  private async checkOverduePayments() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const overdueUsers = await this.prisma.user.findMany({
      where: {
        role: 'CLIENT',
        transactions: {
          some: {
            status: {
              in: [
                TransactionStatus.ACTIVE,
                TransactionStatus.PENDING_APPROVAL,
              ],
            },
          }
        },
        OR: [
          { lastPaymentDate: { lt: sevenDaysAgo } },
          { 
            AND: [
              { lastPaymentDate: null },
              { createdAt: { lt: sevenDaysAgo } }
            ]
          }
        ]
      }
    });

    for (const user of overdueUsers) {
      this.logger.warn(`Alerta: El cliente ${user.firstName} (${user.email}) tiene pagos retrasados.`);
      // TODO: Aquí se integrará Firebase Cloud Messaging (FCM) para enviar la notificación al celular
    }
  }

  private async checkExpiredLayaways() {
    const now = new Date();

    const expiredTransactions = await this.prisma.transaction.findMany({
      where: {
        type: TransactionType.APARTADO,
        status: TransactionStatus.ACTIVE,
        expiresAt: { lt: now },
      },
      include: { user: true }
    });

    for (const tx of expiredTransactions) {
      this.logger.error(`Alerta de Negocio: El apartado ${tx.id} de ${tx.user.firstName} ha vencido.`);
      // En un negocio local, solo avisamos al Admin. El Admin decide si cancela o extiende.
    }
  }
}
