import { NotificationService } from '../notifications/notification.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PlatformLoginDto } from './dto/platform-login.dto';

interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async loginPlatform(dto: PlatformLoginDto, context: RequestContext = {}) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { platformAdminProfile: true },
    });

    // Use one generic message so callers cannot enumerate privileged accounts.
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPlatformRole =
      user.role === UserRole.PLATFORM_SUPER_ADMIN || user.role === UserRole.PLATFORM_ADMIN;

    if (!isPlatformRole) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      await this.recordFailedLogin(user.id, context, 'INVALID_PASSWORD');
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      await this.recordFailedLogin(user.id, context, 'USER_INACTIVE');
      throw new UnauthorizedException('Your platform account is inactive');
    }

    if (
      user.role === UserRole.PLATFORM_ADMIN &&
      user.platformAdminProfile &&
      !user.platformAdminProfile.isActive
    ) {
      await this.recordFailedLogin(user.id, context, 'ADMIN_PROFILE_INACTIVE');
      throw new UnauthorizedException('Your platform account is inactive');
    }

    const permissions =
      user.role === UserRole.PLATFORM_SUPER_ADMIN
        ? ['*']
        : user.platformAdminProfile?.permissions || [];

    const jwtSecret = this.configService.get<string>(
      'jwt.secret',
      this.configService.get<string>(
        'JWT_SECRET',
        'super-secret-jwt-key-replace-in-production-min-32-chars-long',
      ),
    );
    const jwtExpiresIn = this.configService.get<string>(
      'jwt.expiresIn',
      this.configService.get<string>('JWT_EXPIRES_IN', '1d'),
    );

    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      {
        secret: jwtSecret,
        expiresIn: jwtExpiresIn as any,
      },
    );

    const decoded = this.jwtService.decode(accessToken) as { exp?: number } | null;
    const expiresAt = decoded?.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);

    const session = await this.prisma.platformSession.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(accessToken),
        ipAddress: context.ipAddress || null,
        userAgent: context.userAgent?.substring(0, 500) || null,
        expiresAt,
      },
    });

    await this.auditService.record({
      actorId: user.id,
      actorRole: user.role,
      action: 'PLATFORM_LOGIN',
      entityType: 'PLATFORM_SESSION',
      entityId: session.id,
      metadata: { email: user.email },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return {
      accessToken,
      expiresAt: expiresAt.toISOString(),
      user: {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissions,
      },
    };
  }

  async getCurrentUser(actor: AuthenticatedUser) {
    return {
      userId: actor.userId,
      email: actor.email,
      firstName: actor.firstName,
      lastName: actor.lastName,
      role: actor.role,
      permissions: actor.permissions || [],
    };
  }

  async logout(token: string, actor: AuthenticatedUser, context: RequestContext = {}) {
    const tokenHash = this.hashToken(token);
    const session = await this.prisma.platformSession.findUnique({
      where: { tokenHash },
    });

    if (session && !session.revokedAt) {
      await this.prisma.platformSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });

      await this.auditService.record({
        actorId: actor.userId,
        actorRole: actor.role,
        action: 'PLATFORM_LOGOUT',
        entityType: 'PLATFORM_SESSION',
        entityId: session.id,
        metadata: {},
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
    }

    return { loggedOut: true };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async recordFailedLogin(actorId: string, context: RequestContext, reason: string) {
    try {
      const event = await this.prisma.securityEvent.create({
        data: {
          eventType: 'PLATFORM_LOGIN_FAILED',
          severity: 'LOW',
          actorId,
          ipAddress: context.ipAddress || null,
          userAgent: context.userAgent?.substring(0, 500) || null,
          details: { reason },
        },
      });
      if (event?.id)
        await NotificationService.publish(
          this.prisma as any,
          'platform.security.read',
          'SECURITY',
          'Failed platform login',
          'SECURITY_EVENT',
          event.id,
        );
    } catch {
      // Authentication failures must remain safe even when security-event persistence is unavailable.
    }
  }
}
