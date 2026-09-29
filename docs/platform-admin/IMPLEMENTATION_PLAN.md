# Platform Admin Implementation Plan

## Scope

Platform Admin is a role inside the existing shared Platform Portal. The implementation must reuse the Platform Super Admin foundation and must not create a second frontend application, backend application, API client, authentication stack, audit stack, or duplicate organisation/token domain services.

## Reuse from existing code

- `frontend/src/layouts/platform/*`
- `frontend/src/services/api.ts`
- `frontend/src/services/platform.service.ts`
- `frontend/src/hooks/usePermissions.ts`
- shared platform pages/features for organisations, tokens, analytics, audit, and security
- `backend/src/common/guards/*`
- `backend/src/modules/audit/*`
- `backend/src/modules/platform/organisations/*`
- `backend/src/modules/platform/tokens/*`
- `backend/src/modules/platform/analytics/*`
- `backend/src/modules/platform/security/*`
- existing Prisma `User`, `PlatformAdminProfile`, `PlatformSession`, organisation, token, audit, and security models

## Platform Admin feature roadmap

1. Shared platform authentication and route protection.
2. Platform Admin permission/nav configuration.
3. Organisation verification, rejection, additional-information workflow, onboarding, and monitoring.
4. Platform user administration for authorized non-Super-Admin accounts.
5. Support case management and escalation.
6. Token sales/usage/discrepancy enhancements.
7. Platform notifications.
8. Job moderation integration with the shared Jobs domain.
9. Expanded Platform Admin dashboard and analytics, consuming Jobs/Applications/Interviews/Offers modules when available.
10. Reports and permitted exports.
11. Audit/security hardening and integration tests.

## Hard boundaries

Platform Admin must not:

- create or promote a Platform Super Admin;
- self-grant Super Admin privileges;
- bypass the token ledger/payment verification;
- edit/delete audit history;
- access infrastructure secrets;
- bypass resource or tenant authorization;
- directly mutate production database records as an application workflow.

## Integration rule

Shared feature = shared code. Different access = permission. Super-Admin-only feature = role-specific code.
