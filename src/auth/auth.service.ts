import { PrismaService } from '../database/prisma.service';
import { randomUUID } from 'crypto';
import { add } from 'date-fns';

import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  private async generateTokensForUser(user: { id: number; email: string }) {
    const payload = { sub: user.id, email: user.email };
    const accessToken = await this.jwtService.signAsync(payload);

    const refreshToken = randomUUID();
    const expiresAt = add(new Date(), { days: 7 });

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        expiresAt,
        user: { connect: { id: user.id } },
      },
    });

    return { accessToken, refreshToken };
  }

  async register(createUserDto: CreateUserDto) {
    const existingUser = await this.usersService.findByEmail(
      createUserDto.email,
    );
    if (existingUser) {
      throw new BadRequestException('Email is already registered.');
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 10);
    const user = await this.usersService.createUser(
      createUserDto.email,
      passwordHash,
      createUserDto.name,
    );

    const emailVerificationToken = randomUUID();
    const emailVerificationExpiresAt = add(new Date(), { hours: 24 });

    await this.prisma.emailVerificationToken.create({
      data: {
        token: emailVerificationToken,
        userId: user.id,
        expiresAt: emailVerificationExpiresAt,
      },
    });

    await this.mailService.sendEmailVerification(
      user.email,
      emailVerificationToken,
    );

    const tokens = await this.generateTokensForUser({
      id: user.id,
      email: user.email,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      ...tokens,
    };
  }

  private async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return null;
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return null;
    }

    return user;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const tokens = await this.generateTokensForUser({
      id: user.id,
      email: user.email,
    });

    return tokens;
  }

  async refresh(refreshToken: string) {
    const existing = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!existing || existing.revoked) {
      throw new UnauthorizedException('Invalid refresh token.');
    }
    if (existing.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired.');
    }

    
    await this.prisma.refreshToken.update({
        where: { id: existing.id },
        data: { revoked: true },
    })
        

    const tokens = await this.generateTokensForUser({
      id: existing.user.id,
      email: existing.user.email,
    });

    return tokens;
  }

  async logout(refreshToken: string) {
    const existing = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!existing) {
      return { success: true };
    }

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revoked: true },
    });

    return { success: true };
  }

  async verifyEmail(token: string) {
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!record || record.used) {
      throw new BadRequestException('Invalid verification token.');
    }

    if (record.expiresAt < new Date()) {
      throw new BadRequestException('Verification token has expired.');
    }

    await this.prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: true },
    });

    await this.prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { used: true },
    });

    return { success: true };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return { success: true };
    }

    const token = randomUUID();
    const expiresAt = add(new Date(), { hours: 1 });

    await this.prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    await this.mailService.sendPasswordReset(email, token);

    return { success: true };
  }

  async resetPassword(token: string, newPassword: string) {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!record || record.used) {
      throw new BadRequestException('Invalid reset token.');
    }

    if (record.expiresAt < new Date()) {
      throw new BadRequestException('Reset token has expired.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId: record.userId },
      data: { revoked: true },
    });

    await this.prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { used: true },
    });

    return { success: true };
  }
}
