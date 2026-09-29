// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Centralized Audit Logging Service
//
// Security & Compliance:
// - Centralizes all platform-level audit trails.
// - Sanitizes metadata to strictly filter out secrets, tokens,
//   and credentials before persisting.
// ============================================================

import { Injectable, Logger } from "@nestjs/common";
import { Prisma, NotificationCategory } from "@prisma/client";
import { NotificationService } from "../notifications/notification.service";
import { PrismaService } from "../../database/prisma.service";

export interface AuditRecordDto {
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  organisationId?: string | null;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditQueryDto {
  search?: string;
  page?: number;
  limit?: number;
  actorId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  organisationId?: string;
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  // Blacklist of sensitive keys that MUST never be recorded into audit metadata
  private readonly SENSITIVE_KEYS = new Set([
    "password",
    "passwordhash",
    "token",
    "accesstoken",
    "refreshtoken",
    "secret",
    "jwtsecret",
    "apikey",
    "razorpaysecret",
    "stripesecret",
    "cvv",
    "creditcard",
  ]);

  constructor(private readonly prisma: PrismaService) {}

  async recordTx(
    tx: Prisma.TransactionClient,
    dto: AuditRecordDto,
  ): Promise<void> {
    await tx.auditLog.create({
      data: {
        ...dto,
        actorId: dto.actorId || null,
        actorRole: dto.actorRole || "SYSTEM",
        metadata: this.sanitizeMetadata(dto.metadata || {}),
      },
    });
    const routes: Record<string, [string, NotificationCategory]> = {
      ORGANISATION: ["platform.organisations.read", "VERIFICATION"],
      SUPPORT: ["platform.support.read", "SUPPORT"],
      JOB: ["platform.moderation.read", "MODERATION"],
      TOKEN_LEDGER: ["platform.tokens.read", "TOKEN"],
      SECURITY: ["platform.security.read", "SECURITY"],
      PAYMENT: ["platform.tokens.sales.read", "PAYMENT"],
      USER: ["platform.users.read", "PLATFORM"],
    };
    const route = routes[dto.entityType];
    if (route)
      await NotificationService.publish(
        tx,
        route[0],
        route[1],
        dto.action.replace(/_/g, " "),
        dto.entityType,
        dto.entityId,
      );
  }

  /**
   * Central entrypoint to record an immutable audit log entry.
   */
  async record(dto: AuditRecordDto): Promise<void> {
    try {
      const sanitizedMeta = this.sanitizeMetadata(dto.metadata || {});

      await this.prisma.auditLog.create({
        data: {
          actorId: dto.actorId || null,
          actorRole: dto.actorRole || "SYSTEM",
          action: dto.action,
          entityType: dto.entityType,
          entityId: dto.entityId,
          organisationId: dto.organisationId || null,
          metadata: sanitizedMeta,
          ipAddress: dto.ipAddress || null,
          userAgent: dto.userAgent ? dto.userAgent.substring(0, 500) : null,
        },
      });

      const category =
        dto.entityType.includes("SECURITY") ||
        dto.entityType === "PLATFORM_SESSION"
          ? "SECURITY"
          : dto.entityType.includes("TOKEN")
            ? "TOKEN"
            : dto.entityType === "ORGANISATION"
              ? "VERIFICATION"
              : "PLATFORM";
      const permission =
        category === "SECURITY"
          ? "platform.security.read"
          : category === "TOKEN"
            ? "platform.tokens.read"
            : category === "VERIFICATION"
              ? "platform.organisations.read"
              : "platform.audit.read";
      await NotificationService.publish(
        this.prisma as any,
        permission,
        category,
        dto.action.replace(/_/g, " "),
        dto.entityType,
        dto.entityId,
      );
      this.logger.log(
        `[AUDIT] Action: ${dto.action} on ${dto.entityType}:${dto.entityId} by ${dto.actorRole || "SYSTEM"} (${dto.actorId || "anon"})`,
      );
    } catch (err) {
      // Never allow audit logging failure to crash primary business flow, but log critical warning
      this.logger.error(
        `Failed to record audit log: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }

  /**
   * Retrieves paginated audit logs for the Platform Super Admin portal.
   */
  async findAuditLogs(query: AuditQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    const search = query.search?.trim();
    const aliases: Record<string, string[]> = {
      "signed in": ["PLATFORM_LOGIN"],
      "signed out": ["PLATFORM_LOGOUT"],
      "admin account created": ["PLATFORM_ADMIN_CREATED"],
      "admin account updated": ["PLATFORM_ADMIN_UPDATED"],
      "organization verified": [
        "ORGANISATION_VERIFIED",
        "ORGANISATION_VERIFICATION_APPROVE",
      ],
      "verification rejected": [
        "ORGANISATION_VERIFICATION_REJECT",
        "ORGANISATION_VERIFICATION_REJECTED",
      ],
      "more information requested": [
        "ORGANISATION_VERIFICATION_REQUEST_INFO",
        "ORGANISATION_VERIFICATION_INFORMATION_REQUESTED",
      ],
    };
    const matchingActions = search
      ? Object.entries(aliases)
          .filter(([label]) => label.includes(search.toLowerCase()))
          .flatMap(([, actions]) => actions)
      : [];
    if (search)
      where.OR = [
        {
          action: {
            contains: search
              .replace(/organization/gi, "organisation")
              .replace(/\s+/g, "_"),
            mode: "insensitive",
          },
        },
        { actor: { is: { email: { contains: search, mode: "insensitive" } } } },
        {
          actor: {
            is: { firstName: { contains: search, mode: "insensitive" } },
          },
        },
        {
          actor: {
            is: { lastName: { contains: search, mode: "insensitive" } },
          },
        },
        {
          organisation: {
            is: { name: { contains: search, mode: "insensitive" } },
          },
        },
        { entityId: { contains: search, mode: "insensitive" } },
        ...(matchingActions.length
          ? [{ action: { in: matchingActions } }]
          : []),
      ];
    if (query.actorId) where.actorId = query.actorId;
    if (query.action)
      where.action = { contains: query.action, mode: "insensitive" };
    if (query.entityType) where.entityType = query.entityType;
    if (query.entityId) where.entityId = query.entityId;
    if (query.organisationId) where.organisationId = query.organisationId;

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const [total, items] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
          organisation: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      }),
    ]);

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Recursively strip out sensitive fields before persisting.
   */
  private sanitizeMetadata(data: Record<string, any>): Record<string, any> {
    if (!data || typeof data !== "object") {
      return {};
    }

    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase().replace(/[-_]/g, "");
      if (this.SENSITIVE_KEYS.has(lowerKey)) {
        result[key] = "[REDACTED]";
      } else if (Array.isArray(value)) {
        result[key] = value.map((item) =>
          item && typeof item === "object" ? this.sanitizeMetadata(item) : item,
        );
      } else if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        result[key] = this.sanitizeMetadata(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
}
