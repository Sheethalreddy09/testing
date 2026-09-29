import 'reflect-metadata';
import {
  ForbiddenException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { PlatformOrganisationService } from './organisations/platform-organisation.service';
import { PlatformUserService } from './users/platform-user.service';
import { PlatformTokenService } from './tokens/platform-token.service';
import { PlatformDashboardService } from './dashboard/platform-dashboard.service';
import { SupportService } from '../support/support.service';
import { NotificationService } from '../notifications/notification.service';
import { ModerationService } from './moderation/moderation.service';
import { ReportService, csvCell } from './reports/report.service';
import { UnconnectedRecruitment, UnconnectedPayments } from './contracts/platform-domains';
import { PlatformQueryDto } from '../../common/dto/platform-query.dto';
import { VerifyOrganisationDto } from './organisations/dto/operations.dto';
import { PlatformOperationsController } from './operations.controller';
import { PlatformAuditController } from './audit/platform-audit.controller';
import { PlatformAdminController } from './admins/platform-admin.controller';
import { PERMISSIONS_KEY } from '../../common/decorators/permissions.decorator';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
const actor = (permissions: string[] = [], role: any = 'PLATFORM_ADMIN'): any => ({
  userId: 'admin',
  role,
  permissions,
  email: 'a@test.invalid',
});
const mock = () => {
  const p: any = {
    organisation: { findUnique: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    organisationVerification: { create: jest.fn().mockResolvedValue({ id: 'verification' }) },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    platformSession: { updateMany: jest.fn() },
    supportCase: { findUnique: jest.fn(), update: jest.fn() },
    jobModeration: { create: jest.fn().mockResolvedValue({ id: 'm' }) },
    notification: {
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    tokenTransaction: { create: jest.fn().mockResolvedValue({ id: 'ledger' }) },
    organisationTokenBalance: { update: jest.fn().mockResolvedValue({}) },
  };
  p.$transaction = jest.fn((f: any) => f(p));
  return p;
};
const audit = () => ({ record: jest.fn(), recordTx: jest.fn(), findAuditLogs: jest.fn() });
describe('Platform Admin workflows and security', () => {
  let p: any, a: any;
  beforeEach(() => {
    p = mock();
    a = audit();
  });
  it('rejects unauthorized verification before database access', async () => {
    const s = new PlatformOrganisationService(p, a, new UnconnectedRecruitment());
    await expect(
      s.verification('o', { decision: 'APPROVE', reason: 'Documents checked' }, actor()),
    ).rejects.toThrow(ForbiddenException);
    expect(p.$transaction).not.toHaveBeenCalled();
  });
  it.each(['APPROVE', 'REJECT', 'REQUEST_INFORMATION'])(
    'audits verification decision %s transactionally',
    async (decision: any) => {
      p.organisation.findUnique.mockResolvedValue({ id: 'o', status: 'PENDING_VERIFICATION' });
      const s = new PlatformOrganisationService(p, a, new UnconnectedRecruitment());
      await s.verification(
        'o',
        { decision, reason: 'Document review' },
        actor(['platform.organisations.verify', 'platform.organisations.reject']),
      );
      expect(p.organisationVerification.create).toHaveBeenCalled();
      expect(a.recordTx).toHaveBeenCalledWith(
        p,
        expect.objectContaining({ action: `ORGANISATION_VERIFICATION_${decision}` }),
      );
    },
  );
  it('cannot use activation to bypass verification', async () => {
    p.organisation.findUnique.mockResolvedValue({ status: 'PENDING_VERIFICATION' });
    const s = new PlatformOrganisationService(p, a, new UnconnectedRecruitment());
    await expect(s.activate('o', actor([], 'PLATFORM_SUPER_ADMIN'))).rejects.toThrow(
      BadRequestException,
    );
  });
  it('blocks Super Admin account changes through user administration', async () => {
    p.user.findUnique.mockResolvedValue({ role: 'PLATFORM_SUPER_ADMIN' });
    const s = new PlatformUserService(p, a);
    await expect(
      s.status('root', false, 'Account check', actor(['platform.users.suspend'])),
    ).rejects.toThrow(ForbiddenException);
    expect(p.user.updateMany).not.toHaveBeenCalled();
  });
  it('checks suspension permission on the backend', async () => {
    await expect(
      new PlatformUserService(p, a).status('u', false, 'Reason', actor()),
    ).rejects.toThrow(ForbiddenException);
  });
  it.each([false, true])('audits permitted account active=%s', async (active) => {
    p.user.findUnique.mockResolvedValue({ role: 'CANDIDATE', id: 'u', organisationId: null });
    await new PlatformUserService(p, a).status(
      'u',
      active,
      'Reviewed account',
      actor([`platform.users.${active ? 'reactivate' : 'suspend'}`]),
    );
    expect(a.recordTx).toHaveBeenCalled();
    if (!active) expect(p.platformSession.updateMany).toHaveBeenCalled();
  });
  it('supports paginated user search and filters without password disclosure', async () => {
    await new PlatformUserService(p, a).list({
      page: 2,
      limit: 5,
      search: 'name',
      role: 'CANDIDATE',
    });
    expect(p.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 5,
        take: 5,
        select: expect.not.objectContaining({ passwordHash: true }),
        where: expect.objectContaining({ role: 'CANDIDATE' }),
      }),
    );
  });
  it('rejects privileged user roles in user listing', async () => {
    await expect(
      new PlatformUserService(p, a).list({ page: 1, limit: 20, role: 'PLATFORM_SUPER_ADMIN' }),
    ).rejects.toThrow(BadRequestException);
  });
  it('escalates support with an audit event', async () => {
    p.supportCase.findUnique.mockResolvedValue({ id: 's', status: 'OPEN' });
    p.supportCase.update.mockResolvedValue({ status: 'ESCALATED' });
    await new SupportService(p, a).update(
      's',
      { status: 'ESCALATED', message: 'Critical incident' },
      actor(['platform.support.escalate']),
    );
    expect(a.recordTx).toHaveBeenCalledWith(
      p,
      expect.objectContaining({ action: 'SUPPORT_ESCALATED' }),
    );
  });
  it('rejects unauthorized escalation', async () => {
    await expect(
      new SupportService(p, a).update(
        's',
        { status: 'ESCALATED', message: 'Critical incident' },
        actor(['platform.support.manage']),
      ),
    ).rejects.toThrow(ForbiddenException);
  });
  it('rejects invalid support transitions', async () => {
    p.supportCase.findUnique.mockResolvedValue({ status: 'CLOSED' });
    await expect(
      new SupportService(p, a).update(
        's',
        { status: 'RESOLVED', message: 'review' },
        actor(['platform.support.manage']),
      ),
    ).rejects.toThrow(BadRequestException);
  });
  it('does not pretend an unconnected job was moderated', async () => {
    await expect(
      new ModerationService(p, a, new UnconnectedRecruitment()).moderate(
        'j',
        { action: 'SUSPEND', reason: 'Policy violation' },
        actor(['platform.jobs.suspend']),
      ),
    ).rejects.toThrow(ServiceUnavailableException);
    expect(p.jobModeration.create).not.toHaveBeenCalled();
  });
  it('writes job action and audit in the shared domain transaction', async () => {
    const port: any = {
      job: jest.fn().mockResolvedValue({ id: 'j', organisationId: 'o' }),
      moderate: jest.fn(),
    };
    await new ModerationService(p, a, port).moderate(
      'j',
      { action: 'RESTRICT', reason: 'Policy violation' },
      actor(['platform.jobs.moderate']),
    );
    expect(port.moderate).toHaveBeenCalledWith(
      p,
      expect.anything(),
      'j',
      'RESTRICT',
      'Policy violation',
    );
    expect(a.recordTx).toHaveBeenCalledWith(p, expect.objectContaining({ action: 'JOB_RESTRICT' }));
  });
  it('scopes notification writes to recipient and current permissions', async () => {
    await expect(
      new NotificationService(p).read(actor(['platform.notifications.read']), 'other-notification'),
    ).rejects.toThrow();
    expect(p.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ recipientId: 'admin' }) }),
    );
  });
  it('report permission alone cannot access a protected dataset', async () => {
    const s = new ReportService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      new UnconnectedRecruitment(),
      a,
    );
    await expect(
      s.generate('users', { page: 1, limit: 20 }, actor(['platform.reports.generate'])),
    ).rejects.toThrow(ForbiddenException);
  });
  it('export permission alone cannot bypass generate permission', async () => {
    const s = new ReportService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      new UnconnectedRecruitment(),
      a,
    );
    await expect(
      s.export(
        'users',
        { page: 1, limit: 20 },
        actor(['platform.reports.export', 'platform.users.read']),
      ),
    ).rejects.toThrow(ForbiddenException);
  });
  it('quotes CSV cells and neutralizes formulas', () => {
    expect(csvCell('=SUM(A1)')).toBe(`"'=SUM(A1)"`);
    expect(csvCell('a"b')).toBe(`"a""b"`);
    expect(csvCell(' @cmd')).toBe(`"' @cmd"`);
  });
  it('no-permission dashboard returns no restricted database rows', async () => {
    const s = new PlatformDashboardService(
      p,
      new UnconnectedRecruitment(),
      new UnconnectedPayments(),
    );
    const result = await s.getDashboardSummary(actor());
    expect(result.metrics.totalPlatformUsers).toBeNull();
    expect(result.recentActivity).toEqual([]);
    expect(p.user.count).not.toHaveBeenCalled();
  });
  it.each(['PURCHASE', 'REFUND', 'REVERSAL'])(
    'prevents manual payment bypass through %s',
    async (type: any) => {
      const s = new PlatformTokenService(p, a, new UnconnectedPayments());
      await expect(
        s.adjustTokens(
          { organisationId: 'o', type, amount: 100, reason: 'Manual credit' },
          actor(),
        ),
      ).rejects.toThrow(BadRequestException);
      expect(p.$transaction).not.toHaveBeenCalled();
    },
  );
  it('rejects spending tokens reserved by other workflows', async () => {
    p.organisation.findUnique.mockResolvedValue({
      id: 'o',
      tokenBalance: { balance: 100, reservedTokens: 80 },
    });
    await expect(
      new PlatformTokenService(p, a, new UnconnectedPayments()).adjustTokens(
        { organisationId: 'o', type: 'ADJUSTMENT', amount: -30, reason: 'Debit request' },
        actor(),
      ),
    ).rejects.toThrow(BadRequestException);
  });
  it('retries serialization conflicts and commits ledger plus audit together', async () => {
    p.organisation.findUnique.mockResolvedValue({
      id: 'o',
      tokenBalance: { balance: 100, reservedTokens: 0 },
    });
    p.$transaction.mockRejectedValueOnce({ code: 'P2034' });
    await new PlatformTokenService(p, a, new UnconnectedPayments()).adjustTokens(
      { organisationId: 'o', type: 'ADJUSTMENT', amount: 20, reason: 'Approved grant' },
      actor(),
    );
    expect(p.$transaction).toHaveBeenCalledTimes(2);
    expect(p.$transaction).toHaveBeenLastCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    });
    expect(p.tokenTransaction.create).toHaveBeenCalled();
    expect(a.recordTx).toHaveBeenCalled();
  });
  it('requires explicit report export guards', () => {
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, PlatformOperationsController.prototype.export),
    ).toEqual(['platform.reports.generate', 'platform.reports.export']);
  });
  it('platform admin creation remains Super Admin only', () => {
    expect(Reflect.getMetadata(ROLES_KEY, PlatformAdminController.prototype.create)).toEqual([
      'PLATFORM_SUPER_ADMIN',
    ]);
  });
  it('audit controller has no edit/delete workflow', () => {
    expect(Object.getOwnPropertyNames(PlatformAuditController.prototype)).toEqual([
      'constructor',
      'getAuditLogs',
    ]);
  });
  it('rejects invalid query pagination and verification input', async () => {
    const q = Object.assign(new PlatformQueryDto(), { page: -1, limit: 1001 });
    expect((await validate(q)).length).toBe(2);
    expect(
      (
        await validate(
          Object.assign(new VerifyOrganisationDto(), { decision: 'UNKNOWN', reason: 'x' }),
        )
      ).length,
    ).toBeGreaterThan(0);
  });
});
