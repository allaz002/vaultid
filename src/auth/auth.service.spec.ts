import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { MailService } from '../mail/mail.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedPw'),
  compare: jest.fn().mockResolvedValue(false),
}));

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    createUser: jest.fn(),
    findById: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockPrismaService = {
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    emailVerificationToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    passwordResetToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
  };

  const mockMailService = {
    sendEmailVerification: jest.fn(),
    sendPasswordReset: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw BadRequestException if email already exists on register', async () => {
    mockUsersService.findByEmail.mockResolvedValue({
      id: 1,
      email: 'existing@example.com',
    });

    await expect(
      service.register({
        email: 'existing@example.com',
        password: 'password123',
        name: 'Existing',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(mockUsersService.createUser).not.toHaveBeenCalled();
  });

  it('should register a new user and return user + tokens', async () => {
    mockUsersService.findByEmail.mockResolvedValue(null);
    mockUsersService.createUser.mockResolvedValue({
      id: 1,
      email: 'new@example.com',
      name: 'New User',
    });

    mockJwtService.signAsync.mockResolvedValue('ACCESS_TOKEN');

    mockPrismaService.refreshToken.create.mockResolvedValue({});
    mockPrismaService.emailVerificationToken.create.mockResolvedValue({});

    const result = await service.register({
      email: 'new@example.com',
      password: 'geheim123',
      name: 'New User',
    });

    expect(mockUsersService.createUser).toHaveBeenCalledWith(
      'new@example.com',
      'hashedPw',
      'New User',
    );

    expect(mockMailService.sendEmailVerification).toHaveBeenCalled();

    expect(result.user).toEqual({
      id: 1,
      email: 'new@example.com',
      name: 'New User',
    });
    expect(result.accessToken).toBe('ACCESS_TOKEN');
    expect(result.refreshToken).toBeDefined();
  });

  it('should throw UnauthorizedException for invalid credentials', async () => {
    mockUsersService.findByEmail.mockResolvedValue(null);

    await expect(
      service.login({ email: 'doesnot@exist', password: 'invalid' }),
    ).rejects.toThrow(UnauthorizedException);

    expect(mockUsersService.findByEmail).toHaveBeenCalledWith('doesnot@exist');
  });

  it('should return tokens on successful login', async () => {
    const user = { id: 1, email: 'login@example.com' };

    const validateSpy = jest
      .spyOn(service as any, 'validateUser')
      .mockResolvedValue(user);

    mockJwtService.signAsync.mockResolvedValue('ACCESS_TOKEN');
    mockPrismaService.refreshToken.create.mockResolvedValue({});

    const result = await service.login({
      email: 'login@example.com',
      password: 'geheim123',
    });

    expect(validateSpy).toHaveBeenCalled();
    expect(result.accessToken).toBe('ACCESS_TOKEN');
    expect(result.refreshToken).toBeDefined();
  });

  it('should throw UnauthorizedException for invalid refresh token', async () => {
    mockPrismaService.refreshToken.findUnique.mockResolvedValue(null);

    await expect(service.refresh('invalid-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should logout gracefully even if refresh token does not exist', async () => {
    mockPrismaService.refreshToken.findUnique.mockResolvedValue(null);

    const result = await service.logout('non-existent-token');

    expect(result).toEqual({ success: true });
  });
});
