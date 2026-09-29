import { OrganisationStatus } from '@prisma/client';
import { Injectable, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { PlatformOrganisationService } from '../organisations/platform-organisation.service';
import { PlatformUserService } from '../users/platform-user.service';
import { PlatformTokenService } from '../tokens/platform-token.service';
import { ModerationService } from '../moderation/moderation.service';
import { RecruitmentPort } from '../contracts/platform-domains';
import { AuditService } from '../../audit/audit.service';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { requirePermission } from '../../../common/platform-policy';
import { PlatformQueryDto } from '../../../common/dto/platform-query.dto';
export const csvCell = (value: unknown) => {
  let s = String(value ?? '');
  if (/^[\s]*[=+@-]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
};
@Injectable()
export class ReportService {
  constructor(
    private readonly organisations: PlatformOrganisationService,
    private readonly users: PlatformUserService,
    private readonly tokens: PlatformTokenService,
    private readonly moderation: ModerationService,
    private readonly recruitment: RecruitmentPort,
    private readonly audit: AuditService,
  ) {}
  async generate(kind: string, q: PlatformQueryDto, a: AuthenticatedUser): Promise<any> {
    requirePermission(a, 'platform.reports.generate');
    const permissions: Record<string, string> = {
      organisations: 'platform.organisations.read',
      users: 'platform.users.read',
      tokens: 'platform.tokens.read',
      moderation: 'platform.moderation.read',
      recruitment: 'platform.jobs.read',
    };
    if (!permissions[kind]) throw new BadRequestException('Unknown report type');
    requirePermission(a, permissions[kind]);
    switch (kind) {
      case 'organisations':
        if (q.status && !Object.values(OrganisationStatus).includes(q.status as OrganisationStatus))
          throw new BadRequestException('Invalid organization status');
        return this.organisations.findAll({ ...q, status: q.status as OrganisationStatus }, a);
      case 'users':
        return this.users.list(q);
      case 'tokens':
        return this.tokens.balances(q);
      case 'moderation':
        return this.moderation.history(q);
      case 'recruitment':
        return this.recruitment.report(a, q);
    }
  }
  async export(kind: string, q: PlatformQueryDto, a: AuthenticatedUser) {
    requirePermission(a, 'platform.reports.export');
    const result = await this.generate(kind, q, a);
    if (result.available === false) throw new ServiceUnavailableException(result.reason);
    const columns: Record<string, string[]> = {
      organisations: ['id', 'name', 'status', 'tier', 'createdAt'],
      users: ['id', 'email', 'firstName', 'lastName', 'role', 'isActive', 'organisationId'],
      tokens: ['organisationId', 'balance', 'allocatedTokens', 'consumedTokens', 'reservedTokens'],
      moderation: ['jobId', 'organisationId', 'actorId', 'action', 'reason', 'createdAt'],
      recruitment: ['organisationId', 'jobs', 'applications', 'interviews', 'offers'],
    };
    const keys = columns[kind];
    const csv =
      '\uFEFF' +
      [
        keys.map(csvCell).join(','),
        ...result.data.map((row: any) => keys.map((k) => csvCell(row[k])).join(',')),
      ].join('\r\n');
    await this.audit.record({
      actorId: a.userId,
      actorRole: a.role,
      action: 'REPORT_EXPORTED',
      entityType: 'REPORT',
      entityId: kind,
      metadata: { page: q.page, rows: result.data.length },
    });
    return { filename: `${kind}-page-${q.page || 1}.csv`, csv, meta: result.meta };
  }
}
