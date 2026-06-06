import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dtos/product.dto';
import { Product, MovementType } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: {
    categoryId?: string;
    searchTerm?: string;
  }): Promise<Product[]> {
    const { categoryId, searchTerm } = filters || {};

    return this.prisma.product.findMany({
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
          include: {
            department: true,
          },
        },
      },
    });
  }

  async findOne(id: string): Promise<Product | null> {
    return this.prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          include: {
            department: true,
          },
        },
      },
    });
  }

  async findByBarcode(barcode: string): Promise<any | null> {
    const product = await this.prisma.product.findUnique({
      where: { barcode },
      include: {
        category: {
          include: {
            department: true,
          },
        },
        deliveryRequestItems: {
          where: {
            deliveryRequest: {
              status: 'PENDING',
            },
          },
          include: {
            deliveryRequest: {
              include: {
                user: true,
              },
            },
          },
        },
        transactionItems: {
          where: {
            transaction: {
              status: 'ACTIVE',
            },
          },
          include: {
            transaction: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!product) return null;

    // Mapear alertas de reserva suave (Pedidos App)
    const pendingDeliveries = product.deliveryRequestItems.map((item) => ({
      requestId: item.deliveryRequestId,
      clientName: item.deliveryRequest.user.firstName,
      requestDate: item.deliveryRequest.createdAt,
    }));

    // Detectar si está en préstamo o apartado activo
    const activeTransaction = product.transactionItems[0]?.transaction || null;
    
    let currentStatus = 'AVAILABLE';
    let assignedTo: { id: string; name: string; transactionId: string } | null = null;

    if (activeTransaction) {
      currentStatus = activeTransaction.type; // PRESTAMO o APARTADO
      assignedTo = {
        id: activeTransaction.user.id,
        name: `${activeTransaction.user.firstName} ${activeTransaction.user.lastName || ''}`.trim(),
        transactionId: activeTransaction.id,
      };
    } else if (product.stock <= 0) {
      currentStatus = 'OUT_OF_STOCK';
    }

    return {
      ...product,
      softReservationAlert: pendingDeliveries.length > 0 ? pendingDeliveries : null,
      inventoryStatus: {
        status: currentStatus,
        assignedTo,
        canSell: product.stock > 0,
        canLoan: product.stock > 0 && currentStatus === 'AVAILABLE',
        canApart: product.stock > 0 && currentStatus === 'AVAILABLE',
      },
    };
  }

  async create(data: CreateProductDto): Promise<Product> {
    return this.prisma.$transaction(async (tx) => {
      let categoryId = data.categoryId;

      if (!categoryId) {
        if (!data.categoryName || !data.departmentName) {
          throw new Error(
            'Debe proporcionar un categoryId o ambos: categoryName y departmentName',
          );
        }

        const deptName = data.departmentName.trim();
        const department = await tx.department.upsert({
          where: { name: deptName },
          update: {},
          create: { name: deptName },
        });

        // 2. Buscar o crear Categoría (Normalizado a Capital Case)
        const catName = data.categoryName.trim();
        const category = await tx.category.upsert({
          where: {
            name_departmentId: {
              name: catName,
              departmentId: department.id,
            },
          },
          update: {},
          create: {
            name: catName,
            departmentId: department.id,
          },
        });

        categoryId = category.id;
      }

      // 3. Crear el producto
      const { categoryName, departmentName, ...productData } = data;
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
