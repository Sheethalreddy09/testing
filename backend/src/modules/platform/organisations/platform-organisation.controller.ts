// ============================================================
// PLATFORM SUPER ADMIN
// Controller: Platform Organisation Oversight & Management
// Base Route: /api/v1/platform/organisations
//
// Security:
// Only platform administrators with explicit permissions can access.
// Never trust client-provided actor identity.
// ============================================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '@prisma/client';
import { PlatformOrganisationService } from './platform-organisation.service';
import { CreateOrganisationDto } from './dto/create-organisation.dto';
import { UpdateOrganisationDto } from './dto/update-organisation.dto';
import { SuspendOrganisationDto } from './dto/suspend-organisation.dto';
import { QueryOrganisationDto } from './dto/query-organisation.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { PlatformPermissions } from '../../../common/constants/permissions.constant';

import { PlatformQueryDto } from '../../../common/dto/platform-query.dto';
import { VerifyOrganisationDto, InviteOrganisationDto, ReasonDto } from './dto/operations.dto';

@Controller('platform/organisations')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.PLATFORM_SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
export class PlatformOrganisationController {
  constructor(private readonly organisationService: PlatformOrganisationService) {}

  @Get()
  @RequirePermissions(PlatformPermissions.ORGANISATIONS_READ)
  async findAll(@Query() query: QueryOrganisationDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.organisationService.findAll(query, actor);
  }

  @Get(':id')
  @RequirePermissions(PlatformPermissions.ORGANISATIONS_READ)
  async findOne(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.organisationService.findOne(id, actor);
  }

  @Post()
  @RequirePermissions(PlatformPermissions.ORGANISATIONS_CREATE)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateOrganisationDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] ||
      req.ip ||
      req.socket?.remoteAddress) as string;
    const userAgent = req.headers['user-agent'];
    return this.organisationService.create(dto, actor, ipAddress, userAgent);
  }

  @Patch(':id')
  @RequirePermissions(PlatformPermissions.ORGANISATIONS_UPDATE)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganisationDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] ||
      req.ip ||
      req.socket?.remoteAddress) as string;
    const userAgent = req.headers['user-agent'];
    return this.organisationService.update(id, dto, actor, ipAddress, userAgent);
  }

  @Post(':id/suspend')
  @RequirePermissions(PlatformPermissions.ORGANISATIONS_SUSPEND)
  @HttpCode(HttpStatus.OK)
  async suspend(
    @Param('id') id: string,
    @Body() dto: SuspendOrganisationDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] ||
      req.ip ||
      req.socket?.remoteAddress) as string;
    const userAgent = req.headers['user-agent'];
    return this.organisationService.suspend(id, dto, actor, ipAddress, userAgent);
  }

  @Post(':id/activate')
  @RequirePermissions(PlatformPermissions.ORGANISATIONS_REACTIVATE)
  @HttpCode(HttpStatus.OK)
  async activate(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] ||
      req.ip ||
      req.socket?.remoteAddress) as string;
    const userAgent = req.headers['user-agent'];
    return this.organisationService.activate(id, actor, ipAddress, userAgent);
  }

  @Delete(':id')
  @RequirePermissions(PlatformPermissions.ORGANISATIONS_DELETE)
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] ||
      req.ip ||
      req.socket?.remoteAddress) as string;
    const userAgent = req.headers['user-agent'];
    return this.organisationService.remove(id, actor, ipAddress, userAgent);
  }

  @Post(':id/verification')
  async verify(
    @Param('id') id: string,
    @Body() dto: VerifyOrganisationDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.organisationService.verification(id, dto, actor);
  }
  @Get(':id/verification')
  @RequirePermissions(PlatformPermissions.ORGANISATIONS_READ)
  history(@Param('id') id: string, @Query() q: PlatformQueryDto) {
    return this.organisationService.verificationHistory(id, q);
  }
  @Get(':id/members')
  @RequirePermissions(PlatformPermissions.ORGANISATIONS_MEMBERS_READ)
  members(@Param('id') id: string, @Query() q: PlatformQueryDto) {
    return this.organisationService.members(id, q);
  }
  @Get(':id/activity')
  @RequirePermissions(PlatformPermissions.ORGANISATIONS_ACTIVITY_READ)
  activity(@Param('id') id: string, @Query() q: PlatformQueryDto) {
    return this.organisationService.activity(id, q);
  }
  @Get(':id/monitoring')
  @RequirePermissions(PlatformPermissions.ORGANISATIONS_READ, PlatformPermissions.ANALYTICS_READ)
  monitoring(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.organisationService.monitoring(id, actor);
  }
  @Post(':id/deactivate')
  @RequirePermissions(PlatformPermissions.ORGANISATIONS_DEACTIVATE)
  deactivate(
    @Param('id') id: string,
    @Body() dto: ReasonDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.organisationService.deactivate(id, dto.reason, actor);
  }
  @Post(':id/invitations')
  @RequirePermissions(PlatformPermissions.ORGANISATIONS_PROVISION)
  invite(
    @Param('id') id: string,
    @Body() dto: InviteOrganisationDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.organisationService.invite(id, dto.email, actor);
  }
  @Get(':id/onboarding')
  @RequirePermissions(PlatformPermissions.ORGANISATIONS_PROVISION)
  onboarding(@Param('id') id: string) {
    return this.organisationService.onboarding(id);
  }

  @Get(':id/jobs')
  @RequirePermissions(PlatformPermissions.ORGANISATIONS_READ, PlatformPermissions.JOBS_READ)
  jobs(@Param('id') id: string, @Query() q: PlatformQueryDto, @CurrentUser() a: AuthenticatedUser) {
    return this.organisationService.jobs(id, q, a);
  }
}
