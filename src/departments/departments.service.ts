import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dtos/department.dto';
import { Department } from '@prisma/client';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<Department[]> {
    return this.prisma.department.findMany({
      include: {
        categories: true,
      },
    });
  }

  // Buscar uno por ID
  async findOne(id: string): Promise<Department | null> {
    return this.prisma.department.findUnique({
      where: { id },
      include: {
        categories: true,
      },
    });
  }

  async create(data: CreateDepartmentDto): Promise<Department> {
    return this.prisma.department.create({
      data,
    });
  }

  async update(id: string, data: UpdateDepartmentDto): Promise<Department> {
    return this.prisma.department.update({
      where: { id },
      data,
    });
  }

  async remove(id: string): Promise<Department> {
    return this.prisma.department.delete({
      where: { id },
    });
  }
}
