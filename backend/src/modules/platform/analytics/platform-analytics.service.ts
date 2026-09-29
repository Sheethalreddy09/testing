// ============================================================
// PLATFORM SUPER ADMIN
// Service: Platform Analytics & Intelligence Aggregation
// ============================================================

import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { can } from '../../../common/platform-policy';
import { PlatformDashboardService } from '../dashboard/platform-dashboard.service';
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { GeminiAiService } from '../../../integrations/ai/gemini.service';

@Injectable()
export class PlatformAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiAiService,
    private readonly dashboard: PlatformDashboardService,
  ) {}

  async getPlatformAnalytics(timeframe = '30d', actor: AuthenticatedUser) {
    if (!['7d', '30d', '90d'].includes(timeframe))
      throw new BadRequestException('Unsupported timeframe');
    const since = new Date(Date.now() - parseInt(timeframe, 10) * 86400000);
    // 1. Organisation status breakdown
    const statusGroups = await this.prisma.organisation.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    // 2. Organisation tier breakdown
    const tierGroups = await this.prisma.organisation.groupBy({
      by: ['tier'],
      _count: { id: true },
    });

    // 3. Token transaction volume by type
    const txTypeGroups = await this.prisma.tokenTransaction.groupBy({
      by: ['type'],
      where: { createdAt: { gte: since } },
      _count: { id: true },
      _sum: { amount: true },
    });

    // 4. Monthly organisation growth (last 6 months)
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const orgs = await this.prisma.organisation.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true },
    });

    const monthMap: Record<string, number> = {};
    for (let i = 0; i < 6; i++) {
      const d = new Date(sixMonthsAgo);
      d.setMonth(d.getMonth() + i);
      const key = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      monthMap[key] = 0;
    }

    for (const org of orgs) {
      const key = org.createdAt.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      if (monthMap[key] !== undefined) {
        monthMap[key]++;
      }
    }

    const growthTrend = Object.entries(monthMap).map(([month, count]) => ({
      month,
      newOrganisations: count,
    }));

    // 5. Generate AI Platform Executive Summary

    return {
      timeframe,
      statusDistribution: !can(actor, 'platform.organisations.read')
        ? []
        : statusGroups.map((g) => ({ status: g.status, count: g._count.id })),
      tierDistribution: !can(actor, 'platform.organisations.read')
        ? []
        : tierGroups.map((g) => ({ tier: g.tier, count: g._count.id })),
      transactionVolumeByType: !can(actor, 'platform.tokens.read')
        ? []
        : txTypeGroups.map((g) => ({
            type: g.type,
            count: g._count.id,
            totalTokens: g._sum.amount || 0,
          })),
      organisationGrowthTrend: can(actor, 'platform.organisations.read') ? growthTrend : [],
      operations: await this.dashboard.getDashboardSummary(actor),
      aiExecutiveSummary: 'AI summaries are not connected. Charts reflect stored platform data.',
    };
  }
}
