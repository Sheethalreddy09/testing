import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { RecruitmentPort } from '../contracts/platform-domains';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { requirePermission } from '../../../common/platform-policy';
import { PlatformQueryDto, pagination, paged } from '../../../common/dto/platform-query.dto';
import { ReasonDto } from '../organisations/dto/operations.dto';
import { IsEnum } from 'class-validator';
import { ModerationAction } from '@prisma/client';
export class ModerateJobDto extends ReasonDto {
  @IsEnum(ModerationAction) action!: ModerationAction;
}
@Injectable()
export class ModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly jobs: RecruitmentPort,
  ) {}
  list(a: AuthenticatedUser, q: PlatformQueryDto) {
    return this.jobs.jobs(a, q);
  }
  async history(q: PlatformQueryDto, jobId?: string) {
    const where = {
      ...(jobId ? { jobId } : {}),
      ...(q.organisationId ? { organisationId: q.organisationId } : {}),
      ...(q.search ? { jobId: { contains: q.search } } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.jobModeration.findMany({
        where,
        ...pagination(q),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.jobModeration.count({ where }),
    ]);
    return paged(rows, total, q);
  }
  async moderate(id: string, dto: ModerateJobDto, a: AuthenticatedUser) {
    requirePermission(
      a,
      dto.action === 'SUSPEND' ? 'platform.jobs.suspend' : 'platform.jobs.moderate',
    );
    const job = await this.jobs.job(a, id);
    return this.prisma.$transaction(async (tx) => {
      await this.jobs.moderate(tx, a, id, dto.action, dto.reason);
      const row = await tx.jobModeration.create({
        data: {
          jobId: id,
          organisationId: job.organisationId,
          actorId: a.userId,
          action: dto.action,
          reason: dto.reason,
        },
      });
      await this.audit.recordTx(tx, {
        actorId: a.userId,
        actorRole: a.role,
        action: `JOB_${dto.action}`,
        entityType: 'JOB',
        entityId: id,
        organisationId: job.organisationId,
        metadata: { reason: dto.reason, moderationId: row.id },
      });
      return row;
    });
  }
}
