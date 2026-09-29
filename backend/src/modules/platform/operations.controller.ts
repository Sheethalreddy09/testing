import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { QueryOrganisationDto } from './organisations/dto/query-organisation.dto';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions as P } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser as Actor } from '../../common/interfaces/authenticated-user.interface';
import { PlatformQueryDto as QueryDto } from '../../common/dto/platform-query.dto';
import { PlatformUserService } from './users/platform-user.service';
import { SupportService } from '../support/support.service';
import { CreateSupportDto, UpdateSupportDto } from '../support/support.dto';
import { NotificationService } from '../notifications/notification.service';
import { ModerationService, ModerateJobDto } from './moderation/moderation.service';
import { PlatformTokenService } from './tokens/platform-token.service';
import { PlatformOrganisationService } from './organisations/platform-organisation.service';
import { ReasonDto } from './organisations/dto/operations.dto';
import { ReportService } from './reports/report.service';
@Controller('platform')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.PLATFORM_ADMIN, UserRole.PLATFORM_SUPER_ADMIN)
export class PlatformOperationsController {
  constructor(
    private readonly users: PlatformUserService,
    private readonly support: SupportService,
    private readonly notifications: NotificationService,
    private readonly moderation: ModerationService,
    private readonly tokens: PlatformTokenService,
    private readonly organisations: PlatformOrganisationService,
    private readonly reports: ReportService,
  ) {}
  @Get('verifications') @P('platform.organisations.read') verifications(
    @Query() q: QueryOrganisationDto,
    @CurrentUser() a: Actor,
  ) {
    return this.organisations.findAll({ ...q, status: q.status || 'PENDING_VERIFICATION' }, a);
  }
  @Get('users') @P('platform.users.read') listUsers(@Query() q: QueryDto) {
    return this.users.list(q);
  }
  @Post('users/:id/suspend') @P('platform.users.suspend') suspend(
    @Param('id') id: string,
    @Body() dto: ReasonDto,
    @CurrentUser() a: Actor,
  ) {
    return this.users.status(id, false, dto.reason, a);
  }
  @Post('users/:id/reactivate') @P('platform.users.reactivate') reactivate(
    @Param('id') id: string,
    @Body() dto: ReasonDto,
    @CurrentUser() a: Actor,
  ) {
    return this.users.status(id, true, dto.reason, a);
  }
  @Get('users/:id/activity') @P('platform.users.activity.read') userActivity(
    @Param('id') id: string,
    @Query() q: QueryDto,
  ) {
    return this.users.activity(id, q);
  }
  @Get('support') @P('platform.support.read') cases(@Query() q: QueryDto) {
    return this.support.list(q);
  }
  @Get('support/:id') @P('platform.support.read') detail(@Param('id') id: string) {
    return this.support.detail(id);
  }
  @Post('support') @P('platform.support.manage') create(
    @Body() dto: CreateSupportDto,
    @CurrentUser() a: Actor,
  ) {
    return this.support.create(dto, a);
  }
  @Patch('support/:id') update(
    @Param('id') id: string,
    @Body() dto: UpdateSupportDto,
    @CurrentUser() a: Actor,
  ) {
    return this.support.update(id, dto, a);
  }
  @Get('notifications') @P('platform.notifications.read') listNotifications(
    @Query() q: QueryDto,
    @CurrentUser() a: Actor,
  ) {
    return this.notifications.list(a, q);
  }
  @Post('notifications/:id/read') @P('platform.notifications.read') read(
    @Param('id') id: string,
    @CurrentUser() a: Actor,
  ) {
    return this.notifications.read(a, id);
  }
  @Get('moderation/jobs') @P('platform.jobs.read', 'platform.moderation.read') jobs(
    @Query() q: QueryDto,
    @CurrentUser() a: Actor,
  ) {
    return this.moderation.list(a, q);
  }
  @Post('moderation/jobs/:id/actions')
  @P('platform.jobs.read', 'platform.moderation.read')
  moderate(@Param('id') id: string, @Body() dto: ModerateJobDto, @CurrentUser() a: Actor) {
    return this.moderation.moderate(id, dto, a);
  }
  @Get('moderation/history') @P('platform.moderation.read') history(@Query() q: QueryDto) {
    return this.moderation.history(q);
  }
  @Get('moderation/jobs/:id/history') @P('platform.moderation.read') jobHistory(
    @Param('id') id: string,
    @Query() q: QueryDto,
  ) {
    return this.moderation.history(q, id);
  }
  @Get('tokens/balances') @P('platform.tokens.read') balances(@Query() q: QueryDto) {
    return this.tokens.balances(q);
  }
  @Get('tokens/features') @P('platform.tokens.read') features(@Query() q: QueryDto) {
    return this.tokens.features(q);
  }
  @Get('tokens/discrepancies') @P('platform.tokens.read') discrepancies(@Query() q: QueryDto) {
    return this.tokens.discrepancies(q);
  }
  @Get('tokens/sales') @P('platform.tokens.sales.read') sales(
    @Query() q: QueryDto,
    @CurrentUser() a: Actor,
  ) {
    return this.tokens.sales(a, q);
  }
  @Get('reports/:kind') @P('platform.reports.generate') report(
    @Param('kind') kind: string,
    @Query() q: QueryDto,
    @CurrentUser() a: Actor,
  ) {
    return this.reports.generate(kind, q, a);
  }
  @Get('reports/:kind/export') @P('platform.reports.generate', 'platform.reports.export') export(
    @Param('kind') kind: string,
    @Query() q: QueryDto,
    @CurrentUser() a: Actor,
  ) {
    return this.reports.export(kind, q, a);
  }
}
