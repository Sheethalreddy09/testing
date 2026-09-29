// ============================================================
// PLATFORM SUPER ADMIN
// Purpose:
// Handles platform-level organisation management (creation, oversight,
// activation, suspension, and metadata updates).
//
// Security:
// Only authenticated platform administrators with appropriate permissions
// can execute these operations. Never trust client-provided actor identity.
//
// Integration:
// Organisation module will consume organisation status changes generated here.
// ============================================================

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CreateOrganisationDto } from './dto/create-organisation.dto';
import { UpdateOrganisationDto } from './dto/update-organisation.dto';
import { SuspendOrganisationDto } from './dto/suspend-organisation.dto';
import { QueryOrganisationDto } from './dto/query-organisation.dto';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { randomBytes, createHash } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { requirePermission, publicUser, can } from '../../../common/platform-policy';
import { PlatformQueryDto, pagination, paged } from '../../../common/dto/platform-query.dto';
import { VerifyOrganisationDto, AcceptInvitationDto } from './dto/operations.dto';
import { RecruitmentPort } from '../contracts/platform-domains';
import { OrganisationStatus, TokenTransactionType } from '@prisma/client';

@Injectable()
export class PlatformOrganisationService {
  private readonly logger = new Logger(PlatformOrganisationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly recruitment: RecruitmentPort,
  ) {}

