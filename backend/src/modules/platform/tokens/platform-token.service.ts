// ============================================================
// PLATFORM SUPER ADMIN
// Purpose:
// Oversees platform token economy, token plans, allocation limits,
// and enforces immutable transaction ledger entries.
//
// Security:
// Only platform administrators with token management permissions
// can create/alter plans or adjust organisation balances.
//
// Business Rules:
// 1. Balances must NEVER be modified directly without a ledger record.
// 2. Adjustments are atomic inside a database transaction.
// 3. Negative balances are prevented during debits.
// ============================================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CreateTokenPlanDto } from './dto/create-token-plan.dto';
import { UpdateTokenPlanDto } from './dto/update-token-plan.dto';
import { AdjustTokensDto } from './dto/adjust-tokens.dto';
import { UpdateAllocationLimitDto } from './dto/update-allocation-limit.dto';
import { QueryTokenTransactionsDto } from './dto/query-token-transactions.dto';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { PlatformQueryDto, pagination, paged } from '../../../common/dto/platform-query.dto';
import { AuthenticatedUser as Actor } from '../../../common/interfaces/authenticated-user.interface';
import { PaymentReportingPort } from '../contracts/platform-domains';
import { Prisma, TokenTransactionType } from '@prisma/client';

@Injectable()
export class PlatformTokenService {
  private readonly logger = new Logger(PlatformTokenService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly payments: PaymentReportingPort,
  ) {}

  // ------------------------------------------------------------
  // TOKEN PLANS
  // ------------------------------------------------------------

