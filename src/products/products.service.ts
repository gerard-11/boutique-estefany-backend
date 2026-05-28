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

  async findByBarcode(barcode: string): Promise<Product | null> {
    return this.prisma.product.findUnique({
      where: { barcode },
      include: {
        category: {
          include: {
            department: true,
          },
        },
      },
    });
  }

  async create(data: CreateProductDto): Promise<Product> {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data,
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
    // El stock no se debe actualizar directamente aquí para no perder trazabilidad
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { stock, ...updateData } = data;
    return this.prisma.product.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string): Promise<Product> {
    return this.prisma.product.delete({
      where: { id },
    });
  }
}