  /**
   * Retrieves a paginated, filterable list of all platform organisations.
   */
  async findAll(query: QueryOrganisationDto, actor?: AuthenticatedUser) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.tier) {
      where.tier = query.tier;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
        { domain: { contains: query.search, mode: 'insensitive' } },
        { contactEmail: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    const sortField = query.sortBy || 'createdAt';
    if (!['name', 'createdAt', 'updatedAt', 'status', 'tier'].includes(sortField))
      throw new BadRequestException('Unsupported sort field');
    orderBy[sortField] = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const [total, items] = await Promise.all([
      this.prisma.organisation.count({ where }),
      this.prisma.organisation.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          metadata: true,
          tokenBalance: true,
          _count: {
            select: { users: true },
          },
        },
      }),
    ]);

    const transformedItems = items.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      domain: org.domain,
      contactEmail: org.contactEmail,
      contactPhone: org.contactPhone,
      status: org.status,
      suspensionReason: org.suspensionReason,
      suspendedAt: org.suspendedAt,
      tier: org.tier,
      maxRecruiters: org.maxRecruiters,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
      membersCount: org._count.users,
      tokenBalance:
        actor && !can(actor, 'platform.tokens.read') ? null : org.tokenBalance?.balance || 0,
      allocatedTokens:
        actor && !can(actor, 'platform.tokens.read')
          ? null
          : org.tokenBalance?.allocatedTokens || 0,
      consumedTokens:
        actor && !can(actor, 'platform.tokens.read') ? null : org.tokenBalance?.consumedTokens || 0,
      industry: org.metadata?.industry || null,
      companySize: org.metadata?.companySize || null,
      website: org.metadata?.website || null,
    }));

    return {
      data: transformedItems,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves single organisation details including balance, metadata, and activity.
   */
  async findOne(id: string, actor?: AuthenticatedUser) {
    const org = await this.prisma.organisation.findUnique({
      where: { id },
      include: {
        metadata: true,
        tokenBalance: true,
        allocationLimit: true,
        _count: {
          select: { users: true, tokenTransactions: true },
        },
      },
    });

    if (!org) {
      throw new NotFoundException(`Organisation with ID ${id} not found`);
    }

    // Fetch recent activity audit logs
    const recentActivity = await this.prisma.auditLog.findMany({
      where: { organisationId: id },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        entityType: true,
        actorRole: true,
        createdAt: true,
      },
    });

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      domain: org.domain,
      contactEmail: org.contactEmail,
      contactPhone: org.contactPhone,
      status: org.status,
      suspensionReason: org.suspensionReason,
      suspendedAt: org.suspendedAt,
      tier: org.tier,
      maxRecruiters: org.maxRecruiters,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
      membersCount: org._count.users,
      totalTransactions: org._count.tokenTransactions,
      metadata: org.metadata
        ? {
            industry: org.metadata.industry,
            companySize: org.metadata.companySize,
            website: org.metadata.website,
          }
        : null,
      tokenBalance: actor && !can(actor, 'platform.tokens.read') ? null : org.tokenBalance,
      allocationLimit: actor && !can(actor, 'platform.tokens.read') ? null : org.allocationLimit,
      recentActivity:
        actor &&
        (actor.role === 'PLATFORM_SUPER_ADMIN' ||
          actor.permissions.includes('platform.organisations.activity.read'))
          ? recentActivity
          : [],
    };
  }

  /**
   * Creates a new organisation at platform level with initial ledger balances.
   */
  async create(
    dto: CreateOrganisationDto,
    actor: AuthenticatedUser,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Check slug and domain uniqueness
    const existingSlug = await this.prisma.organisation.findUnique({
      where: { slug: dto.slug },
    });
    if (existingSlug) {
      throw new ConflictException(`Organisation with slug '${dto.slug}' already exists`);
    }

    if (dto.domain) {
      const existingDomain = await this.prisma.organisation.findUnique({
        where: { domain: dto.domain },
      });
      if (existingDomain) {
        throw new ConflictException(`Organisation with domain '${dto.domain}' already exists`);
      }
    }

    const initialTokens = dto.initialTokenAllocation || 0;
    if (initialTokens) requirePermission(actor, 'platform.tokens.allocate');
    if (initialTokens > 10000)
      throw new BadRequestException(
        'Initial allocation exceeds the default single transaction limit',
      );

    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organisation.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          domain: dto.domain || null,
          contactEmail: dto.contactEmail,
          contactPhone: dto.contactPhone || null,
          status:
            actor.role === 'PLATFORM_SUPER_ADMIN'
              ? OrganisationStatus.ACTIVE
              : OrganisationStatus.PENDING_VERIFICATION,
          tier: dto.tier || 'STANDARD',
          maxRecruiters: dto.maxRecruiters || 5,
          metadata: {
            create: {
              industry: dto.industry || null,
              companySize: dto.companySize || null,
              website: dto.website || null,
            },
          },
          tokenBalance: {
            create: {
              balance: initialTokens,
              allocatedTokens: initialTokens,
              consumedTokens: 0,
              reservedTokens: 0,
            },
          },
          allocationLimit: {
            create: {
              monthlyMaxAllocation: 25000,
              singleTxLimit: 10000,
            },
          },
        },
        include: {
          metadata: true,
          tokenBalance: true,
        },
      });

      // Record initial allocation ledger entry if tokens provided
      if (initialTokens > 0) {
        await tx.tokenTransaction.create({
          data: {
            organisationId: org.id,
            actorId: actor.userId,
            type: TokenTransactionType.ALLOCATION,
            amount: initialTokens,
            balanceBefore: 0,
            balanceAfter: initialTokens,
            reason: 'Initial platform allocation upon organisation creation',
            metadata: { createdByPlatformSuperAdmin: true },
          },
        });
      }

      await this.auditService.recordTx(tx, {
        actorId: actor.userId,
        actorRole: actor.role,
        action: 'ORGANISATION_CREATED',
        entityType: 'ORGANISATION',
        entityId: org.id,
        organisationId: org.id,
        metadata: { name: org.name, slug: org.slug, initialTokens },
        ipAddress,
        userAgent,
      });
      return org;
    });
  }

  /**
   * Updates organisation details and metadata.
   */
  async update(
    id: string,
    dto: UpdateOrganisationDto,
    actor: AuthenticatedUser,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.organisation.findUnique({
        where: { id },
        include: { metadata: true },
      });
      if (!existing) {
        throw new NotFoundException(`Organisation with ID ${id} not found`);
      }

      const updated = await tx.organisation.update({
        where: { id },
        data: {
          name: dto.name,
          domain: dto.domain,
          contactEmail: dto.contactEmail,
          contactPhone: dto.contactPhone,
          tier: dto.tier,
          maxRecruiters: dto.maxRecruiters,
          metadata: {
            upsert: {
              create: {
                industry: dto.industry,
                companySize: dto.companySize,
                website: dto.website,
              },
              update: {
                industry: dto.industry,
                companySize: dto.companySize,
                website: dto.website,
              },
            },
          },
        },
        include: { metadata: true },
      });

      await this.auditService.recordTx(tx, {
        actorId: actor.userId,
        actorRole: actor.role,
        action: 'ORGANISATION_UPDATED',
        entityType: 'ORGANISATION',
        entityId: id,
        organisationId: id,
        metadata: { updatedFields: Object.keys(dto) },
        ipAddress,
        userAgent,
      });

      return updated;
    });
  }

  /**
   * Suspends an organisation.
   * Destructive operation: enforces mandatory reason, records actor, timestamp, and audit trail.
   */
  async suspend(
    id: string,
    dto: SuspendOrganisationDto,
    actor: AuthenticatedUser,
    ip?: string,
    ua?: string,
  ) {
    return this.transition(
      id,
      'SUSPENDED',
      dto.reason,
      actor,
      ['ACTIVE'],
      'ORGANISATION_SUSPENDED',
    );
  }
  async activate(id: string, actor: AuthenticatedUser, ip?: string, ua?: string) {
    return this.transition(
      id,
      'ACTIVE',
      'Reactivated by authorized platform administrator',
      actor,
      ['SUSPENDED'],
      'ORGANISATION_ACTIVATED',
    );
  }
  async remove(id: string, actor: AuthenticatedUser, ip?: string, ua?: string) {
    return this.transition(
      id,
      'ARCHIVED',
      'Archived by authorized platform administrator',
      actor,
      ['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION', 'REJECTED', 'MORE_INFORMATION_REQUIRED'],
      'ORGANISATION_ARCHIVED',
    );
  }
  private async transition(
    id: string,
    status: OrganisationStatus,
    reason: string,
    actor: AuthenticatedUser,
    from: string[],
    action: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.organisation.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Organisation not found');
      if (!from.includes(existing.status))
        throw new BadRequestException(
          'Invalid status transition; verification is separate from reactivation',
        );
      const changed = await tx.organisation.updateMany({
        where: { id, status: existing.status, updatedAt: existing.updatedAt },
        data: {
          status,
          suspensionReason: status === 'SUSPENDED' ? reason : null,
          suspendedAt: status === 'SUSPENDED' ? new Date() : null,
          suspendedById: status === 'SUSPENDED' ? actor.userId : null,
        },
      });
      if (!changed.count) throw new ConflictException('Organization changed; reload and retry');
      await this.auditService.recordTx(tx, {
        actorId: actor.userId,
        actorRole: actor.role,
        action,
        entityType: 'ORGANISATION',
        entityId: id,
        organisationId: id,
        metadata: { reason, previousStatus: existing.status, nextStatus: status },
      });
      return { ...existing, status };
    });
  }

  async verification(id: string, dto: VerifyOrganisationDto, actor: AuthenticatedUser) {
    requirePermission(
      actor,
      dto.decision === 'REJECT' ? 'platform.organisations.reject' : 'platform.organisations.verify',
    );
    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organisation.findUnique({ where: { id } });
      if (!org) throw new NotFoundException('Organisation not found');
      if (!['PENDING_VERIFICATION', 'MORE_INFORMATION_REQUIRED', 'REJECTED'].includes(org.status))
        throw new BadRequestException('Organisation is not awaiting verification');
      const nextStatus =
        dto.decision === 'APPROVE'
          ? OrganisationStatus.ACTIVE
          : dto.decision === 'REJECT'
            ? OrganisationStatus.REJECTED
            : OrganisationStatus.MORE_INFORMATION_REQUIRED;
      const changed = await tx.organisation.updateMany({
        where: { id, status: org.status, updatedAt: org.updatedAt },
        data: { status: nextStatus },
      });
      if (!changed.count) throw new ConflictException('Status changed; reload before reviewing');
      const history = await tx.organisationVerification.create({
        data: {
          organisationId: id,
          actorId: actor.userId,
          decision: dto.decision,
          reason: dto.reason,
          previousStatus: org.status,
          nextStatus,
        },
      });
      await this.auditService.recordTx(tx, {
        actorId: actor.userId,
        actorRole: actor.role,
        action: `ORGANISATION_VERIFICATION_${dto.decision}`,
        entityType: 'ORGANISATION',
        entityId: id,
        organisationId: id,
        metadata: {
          decision: dto.decision,
          previousStatus: org.status,
          nextStatus,
          reason: dto.reason,
        },
      });
      return history;
    });
  }
  async verificationHistory(id: string, q: PlatformQueryDto) {
    const where = { organisationId: id };
    const [rows, total] = await Promise.all([
      this.prisma.organisationVerification.findMany({
        where,
        ...pagination(q),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.organisationVerification.count({ where }),
    ]);
    return paged(rows, total, q);
  }
  async members(id: string, q: PlatformQueryDto) {
    const where = {
      organisationId: id,
      ...(q.search ? { email: { contains: q.search, mode: 'insensitive' as const } } : {}),
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
  async activity(id: string, q: PlatformQueryDto) {
    return this.auditService.findAuditLogs({ ...q, organisationId: id });
  }
  async monitoring(id: string, actor: AuthenticatedUser) {
    const org = await this.findOne(id, actor);
    return {
      organisation: org,
      recruitment: can(actor, 'platform.jobs.read')
        ? await this.recruitment.summary(actor, id)
        : { available: false, reason: 'Recruitment permission required' },
    };
  }
  async invite(id: string, email: string, actor: AuthenticatedUser) {
    requirePermission(actor, 'platform.organisations.provision');
    const token = randomBytes(32).toString('hex');
    const result = await this.prisma.$transaction(
      async (tx) => {
        const org = await tx.organisation.findUnique({ where: { id } });
        if (!org) throw new NotFoundException('Organisation not found');
        if (['ARCHIVED', 'SUSPENDED', 'REJECTED'].includes(org.status))
          throw new BadRequestException('Organisation is not eligible for onboarding');
        if (
          await tx.user.findFirst({
            where: { organisationId: id, role: 'ORGANISATION_SUPER_ADMIN' },
          })
        )
          throw new ConflictException('Initial organisation owner already exists');
        if (await tx.user.findUnique({ where: { email: email.toLowerCase() } }))
          throw new ConflictException('Email is already registered');
        await tx.organisationInvitation.updateMany({
          where: { organisationId: id, acceptedAt: null },
          data: { expiresAt: new Date() },
        });
        const invitation = await tx.organisationInvitation.create({
          data: {
            organisationId: id,
            actorId: actor.userId,
            email: email.toLowerCase(),
            tokenHash: createHash('sha256').update(token).digest('hex'),
            expiresAt: new Date(Date.now() + 72 * 3600 * 1000),
          },
        });
        await this.auditService.recordTx(tx, {
          actorId: actor.userId,
          actorRole: actor.role,
          action: 'ORGANISATION_ADMIN_INVITED',
          entityType: 'ORGANISATION',
          entityId: id,
          organisationId: id,
        });
        return { id: invitation.id, expiresAt: invitation.expiresAt };
      },
      { isolationLevel: 'Serializable' },
    );
    return { ...result, token }; // One-time display; never put invitation tokens into audit metadata.
  }
  async onboarding(id: string) {
    const [owner, invitations] = await Promise.all([
      this.prisma.user.findFirst({
        where: { organisationId: id, role: 'ORGANISATION_SUPER_ADMIN' },
        select: publicUser,
      }),
      this.prisma.organisationInvitation.findMany({
        where: { organisationId: id },
        select: { id: true, email: true, expiresAt: true, acceptedAt: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);
    return { owner, invitations };
  }
  async acceptInvitation(dto: AcceptInvitationDto) {
    const hash = await bcrypt.hash(dto.password, 12);
    return this.prisma.$transaction(
      async (tx) => {
        const invitation = await tx.organisationInvitation.findUnique({
          where: { tokenHash: createHash('sha256').update(dto.token).digest('hex') },
          include: { organisation: true },
        });
        if (!invitation || invitation.acceptedAt || invitation.expiresAt <= new Date())
          throw new BadRequestException('Invitation is invalid or expired');
        if (invitation.organisation.status !== 'ACTIVE')
          throw new BadRequestException('Organisation must be verified and active first');
        if (
          await tx.user.findFirst({
            where: { organisationId: invitation.organisationId, role: 'ORGANISATION_SUPER_ADMIN' },
          })
        )
          throw new ConflictException('Organisation owner already provisioned');
        const claimed = await tx.organisationInvitation.updateMany({
          where: { id: invitation.id, acceptedAt: null, expiresAt: { gt: new Date() } },
          data: { acceptedAt: new Date() },
        });
        if (!claimed.count) throw new ConflictException('Invitation already used');
        const user = await tx.user.create({
          data: {
            email: invitation.email,
            firstName: dto.firstName,
            lastName: dto.lastName,
            passwordHash: hash,
            role: 'ORGANISATION_SUPER_ADMIN',
            organisationId: invitation.organisationId,
          },
          select: publicUser,
        });
        await this.auditService.recordTx(tx, {
          actorId: user.id,
          actorRole: user.role,
          action: 'ORGANISATION_ADMIN_PROVISIONED',
          entityType: 'ORGANISATION',
          entityId: invitation.organisationId,
          organisationId: invitation.organisationId,
        });
        return user;
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async deactivate(id: string, reason: string, actor: AuthenticatedUser) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.organisation.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Organisation not found');
      const result = await tx.organisation.update({ where: { id }, data: { status: 'ARCHIVED' } });
      await this.auditService.recordTx(tx, {
        actorId: actor.userId,
        actorRole: actor.role,
        action: 'ORGANISATION_DEACTIVATED',
        entityType: 'ORGANISATION',
        entityId: id,
        organisationId: id,
        metadata: { reason, previousStatus: existing.status },
      });
      return result;
    });
  }

  jobs(id: string, q: PlatformQueryDto, actor: AuthenticatedUser) {
    return this.recruitment.jobs(actor, { ...q, organisationId: id });
  }
}
