import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dtos/product.dto';
import { Product } from '@prisma/client';

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
    return this.prisma.product.create({
      data,
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
