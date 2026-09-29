import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

const makeUser = async (overrides: Record<string, any> = {}) => ({
  id: 'usr-platform-1',
  email: 'admin@clyptus.platform',
  passwordHash: await bcrypt.hash('StrongPassword!123', 4),
  firstName: 'Platform',
  lastName: 'Admin',
  role: UserRole.PLATFORM_ADMIN,
  isActive: true,
  organisationId: null,
  platformAdminProfile: {
    isActive: true,
    permissions: ['platform.organisations.read'],
  },
  ...overrides,
});

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;
  let configService: any;
  let auditService: any;

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn() },
      platformSession: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      securityEvent: { create: jest.fn() },
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-access-token'),
      decode: jest.fn().mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 }),
    };

    configService = {
      get: jest.fn((_key: string, fallback: any) => fallback),
    } as unknown as ConfigService;

    auditService = { record: jest.fn() };

    service = new AuthService(
      prisma,
      jwtService as JwtService,
      configService,
      auditService,
    );
  });

  it('logs in a Platform Admin and returns only assigned permissions', async () => {
    const user = await makeUser();
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.platformSession.create.mockResolvedValue({ id: 'session-1' });

    const result = await service.loginPlatform({
      email: 'ADMIN@CLYPTUS.PLATFORM',
      password: 'StrongPassword!123',
    });

    expect(result.user.role).toBe(UserRole.PLATFORM_ADMIN);
    expect(result.user.permissions).toEqual(['platform.organisations.read']);
    expect(result.accessToken).toBe('signed-access-token');
    expect(prisma.platformSession.create).toHaveBeenCalledTimes(1);
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'PLATFORM_LOGIN' }),
    );
  });

  it('gives Platform Super Admin wildcard permissions', async () => {
    const user = await makeUser({
      role: UserRole.PLATFORM_SUPER_ADMIN,
      platformAdminProfile: null,
    });
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.platformSession.create.mockResolvedValue({ id: 'session-2' });

    const result = await service.loginPlatform({
      email: user.email,
      password: 'StrongPassword!123',
    });

    expect(result.user.permissions).toEqual(['*']);
  });

  it('rejects a non-platform account from the Platform Portal', async () => {
    const user = await makeUser({ role: UserRole.CANDIDATE, platformAdminProfile: null });
    prisma.user.findUnique.mockResolvedValue(user);

    await expect(
      service.loginPlatform({ email: user.email, password: 'StrongPassword!123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an invalid password without exposing account details', async () => {
    const user = await makeUser();
    prisma.user.findUnique.mockResolvedValue(user);

    await expect(
      service.loginPlatform({ email: user.email, password: 'wrong-password' }),
    ).rejects.toThrow('Invalid email or password');
  });

  it('revokes the current server-side session on logout', async () => {
    prisma.platformSession.findUnique.mockResolvedValue({
      id: 'session-3',
      userId: 'usr-platform-1',
      revokedAt: null,
    });
    prisma.platformSession.update.mockResolvedValue({ id: 'session-3' });

    await service.logout(
      'signed-access-token',
      {
        userId: 'usr-platform-1',
        email: 'admin@clyptus.platform',
        firstName: 'Platform',
        lastName: 'Admin',
        role: UserRole.PLATFORM_ADMIN,
        permissions: [],
      },
    );

    expect(prisma.platformSession.update).toHaveBeenCalledWith({
      where: { id: 'session-3' },
      data: { revokedAt: expect.any(Date) },
    });
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'PLATFORM_LOGOUT' }),
    );
  });
});
