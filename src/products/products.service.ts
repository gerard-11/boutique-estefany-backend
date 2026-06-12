import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dtos/product.dto';
import { Product, MovementType, TransactionStatus } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  private async enrichProductData(product: any) {
    if (!product) return null;

    // 1. Detectar transacciones activas (Préstamos, Apartados, Créditos en curso)
    const activeTransaction = product.transactionItems.find((ti: any) =>
      [TransactionStatus.ACTIVE, TransactionStatus.PENDING_APPROVAL].includes(
        ti.transaction.status,
      ),
    )?.transaction || null;

    // 2. Si no hay transacción activa pero stock es 0, buscar la última venta completada
    const lastTransaction =
      !activeTransaction && product.stock === 0
        ? await this.prisma.transactionItem
            .findFirst({
              where: { productId: product.id },
              include: { transaction: { include: { user: true } } },
              orderBy: { transaction: { createdAt: 'desc' } },
            })
            .then((ti) => ti?.transaction)
        : null;

    let currentStatus = 'AVAILABLE';
    let assignedTo: {
      id: string;
      name: string;
      transactionId: string;
      status: string;
    } | null = null;

    if (activeTransaction) {
      currentStatus = activeTransaction.type; // PRESTAMO, APARTADO, CREDITO_SEMANAL
      assignedTo = {
        id: activeTransaction.user.id,
        name: `${activeTransaction.user.firstName} ${activeTransaction.user.lastName || ''}`.trim(),
        transactionId: activeTransaction.id,
        status: activeTransaction.status,
      };
    } else if (lastTransaction) {
      currentStatus = 'SOLD';
      assignedTo = {
        id: lastTransaction.user.id,
        name: `${lastTransaction.user.firstName} ${lastTransaction.user.lastName || ''}`.trim(),
        transactionId: lastTransaction.id,
        status: 'COMPLETED',
      };
    } else if (product.stock <= 0) {
      currentStatus = 'UNAVAILABLE';
    }

    return {
      ...product,
      inventoryStatus: {
        status: currentStatus,
        assignedTo,
        canSell: product.stock > 0 && !activeTransaction,
        canLoan: product.stock > 0 && currentStatus === 'AVAILABLE',
        canApart: product.stock > 0 && currentStatus === 'AVAILABLE',
      },
    };
  }

  async findAll(filters?: {
    categoryId?: string;
    searchTerm?: string;
  }): Promise<any[]> {
    const { categoryId, searchTerm } = filters || {};

    const products = await this.prisma.product.findMany({
      where: {
        AND: [
          categoryId ? { categoryId } : {},
          searchTerm
            ? {
                OR: [
                  { name: { contains: searchTerm, mode: 'insensitive' } },
                  { barcode: { contains: searchTerm, mode: 'insensitive' } },
                  { brand: { contains: searchTerm, mode: 'insensitive' } },
                ],
              }
            : {},
        ],
      },
      include: {
        category: {
          include: { department: true },
        },
        transactionItems: {
          include: {
            transaction: { include: { user: true } },
          },
        },
      },
    });

    const enriched = await Promise.all(
      products.map((p) => this.enrichProductData(p)),
    );

    return enriched.sort((a, b) => {
      const aAvail = a.inventoryStatus.canSell ? 1 : 0;
      const bAvail = b.inventoryStatus.canSell ? 1 : 0;
      return bAvail - aAvail;
    });
  }

  async findOne(id: string): Promise<any | null> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: { include: { department: true } },
        transactionItems: {
          include: {
            transaction: { include: { user: true } },
          },
        },
      },
    });

    if (!product) throw new NotFoundException('Producto no encontrado');
    return this.enrichProductData(product);
  }

  async findByBarcode(barcode: string): Promise<any | null> {
    const product = await this.prisma.product.findUnique({
      where: { barcode },
      include: {
        category: { include: { department: true } },
        deliveryRequestItems: {
          where: { deliveryRequest: { status: 'PENDING' } },
          include: { deliveryRequest: { include: { user: true } } },
        },
        transactionItems: {
          include: {
            transaction: { include: { user: true } },
          },
        },
      },
    });

    if (!product) return null;
    return this.enrichProductData(product);
  }

  async create(data: CreateProductDto): Promise<Product> {
    return this.prisma.$transaction(async (tx) => {
      let categoryId = data.categoryId;

      if (!categoryId) {
        if (
          !data.categoryName ||
          (!data.departmentName && !data.departmentId)
        ) {
          throw new Error(
            'Debe proporcionar un categoryId o categoryName junto con departmentName o departmentId',
          );
        }

        let deptId = data.departmentId;

        if (!deptId && data.departmentName) {
          const deptName = data.departmentName.trim();
          const department = await tx.department.upsert({
            where: { name: deptName },
            update: {},
            create: { name: deptName },
          });
          deptId = department.id;
        }

        if (!deptId) {
          throw new Error('No se pudo determinar el departamento');
        }

        const catName = data.categoryName.trim();
        const category = await tx.category.upsert({
          where: {
            name_departmentId: {
              name: catName,
              departmentId: deptId,
            },
          },
          update: {},
          create: {
            name: catName,
            departmentId: deptId,
          },
        });

        categoryId = category.id;
      }

      const { categoryName, departmentName, departmentId, ...productData } = data;
      const product = await tx.product.create({
        data: {
          ...productData,
          categoryId: categoryId as string,
        },
      });

      if (data.stock && data.stock > 0) {
        await tx.inventoryMovement.create({
          data: {
            productId: product.id,
            quantity: data.stock,
            type: MovementType.AJUSTE_MANUAL,
            costAtTime: data.cost || 0,
            priceAtTime: data.price,
            reason: 'Carga inicial de producto',
          },
        });
      }

      return product;
    });
  }

  async manualAdjustment(
    productId: string,
    quantity: number,
    type: MovementType,
    reason: string,
    newCost?: number,
    newPrice?: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw new Error('Producto no encontrado');

      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: {
          stock: { increment: quantity },
          ...(newCost !== undefined ? { cost: newCost } : {}),
          ...(newPrice !== undefined ? { price: newPrice } : {}),
        },
      });

      await tx.inventoryMovement.create({
        data: {
          productId,
          quantity,
          type,
          costAtTime: newCost !== undefined ? newCost : product.cost,
          priceAtTime: newPrice !== undefined ? newPrice : product.price,
          reason,
        },
      });

      return updatedProduct;
    });
  }

  async update(id: string, data: UpdateProductDto): Promise<Product> {
    return this.prisma.product.update({
      where: { id },
      data,
    });
  }

  async remove(id: string): Promise<Product> {
    return this.prisma.product.delete({
      where: { id },
    });
  }
}
