import { Injectable } from '@nestjs/common';
import { User } from './user.entity';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class UsersService {
  private users: User[] = [];
  private idCounter = 1;

  constructor(private readonly prisma: PrismaService) {}

  async createUser(email: string, passwordHash: string, name?: string) {
    return this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        createdAt: true,
      },
    });
  }
}
