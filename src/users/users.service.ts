import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, User, TransactionStatus, Level } from '@prisma/client';
import { UpdateUserFinancialDto } from './dtos/update-user-financial.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByFirebaseUid(firebaseUid: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { firebaseUid },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async createUserFromFirebase(
    firebaseUid: string,
    email: string,
    firstName: string,
    avatarUrl?: string,
  ): Promise<User> {
    const adminExists = await this.prisma.user.findFirst({
      where: { role: Role.ADMIN },
    });
    const isFirstAdmin = !adminExists;

    return this.prisma.user.create({
      data: {
        firebaseUid,
        email,
        firstName,
        avatarUrl,
        role: isFirstAdmin ? Role.ADMIN : Role.CLIENT,
      },
    });
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  // --- LÓGICA FINANCIERA Y GESTIÓN DE CLIENTES ---

  // Listar todos los clientes con filtros (Solo Admin)
  async findAllClients(filters?: {
    level?: Level;
    searchTerm?: string;
  }): Promise<User[]> {
    const { level, searchTerm } = filters || {};
    return this.prisma.user.findMany({
      where: {
        role: Role.CLIENT,
        ...(level ? { level } : {}),
        ...(searchTerm
          ? {
              OR: [
                { firstName: { contains: searchTerm, mode: 'insensitive' } },
                { lastName: { contains: searchTerm, mode: 'insensitive' } },
                { email: { contains: searchTerm, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { lastPaymentDate: 'asc' },
    });
  }

  // Actualizar Nivel o Límite de Crédito (Solo Admin)
  async updateFinancialData(
    id: string,
    data: UpdateUserFinancialDto,
  ): Promise<User> {
    const { reason, ...updateData } = data;                   
    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    if (data.level) {
      // LOGICA DE NOTIFICACIÓN (Placeholder para FCM)
      console.log(
        `[NOTIFICACIÓN] El usuario ${user.firstName} ha subido a nivel ${user.level}. Razón: ${reason || 'Cumplimiento de pagos'}`,
      );
      // Aquí dispararíamos Firebase Cloud Messaging en el futuro
    }

    return user;
  }

  // El "Objeto Enriquecido": Calcula la deuda y el semáforo de pago al vuelo
  async getEnrichedProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        transactions: {
          where: {
            status: {
              in: [
                TransactionStatus.ACTIVE,
                TransactionStatus.PENDING_APPROVAL,
              ],
            },
          },
          include: {
            payments: {
              orderBy: { paymentDate: 'desc' },
            },
            items: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // 1. Cálculo de Deuda Actual
    let totalDebt = 0;
    for (const tx of user.transactions) {
      const totalPaid = tx.payments.reduce((sum, p) => sum + p.amount, 0);
      const remaining = tx.totalAmount - totalPaid;
      if (remaining > 0) totalDebt += remaining;
    }

    const availableCredit = Math.max(0, user.creditLimit - totalDebt);

    // 2. Cálculo del Semáforo (Basado en el último pago o creación de crédito)
    let paymentStatus: 'NORMAL' | 'RETRASADO' | 'ATRASADO' = 'NORMAL';

    if (totalDebt > 0) {
      const referenceDate = user.lastPaymentDate || user.createdAt;
      const diffInDays = Math.floor(
        (new Date().getTime() - new Date(referenceDate).getTime()) /
          (1000 * 3600 * 24),
      );

      if (diffInDays > 30) {
        paymentStatus = 'ATRASADO'; // ROJO
      } else if (diffInDays > 7) {
        paymentStatus = 'RETRASADO'; // AMARILLO/NARANJA
      }
    }

    return {
      ...user,
      financialSummary: {
        currentDebt: totalDebt,
        availableCredit: availableCredit,
        paymentStatus: paymentStatus,
      },
    };
  }

  async getPaymentHistory(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const activeAccounts = await this.prisma.transaction.findMany({
      where: {
        userId,
        status: {
          in: [TransactionStatus.ACTIVE, TransactionStatus.PENDING_APPROVAL],
        },
      },
      include: {
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const payments = await this.prisma.payment.findMany({
      where: {
        transaction: {
          userId,
        },
      },
      include: {
        transaction: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
    });

    const transactions = await this.prisma.transaction.findMany({
      where: { userId },
      include: {
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const mapProduct = (item: any) => ({
      id: item.product.id,
      barcode: item.product.barcode,
      name: item.product.name,
      color: item.product.color,
      size: item.product.size,
      brand: item.product.brand,
      imageUrl: item.product.imageUrl,
      quantity: item.quantity,
      priceAtTime: item.priceAtTime,
      costAtTime: item.costAtTime,
    });

    return {
      activeAccounts: activeAccounts.map((transaction) => {
        const totalPaid = transaction.payments.reduce(
          (sum, payment) => sum + payment.amount,
          0,
        );
        const remainingBalance = Math.max(
          0,
          transaction.totalAmount - totalPaid,
        );

        return {
          id: transaction.id,
          type: transaction.type,
          status: transaction.status,
          originalAmount: transaction.originalAmount,
          discountPercentage: transaction.discountPercentage,
          totalAmount: transaction.totalAmount,
          totalPaid,
          remainingBalance,
          weeklyPayment: transaction.weeklyPayment,
          expiresAt: transaction.expiresAt,
          createdAt: transaction.createdAt,
          updatedAt: transaction.updatedAt,
          products: transaction.items.map(mapProduct),
          payments: transaction.payments.map((payment) => ({
            id: payment.id,
            amount: payment.amount,
            method: payment.method,
            paymentDate: payment.paymentDate,
          })),
        };
      }),
      transactions: transactions.map((transaction) => {
        const totalPaid = transaction.payments.reduce(
          (sum, payment) => sum + payment.amount,
          0,
        );
        const remainingBalance = Math.max(
          0,
          transaction.totalAmount - totalPaid,
        );

        return {
          id: transaction.id,
          type: transaction.type,
          status: transaction.status,
          originalAmount: transaction.originalAmount,
          discountPercentage: transaction.discountPercentage,
          totalAmount: transaction.totalAmount,
          totalPaid,
          remainingBalance,
          weeklyPayment: transaction.weeklyPayment,
          expiresAt: transaction.expiresAt,
          createdAt: transaction.createdAt,
          updatedAt: transaction.updatedAt,
          products: transaction.items.map(mapProduct),
          payments: transaction.payments.map((payment) => ({
            id: payment.id,
            amount: payment.amount,
            method: payment.method,
            paymentDate: payment.paymentDate,
          })),
        };
      }),
      payments: payments.map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        method: payment.method,
        paymentDate: payment.paymentDate,
        transaction: {
          id: payment.transaction.id,
          type: payment.transaction.type,
          status: payment.transaction.status,
          totalAmount: payment.transaction.totalAmount,
          createdAt: payment.transaction.createdAt,
          products: payment.transaction.items.map(mapProduct),
        },
      })),
    };
  }

}
