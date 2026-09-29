import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { can } from '../../../common/platform-policy';
import {
  RecruitmentPort,
  PaymentReportingPort,
  RecruitmentSummary,
} from '../contracts/platform-domains';
@Injectable()
export class PlatformDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recruitment: RecruitmentPort,
    private readonly payments: PaymentReportingPort,
  ) {}
  async getDashboardSummary(a: AuthenticatedUser) {
    const allowed = (p: string) => can(a, `platform.${p}`);
    const org = allowed('organisations.read'),
      users = allowed('users.read'),
      tokens = allowed('tokens.read');
    const [
      total,
      active,
      pending,
      suspended,
      userCount,
      candidates,
      recruiters,
      tokenMetrics,
      support,
      moderation,
      recentActivity,
      recruitment,
      sales,
    ] = await Promise.all([
      org ? this.prisma.organisation.count() : null,
      org ? this.prisma.organisation.count({ where: { status: 'ACTIVE' } }) : null,
      org
        ? this.prisma.organisation.count({
            where: { status: { in: ['PENDING_VERIFICATION', 'MORE_INFORMATION_REQUIRED'] } },
          })
        : null,
      org ? this.prisma.organisation.count({ where: { status: 'SUSPENDED' } }) : null,
      users ? this.prisma.user.count() : null,
      users ? this.prisma.user.count({ where: { role: 'CANDIDATE' } }) : null,
      users ? this.prisma.user.count({ where: { role: 'RECRUITER' } }) : null,
      tokens
        ? this.prisma.organisationTokenBalance.aggregate({
            _sum: { balance: true, allocatedTokens: true, consumedTokens: true },
          })
        : null,
      allowed('support.read')
        ? this.prisma.supportCase.count({
            where: { status: { in: ['OPEN', 'IN_PROGRESS', 'ESCALATED'] } },
          })
        : null,
      allowed('moderation.read') ? this.prisma.jobModeration.count() : null,
      allowed('audit.read')
        ? this.prisma.auditLog.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              action: true,
              entityType: true,
              entityId: true,
              createdAt: true,
              actorRole: true,
            },
          })
        : [],
      allowed('jobs.read')
        ? this.recruitment.summary(a)
        : ({ available: false, reason: 'Recruitment permission required' } as RecruitmentSummary),
      allowed('tokens.sales.read')
        ? this.payments.sales(a)
        : { available: false, reason: 'Token sales permission required' },
    ]);
    return {
      metrics: {
        totalOrganisations: total,
        activeOrganisations: active,
        pendingOrganisations: pending,
        suspendedOrganisations: suspended,
        totalPlatformUsers: userCount,
        candidates,
        recruiters,
        jobs: recruitment.available ? recruitment.jobs : null,
        applications: recruitment.available ? recruitment.applications : null,
        interviews: recruitment.available ? recruitment.interviews : null,
        offers: recruitment.available ? recruitment.offers : null,
        moderationQueue:
          allowed('moderation.read') && recruitment.available ? recruitment.moderationQueue : null,
        supportQueue: support,
        moderationActions: moderation,
        tokenUsage: tokenMetrics ? tokenMetrics._sum.consumedTokens || 0 : null,
        tokenBalance: tokenMetrics ? tokenMetrics._sum.balance || 0 : null,
      },
      recruitment,
      tokenSales: sales,
      recentActivity,
    };
  }
}
