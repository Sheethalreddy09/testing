import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { SupportStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notifications/notification.service';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { requirePermission, can } from '../../common/platform-policy';
import { PlatformQueryDto, pagination, paged } from '../../common/dto/platform-query.dto';
import { CreateSupportDto, UpdateSupportDto } from './support.dto';
export const supportTransitions: Record<SupportStatus, SupportStatus[]> = {
  OPEN: ['IN_PROGRESS', 'ESCALATED', 'RESOLVED'],
  IN_PROGRESS: ['ESCALATED', 'RESOLVED'],
  ESCALATED: ['IN_PROGRESS', 'RESOLVED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: ['IN_PROGRESS'],
};
@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}
  async list(q: PlatformQueryDto) {
    if (q.status && !Object.values(SupportStatus).includes(q.status as SupportStatus))
      throw new BadRequestException('Invalid support status');
    const where = {
      ...(q.status ? { status: q.status as SupportStatus } : {}),
      ...(q.organisationId ? { organisationId: q.organisationId } : {}),
      ...(q.search ? { subject: { contains: q.search, mode: 'insensitive' as const } } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.supportCase.findMany({ where, ...pagination(q), orderBy: { updatedAt: 'desc' } }),
      this.prisma.supportCase.count({ where }),
    ]);
    return paged(rows, total, q);
  }
  async detail(id: string) {
    const row = await this.prisma.supportCase.findUnique({
      where: { id },
      include: { activities: { orderBy: { createdAt: 'asc' } } },
    });
    if (!row) throw new NotFoundException('Support case not found');
    return row;
  }
  async create(dto: CreateSupportDto, actor: AuthenticatedUser) {
    requirePermission(actor, 'platform.support.manage');
    return this.prisma.$transaction(async (tx) => {
      const requester = await tx.user.findUnique({ where: { id: dto.requesterId } });
      if (!requester) throw new BadRequestException('Requester not found');
      if (dto.organisationId && requester.organisationId !== dto.organisationId)
        throw new BadRequestException('Requester does not belong to this organisation');
      const row = await tx.supportCase.create({ data: dto });
      await this.audit.recordTx(tx, {
        actorId: actor.userId,
        actorRole: actor.role,
        action: 'SUPPORT_CREATED',
        entityType: 'SUPPORT',
        entityId: row.id,
        organisationId: row.organisationId,
      });
      return row;
    });
  }
  async update(id: string, dto: UpdateSupportDto, actor: AuthenticatedUser) {
    requirePermission(
      actor,
      dto.status === 'ESCALATED' ? 'platform.support.escalate' : 'platform.support.manage',
    );
    return this.prisma.$transaction(
      async (tx) => {
        const row = await tx.supportCase.findUnique({ where: { id } });
        if (!row) throw new NotFoundException('Support case not found');
        if (row.status === 'ESCALATED' && !can(actor, 'platform.support.escalate'))
          throw new ForbiddenException('Escalated cases require escalation authority');
        if (
          dto.status &&
          dto.status !== row.status &&
          !supportTransitions[row.status].includes(dto.status)
        )
          throw new BadRequestException('Invalid support transition');
        if (dto.assignedToId) {
          const assignee = await tx.user.findUnique({
            where: { id: dto.assignedToId },
            include: { platformAdminProfile: true },
          });
          if (
            !assignee?.isActive ||
            !(
              assignee.role === 'PLATFORM_SUPER_ADMIN' ||
              (assignee.role === 'PLATFORM_ADMIN' &&
                assignee.platformAdminProfile?.isActive &&
                assignee.platformAdminProfile.permissions.includes('platform.support.manage'))
            )
          )
            throw new BadRequestException('Assignee must be an active support administrator');
        }
        const result = await tx.supportCase.update({
          where: { id },
          data: {
            status: dto.status,
            assignedToId: dto.assignedToId,
            ...(dto.status === 'ESCALATED' ? { escalatedAt: new Date() } : {}),
            activities: {
              create: {
                actorId: actor.userId,
                message: dto.message,
                previousStatus: row.status,
                nextStatus: dto.status || row.status,
              },
            },
          },
        });
        await this.audit.recordTx(tx, {
          actorId: actor.userId,
          actorRole: actor.role,
          action: dto.status === 'ESCALATED' ? 'SUPPORT_ESCALATED' : 'SUPPORT_UPDATED',
          entityType: 'SUPPORT',
          entityId: id,
          organisationId: row.organisationId,
          metadata: { previousStatus: row.status, nextStatus: result.status },
        });
        if (dto.status === 'ESCALATED')
          await NotificationService.publish(
            tx,
            'platform.support.escalate',
            'SUPPORT',
            'Support case escalated',
            'SUPPORT',
            id,
          );
        return result;
      },
      { isolationLevel: 'Serializable' },
    );
  }
}
