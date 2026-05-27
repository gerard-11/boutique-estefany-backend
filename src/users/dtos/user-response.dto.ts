import { Role, Level } from '@prisma/client';

export class UserResponseDto {
  email: string | null;
  firstName: string;
  lastName: string | null;
  role: Role;
  level: Level;
  avatarUrl: string | null;
  creditLimit: number;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