  async findAllPlans(includeInactive = true) {
    const where = includeInactive ? {} : { isActive: true };
    return this.prisma.tokenPlan.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOnePlan(id: string) {
    const plan = await this.prisma.tokenPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException(`Token plan ${id} not found`);
    return plan;
  }

  async createPlan(dto: CreateTokenPlanDto, actor: AuthenticatedUser, ip?: string, ua?: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.tokenPlan.findUnique({
        where: { code: dto.code },
      });
      if (existing) {
        throw new ConflictException(`Token plan with code '${dto.code}' already exists`);
      }

      const plan = await tx.tokenPlan.create({
        data: {
          name: dto.name,
          code: dto.code,
          description: dto.description,
          tokenAmount: dto.tokenAmount,
          priceCents: dto.priceCents,
          currency: dto.currency || 'USD',
          billingCycle: dto.billingCycle,
          features: dto.features || [],
          sortOrder: dto.sortOrder || 0,
          isActive: true,
        },
      });

      await this.auditService.recordTx(tx, {
        actorId: actor.userId,
        actorRole: actor.role,
        action: 'TOKEN_PLAN_CREATED',
        entityType: 'TOKEN_PLAN',
        entityId: plan.id,
        metadata: { code: plan.code, amount: plan.tokenAmount, price: plan.priceCents },
        ipAddress: ip,
        userAgent: ua,
      });

      return plan;
    });
  }

  async updatePlan(
    id: string,
    dto: UpdateTokenPlanDto,
    actor: AuthenticatedUser,
    ip?: string,
    ua?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.tokenPlan.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException(`Token plan ${id} not found`);

      const updated = await tx.tokenPlan.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          tokenAmount: dto.tokenAmount,
          priceCents: dto.priceCents,
          currency: dto.currency,
          billingCycle: dto.billingCycle,
          features: dto.features,
          isActive: dto.isActive,
          sortOrder: dto.sortOrder,
        },
      });

      await this.auditService.recordTx(tx, {
        actorId: actor.userId,
        actorRole: actor.role,
        action: 'TOKEN_PLAN_UPDATED',
        entityType: 'TOKEN_PLAN',
        entityId: id,
        metadata: { updatedFields: Object.keys(dto) },
        ipAddress: ip,
        userAgent: ua,
      });

      return updated;
    });
  }

  // ------------------------------------------------------------
  // ATOMIC LEDGER ADJUSTMENTS
  // ------------------------------------------------------------

  async adjustTokens(dto: AdjustTokensDto, actor: AuthenticatedUser, ip?: string, ua?: string) {
    if (!['ALLOCATION', 'ADJUSTMENT', 'CONSUMPTION', 'EXPIRATION'].includes(dto.type))
      throw new BadRequestException(
        'Purchases, refunds and reversals must use verified payment workflows',
      );
    if (!Number.isSafeInteger(dto.amount) || dto.amount === 0 || Math.abs(dto.amount) > 2147483647)
      throw new BadRequestException('Invalid token amount');
    if (
      (dto.type === 'ALLOCATION' && dto.amount < 0) ||
      (['CONSUMPTION', 'EXPIRATION'].includes(dto.type) && dto.amount > 0)
    )
      throw new BadRequestException('Amount sign does not match transaction type');
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const org = await tx.organisation.findUnique({
              where: { id: dto.organisationId },
              include: { tokenBalance: true, allocationLimit: true },
            });
            if (!org) throw new NotFoundException('Organisation not found');
            const limits = org.allocationLimit;
            if (limits && Math.abs(dto.amount) > limits.singleTxLimit)
              throw new BadRequestException('Single transaction allocation limit exceeded');
            if (dto.amount > 0 && limits) {
              const month = new Date();
              month.setUTCDate(1);
              month.setUTCHours(0, 0, 0, 0);
              const credits = await tx.tokenTransaction.aggregate({
                where: { organisationId: org.id, createdAt: { gte: month }, amount: { gt: 0 } },
                _sum: { amount: true },
              });
              if ((credits._sum.amount || 0) + dto.amount > limits.monthlyMaxAllocation)
                throw new BadRequestException('Monthly allocation limit exceeded');
            }
            const balance =
              org.tokenBalance ||
              (await tx.organisationTokenBalance.create({ data: { organisationId: org.id } }));
            const balanceAfter = balance.balance + dto.amount;
            if (balanceAfter < (balance.reservedTokens || 0) || balanceAfter > 2147483647)
              throw new BadRequestException(
                'Insufficient available balance or amount exceeds supported range',
              );
            const updatedBalance = await tx.organisationTokenBalance.update({
              where: { organisationId: org.id },
              data: {
                balance: balanceAfter,
                ...(dto.amount > 0 ? { allocatedTokens: { increment: dto.amount } } : {}),
                ...(dto.type === 'CONSUMPTION'
                  ? { consumedTokens: { increment: -dto.amount } }
                  : {}),
              },
            });
            const ledgerEntry = await tx.tokenTransaction.create({
              data: {
                organisationId: org.id,
                actorId: actor.userId,
                type: dto.type,
                amount: dto.amount,
                balanceBefore: balance.balance,
                balanceAfter,
                referenceId: dto.referenceId,
                reason: dto.reason,
              },
            });
            await this.auditService.recordTx(tx, {
              actorId: actor.userId,
              actorRole: actor.role,
              action: 'TOKEN_ADJUSTMENT_EXECUTED',
              entityType: 'TOKEN_LEDGER',
              entityId: ledgerEntry.id,
              organisationId: org.id,
              metadata: {
                type: dto.type,
                amount: dto.amount,
                balanceBefore: balance.balance,
                balanceAfter,
                reason: dto.reason,
              },
              ipAddress: ip,
              userAgent: ua,
            });
            return { updatedBalance, ledgerEntry };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if ((error as { code?: string }).code === 'P2034' && attempt < 2) continue;
        if ((error as { code?: string }).code === 'P2034')
          throw new ConflictException('Balance changed concurrently; please retry');
        throw error;
      }
    }
  }

  // ------------------------------------------------------------
  // ALLOCATION LIMITS
  // ------------------------------------------------------------

  async updateAllocationLimit(
    organisationId: string,
    dto: UpdateAllocationLimitDto,
    actor: AuthenticatedUser,
    ip?: string,
    ua?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organisation.findUnique({ where: { id: organisationId } });
      if (!org) throw new NotFoundException(`Organisation ${organisationId} not found`);

      const limit = await tx.tokenAllocationLimit.upsert({
        where: { organisationId },
        create: {
          organisationId,
          monthlyMaxAllocation: dto.monthlyMaxAllocation || 25000,
          singleTxLimit: dto.singleTxLimit || 10000,
          autoRechargeEnabled: dto.autoRechargeEnabled || false,
          autoRechargeThreshold: dto.autoRechargeThreshold || 500,
          autoRechargeAmount: dto.autoRechargeAmount || 2000,
        },
        update: {
          monthlyMaxAllocation: dto.monthlyMaxAllocation,
          singleTxLimit: dto.singleTxLimit,
          autoRechargeEnabled: dto.autoRechargeEnabled,
          autoRechargeThreshold: dto.autoRechargeThreshold,
          autoRechargeAmount: dto.autoRechargeAmount,
        },
      });

      await this.auditService.recordTx(tx, {
        actorId: actor.userId,
        actorRole: actor.role,
        action: 'ALLOCATION_LIMIT_UPDATED',
        entityType: 'TOKEN_ALLOCATION_LIMIT',
        entityId: limit.id,
        organisationId,
        metadata: dto as Record<string, any>,
        ipAddress: ip,
        userAgent: ua,
      });

      return limit;
    });
  }

  // ------------------------------------------------------------
  // TRANSACTIONS & USAGE OVERVIEW
  // ------------------------------------------------------------

  async findTransactions(query: QueryTokenTransactionsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.search)
      where.OR = [
        { reason: { contains: query.search, mode: 'insensitive' } },
        { referenceId: { contains: query.search, mode: 'insensitive' } },
        { organisation: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    if (query.organisationId) where.organisationId = query.organisationId;
    if (query.type) where.type = query.type;
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const [total, items] = await Promise.all([
      this.prisma.tokenTransaction.count({ where }),
      this.prisma.tokenTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          organisation: {
            select: { id: true, name: true, slug: true },
          },
          actor: {
            select: { id: true, email: true, firstName: true, lastName: true, role: true },
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

  async getPlatformTokenOverview() {
    const balances = await this.prisma.organisationTokenBalance.aggregate({
      _sum: {
        balance: true,
        allocatedTokens: true,
        consumedTokens: true,
        reservedTokens: true,
      },
    });

    const totalTransactions = await this.prisma.tokenTransaction.count();

    const topConsumingOrgs = await this.prisma.organisationTokenBalance.findMany({
      take: 5,
      orderBy: { consumedTokens: 'desc' },
      include: {
        organisation: {
          select: { id: true, name: true, slug: true, status: true },
        },
      },
    });

    return {
      totalActiveTokens: balances._sum.balance || 0,
      totalTokensAllocated: balances._sum.allocatedTokens || 0,
      totalTokensConsumed: balances._sum.consumedTokens || 0,
      totalTokensReserved: balances._sum.reservedTokens || 0,
      totalLedgerTransactions: totalTransactions,
      topConsumingOrganisations: topConsumingOrgs.map((b) => ({
        organisationId: b.organisationId,
        organisationName: b.organisation.name,
        organisationSlug: b.organisation.slug,
        status: b.organisation.status,
        balance: b.balance,
        consumedTokens: b.consumedTokens,
        allocatedTokens: b.allocatedTokens,
      })),
    };
  }

  sales(actor: Actor, q: PlatformQueryDto) {
    return this.payments.sales(actor, q);
  }
  async balances(q: PlatformQueryDto) {
    const where = {
      ...(q.organisationId ? { organisationId: q.organisationId } : {}),
      ...(q.search
        ? { organisation: { name: { contains: q.search, mode: 'insensitive' as const } } }
        : {}),
    };
    const [rows, total, summary] = await Promise.all([
      this.prisma.organisationTokenBalance.findMany({
        where,
        include: { organisation: { select: { id: true, name: true, slug: true } } },
        ...pagination(q),
        orderBy: { organisationId: 'asc' },
      }),
      this.prisma.organisationTokenBalance.count({ where }),
      this.prisma.organisationTokenBalance.aggregate({
        where,
        _sum: { balance: true, allocatedTokens: true, consumedTokens: true, reservedTokens: true },
      }),
    ]);
    return { ...paged(rows, total, q), summary: summary._sum };
  }
  async features(q: PlatformQueryDto) {
    const rows = await this.prisma.$queryRaw<
      Array<{ feature: string; consumed: bigint; transactions: bigint }>
    >`
      SELECT COALESCE(metadata->>'feature','UNSPECIFIED') AS feature, SUM(-amount)::bigint AS consumed, COUNT(*)::bigint AS transactions
      FROM token_transactions WHERE type='CONSUMPTION' AND (${q.organisationId || null}::text IS NULL OR "organisationId"=${q.organisationId || null})
      GROUP BY COALESCE(metadata->>'feature','UNSPECIFIED') ORDER BY consumed DESC`;
    return rows.map((r) => ({
      ...r,
      consumed: Number(r.consumed),
      transactions: Number(r.transactions),
    }));
  }
  async discrepancies(q: PlatformQueryDto) {
    const balances: any = await this.balances(q);
    const rows = await Promise.all(
      balances.data.map(async (b: any) => {
        const sum = await this.prisma.tokenTransaction.aggregate({
          where: { organisationId: b.organisationId },
          _sum: { amount: true },
        });
        const ledgerBalance = sum._sum.amount || 0;
        return {
          organisationId: b.organisationId,
          organisation: b.organisation.name,
          balance: b.balance,
          ledgerBalance,
          difference: b.balance - ledgerBalance,
        };
      }),
    );
    return { ...balances, data: rows };
  }
}
