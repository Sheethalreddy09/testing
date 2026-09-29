// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Platform-Level Permissions Dictionary
// ============================================================

export const PlatformPermissions = {
  ORGANISATIONS_VERIFY: 'platform.organisations.verify',
  ORGANISATIONS_REJECT: 'platform.organisations.reject',
  ORGANISATIONS_REACTIVATE: 'platform.organisations.reactivate',
  ORGANISATIONS_DEACTIVATE: 'platform.organisations.deactivate',
  ORGANISATIONS_MEMBERS_READ: 'platform.organisations.members.read',
  ORGANISATIONS_ACTIVITY_READ: 'platform.organisations.activity.read',
  ORGANISATIONS_PROVISION: 'platform.organisations.provision',
  USERS_READ: 'platform.users.read',
  USERS_SUSPEND: 'platform.users.suspend',
  USERS_REACTIVATE: 'platform.users.reactivate',
  USERS_ACTIVITY_READ: 'platform.users.activity.read',
  TOKENS_SALES_READ: 'platform.tokens.sales.read',
  JOBS_READ: 'platform.jobs.read',
  JOBS_MODERATE: 'platform.jobs.moderate',
  JOBS_SUSPEND: 'platform.jobs.suspend',
  MODERATION_READ: 'platform.moderation.read',
  SUPPORT_READ: 'platform.support.read',
  SUPPORT_MANAGE: 'platform.support.manage',
  SUPPORT_ESCALATE: 'platform.support.escalate',
  NOTIFICATIONS_READ: 'platform.notifications.read',
  REPORTS_GENERATE: 'platform.reports.generate',
  REPORTS_EXPORT: 'platform.reports.export',

  // Organisation Management
  ORGANISATIONS_READ: 'platform.organisations.read',
  ORGANISATIONS_CREATE: 'platform.organisations.create',
  ORGANISATIONS_UPDATE: 'platform.organisations.update',
  ORGANISATIONS_SUSPEND: 'platform.organisations.suspend',
  ORGANISATIONS_DELETE: 'platform.organisations.delete',

  // Platform Admin Management
  ADMINS_READ: 'platform.admins.read',
  ADMINS_CREATE: 'platform.admins.create',
  ADMINS_UPDATE: 'platform.admins.update',
  ADMINS_DISABLE: 'platform.admins.disable',

  // Token System Management
  TOKENS_READ: 'platform.tokens.read',
  TOKENS_MANAGE: 'platform.tokens.manage',
  TOKENS_ALLOCATE: 'platform.tokens.allocate',
  TOKENS_ADJUST: 'platform.tokens.adjust',

  // Platform Analytics
  ANALYTICS_READ: 'platform.analytics.read',

  // Centralized Audit Logs
  AUDIT_READ: 'platform.audit.read',

  // Platform Security & Sessions
  SECURITY_READ: 'platform.security.read',
  SECURITY_MANAGE: 'platform.security.manage',

  // Platform Settings & Configuration
  SETTINGS_READ: 'platform.settings.read',
  SETTINGS_MANAGE: 'platform.settings.manage',
} as const;

export type PlatformPermissionKey = (typeof PlatformPermissions)[keyof typeof PlatformPermissions];

export const ALL_PLATFORM_SUPER_ADMIN_PERMISSIONS: string[] = Object.values(PlatformPermissions);
