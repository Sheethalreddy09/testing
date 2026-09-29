// ============================================================
// PLATFORM SUPER ADMIN
// Module: Platform Super Admin Domain Module
// ============================================================

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Controllers
import { PlatformDashboardController } from './dashboard/platform-dashboard.controller';
import { PlatformOrganisationController } from './organisations/platform-organisation.controller';
import { PlatformAdminController } from './admins/platform-admin.controller';
import { PlatformTokenController } from './tokens/platform-token.controller';
import { PlatformAnalyticsController } from './analytics/platform-analytics.controller';
import { PlatformAuditController } from './audit/platform-audit.controller';
import { PlatformSecurityController } from './security/platform-security.controller';
import { PlatformSettingsController } from './settings/platform-settings.controller';

// Services
import { PlatformDashboardService } from './dashboard/platform-dashboard.service';
import { PlatformOrganisationService } from './organisations/platform-organisation.service';
import { PlatformAdminService } from './admins/platform-admin.service';
import { PlatformTokenService } from './tokens/platform-token.service';
import { PlatformAnalyticsService } from './analytics/platform-analytics.service';
import { PlatformSecurityService } from './security/platform-security.service';
import { PlatformSettingsService } from './settings/platform-settings.service';

// Guards
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { PlatformOperationsController } from './operations.controller';
import { OrganisationInvitationController } from './organisations/organisation-invitation.controller';
import { PlatformUserService } from './users/platform-user.service';
import { SupportService } from '../support/support.service';
import { NotificationService } from '../notifications/notification.service';
import { ModerationService } from './moderation/moderation.service';
import { ReportService } from './reports/report.service';
import {
  RecruitmentPort,
  UnconnectedRecruitment,
  PaymentReportingPort,
  UnconnectedPayments,
} from './contracts/platform-domains';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>(
          'JWT_SECRET',
          'super-secret-jwt-key-replace-in-production-min-32-chars-long',
        ),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '1d'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    PlatformOperationsController,
    OrganisationInvitationController,
    PlatformDashboardController,
    PlatformOrganisationController,
    PlatformAdminController,
    PlatformTokenController,
    PlatformAnalyticsController,
    PlatformAuditController,
    PlatformSecurityController,
    PlatformSettingsController,
  ],
  providers: [
    PlatformUserService,
    SupportService,
    NotificationService,
    ModerationService,
    ReportService,
    { provide: RecruitmentPort, useClass: UnconnectedRecruitment },
    { provide: PaymentReportingPort, useClass: UnconnectedPayments },
    PlatformDashboardService,
    PlatformOrganisationService,
    PlatformAdminService,
    PlatformTokenService,
    PlatformAnalyticsService,
    PlatformSecurityService,
    PlatformSettingsService,
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
  ],
  exports: [PlatformOrganisationService, PlatformAdminService, PlatformTokenService],
})
export class PlatformModule {}
