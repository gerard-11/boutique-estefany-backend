import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, User } from '@prisma/client';

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
}
