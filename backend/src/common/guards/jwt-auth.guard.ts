// ============================================================
// Clyptus Job Portal - Platform Super Admin
// JWT Authentication Guard - Verifies Cryptographic Identity
// ============================================================

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../database/prisma.service";
import { AuthenticatedUser } from "../interfaces/authenticated-user.interface";
import { UserRole } from "@prisma/client";
import { createHash } from "crypto";
import { platformToken } from "../platform-session-cookie";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = platformToken(request);
    if (!token)
      throw new UnauthorizedException(
        "Authentication token is missing or invalid",
      );
    // Cookie-based writes require a custom header: cross-origin requests must pass CORS preflight.
    if (
      !request.headers.authorization &&
      !["GET", "HEAD", "OPTIONS"].includes(request.method)
    ) {
      if (request.headers["x-requested-with"] !== "XMLHttpRequest") {
        throw new ForbiddenException("Missing request verification header");
      }
      const allowed = [
        this.configService.get<string>("corsOrigin", "http://localhost:5173"),
        "http://localhost:5173",
        "http://localhost:3000",
      ];
      if (request.headers.origin && !allowed.includes(request.headers.origin)) {
        throw new ForbiddenException("Request origin is not allowed");
      }
    }

    try {
      const secret = this.configService.get<string>(
        "jwt.secret",
        this.configService.get<string>(
          "JWT_SECRET",
          "super-secret-jwt-key-replace-in-production-min-32-chars-long",
        ),
      );
      const payload = this.jwtService.verify(token, { secret });

      // Fetch user from DB to ensure account is active and role has not been revoked
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub || payload.userId },
        include: { platformAdminProfile: true },
      });

      if (!user) {
        throw new UnauthorizedException(
          "User session invalid or user does not exist",
        );
      }

      if (!user.isActive) {
        throw new UnauthorizedException("User account has been deactivated");
      }

      if (
        user.role === UserRole.PLATFORM_ADMIN &&
        user.platformAdminProfile &&
        !user.platformAdminProfile.isActive
      ) {
        throw new UnauthorizedException(
          "Platform Admin account has been deactivated",
        );
      }

      // Bearer tokens are tied to PlatformSession so server-side revocation is enforceable.
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const session = await this.prisma.platformSession.findUnique({
        where: { tokenHash },
      });

      if (
        !session ||
        session.userId !== user.id ||
        session.revokedAt ||
        session.expiresAt <= new Date()
      ) {
        throw new UnauthorizedException(
          "User session has expired or been revoked",
        );
      }

      // Attach strongly-typed identity to request
      const authenticatedUser: AuthenticatedUser = {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissions:
          user.platformAdminProfile?.permissions ||
          (user.role === UserRole.PLATFORM_SUPER_ADMIN ? ["*"] : []),
        organisationId: user.organisationId,
      };

      request.user = authenticatedUser;
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException(
        "Invalid or expired authentication token",
      );
    }
  }
}
