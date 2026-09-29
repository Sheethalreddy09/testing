import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { requirePermission, publicUser, ordinaryRoles } from '../../../common/platform-policy';
import { PlatformQueryDto, pagination, paged } from '../../../common/dto/platform-query.dto';
@Injectable()
export class PlatformUserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}
  async list(q: PlatformQueryDto) {
    if (q.role && !(ordinaryRoles as readonly string[]).includes(q.role))
      throw new BadRequestException('Only organisation and candidate roles are supported');
    if (q.status && !['ACTIVE', 'SUSPENDED'].includes(q.status))
      throw new BadRequestException('Invalid account status');
    const where = {
      role: q.role ? (q.role as UserRole) : { in: [...ordinaryRoles] },
      ...(q.organisationId ? { organisationId: q.organisationId } : {}),
      ...(q.status ? { isActive: q.status === 'ACTIVE' } : {}),
      ...(q.search
        ? {
            OR: [
              { email: { contains: q.search, mode: 'insensitive' as const } },
              { firstName: { contains: q.search, mode: 'insensitive' as const } },
              { lastName: { contains: q.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: publicUser,
        ...pagination(q),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);
    return paged(rows, total, q);
  }
  async status(id: string, active: boolean, reason: string, actor: AuthenticatedUser) {
    requirePermission(actor, active ? 'platform.users.reactivate' : 'platform.users.suspend');
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id } });
      if (!user) throw new NotFoundException('User not found');
      if (!(ordinaryRoles as readonly string[]).includes(user.role) || id === actor.userId)
        throw new ForbiddenException('Platform accounts cannot be modified here');
      const changed = await tx.user.updateMany({
        where: { id, role: { in: [...ordinaryRoles] } },
        data: { isActive: active },
      });
      if (!changed.count) throw new ForbiddenException('User role changed');
      if (!active)
        await tx.platformSession.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      await this.audit.recordTx(tx, {
        actorId: actor.userId,
        actorRole: actor.role,
        action: active ? 'USER_REACTIVATED' : 'USER_SUSPENDED',
        entityType: 'USER',
        entityId: id,
        organisationId: user.organisationId,
        metadata: { reason },
      });
      return { id, isActive: active };
    });
  }
  async activity(id: string, q: PlatformQueryDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || !(ordinaryRoles as readonly string[]).includes(user.role))
      throw new NotFoundException('User not found');
    // Account administration history only; no unrelated privileged actor activity.
    return this.audit.findAuditLogs({ ...q, entityType: 'USER', entityId: id });
  }
}
