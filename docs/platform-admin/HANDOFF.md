# Platform Admin implementation and handoff

## Scope and shared architecture

Built on the uploaded `Clyptus-job-portal-platform-admin-phase1(3).zip`.
The separate `(4)` ZIP mentioned in earlier history was not supplied in this task.
React routes remain under `/platform`; APIs under `/api/v1/platform`.
Existing login/logout/server-backed JWT sessions, layouts, API client, role guards,
permission guards, Organization/User/Token models and central audit service are reused.
No Organization Super Admin portal, second platform, or duplicate recruitment models.

## Requirement checklist

“Implemented” means source, UI/API where applicable, and tests are included. It does
not mean this was deployed or tested against your company's live database.

| Section | Coverage | Status / integration boundary |
|---|---|---|
| 3.1 Dashboard | Organization totals/active/pending/suspended; users/candidates/recruiters; token consumption/balance; support queue; moderation-action count; recent activity; Jobs/Applications/Interviews/Offers, moderation queue and token-sales surfaces | Local counts implemented. Recruitment counts/queue and verified monetary sales require their domain adapters; displayed as unavailable, never fake zero. Each dataset is permission checked. |
| 3.2 Organization management | Create/view/search/filter/update; status review; verification/rejection; suspend/reactivate/deactivate; members/activity | Implemented with shared organization service, confirmation/reason forms and backend permissions. Deactivate archives without deleting history. |
| 3.3 Onboarding | Organization record/info/status, initial admin invitation, invitation tracking and account provisioning, verification and activation | Implemented. Admin-created organizations start pending; existing Super Admin creation behavior stays active. Invite contains a 256-bit secret, stored hashed, expires after 72 hours, single use; acceptance requires ACTIVE organization. Owner role is fixed to ORGANISATION_SUPER_ADMIN. |
| 3.4 Monitoring | Status, members, activity, token usage by feature, recruitment summary/jobs | Local data implemented; organization-scoped Jobs/recruitment adapter pending. |
| 3.5 Token operations | Packages, package edits, verified-sales surface, balances, consumption, transactions, authorized adjustments, activity | Ledger/local operations implemented. Real monetary sales require verified-payment reporting adapter. |
| 3.6 Token administration | Add/update packages; allocation limits; purchase ledger history; per-organization/per-feature usage; discrepancy investigation | Implemented. Old transactions lacking feature metadata appear as UNSPECIFIED. Reconciliation is read-only. External payment refunds/purchases cannot be synthesized through manual adjustments. |
| 3.7 Job moderation | Job search/filter, flagged/reported views, approve/restrict/suspend/restore controls, immutable moderation history and audit | UI, controller, persistence and transaction contract implemented. Live job reads/mutations intentionally return unavailable until shared Jobs provider is connected. Adapter-mock tests verify history/audit transaction. |
| 3.8 Verification | Review pending/more-info/rejected organizations; approve/reject/request info; explicit transitions/history | Implemented. Ordinary reactivation only accepts SUSPENDED and cannot bypass verification. Concurrent decisions use conditional writes. |
| 3.9 User administration | Search/filter candidate and organization users; account status; suspend/reactivate; account-administration activity | Implemented. No Platform Admin/Super Admin targets; no role mutation payload. Suspensions revoke existing sessions. No password hashes exposed. |
| 3.10 Analytics | Shared organization charts, user counts, token distributions/time window, support queue and moderation totals, recruitment funnel surface | Local analytics implemented. Recruitment funnel requires owning domain adapter. Current totals and period-based token volume are labeled separately. |
| 3.11 Support | Cases, user/org issues, descriptions, assignment, messages/activity, state tracking, escalation | Implemented. OPEN → IN_PROGRESS/ESCALATED/RESOLVED; RESOLVED → CLOSED/IN_PROGRESS; CLOSED → IN_PROGRESS. Backend validates transitions and assignment. Escalated cases require escalation authority to handle. |
| 3.12 Notifications | Shared records/categories, recipient ownership, read state, timestamps/entity refs, header unread count | Implemented for platform/org/token/user/support/moderation/security producers. Payment category/event contract is ready; payment producer awaits integration. Header refreshes every 30 seconds; no duplicate WebSocket stack. |
| 3.13 Audit | Organization, verification, user, support, moderation, token and privileged history, safe metadata | Existing infrastructure extended. New critical workflows and organization/token business writes record audit in their database transaction. No edit/delete audit APIs. |
| 3.14 Reports/exports | Organization/user/token/moderation datasets; recruitment report surface; CSV | Local reports and current-page CSV implemented. Source permission + generate + export checks prevent export bypass. Recruitment report requires adapter. CSV cells are quoted and formula-prefix escaped. |

## Security and accounting decisions

- Platform Admin uses explicitly assigned permissions; wildcard strings are not honored.
- Existing Super Admin implicit authority and management/settings role restrictions remain.
- Platform user administration only targets CANDIDATE, RECRUITER, ORGANISATION_ADMIN,
  ORGANISATION_SUPER_ADMIN. It never modifies platform accounts or accepts role changes.
- Platform administrators with the appropriate platform read permission intentionally
  administer across organizations. Future tenant controllers must add tenant ownership
  checks; they must not reuse these platform controllers as organization endpoints.
- Organization-read responses omit token data unless token-read is also granted.
  Member lists require their own permission; activity requires its own permission.
  Organization detail avoids exposing private billing metadata.
- Token changes use serializable transactions, up to three serialization-conflict
  attempts, ledger writes and transactional audit. Debits respect reserved balances.
  Single-transaction and monthly credit limits are enforced for adjustments. Initial organization allocations are capped at the default single-transaction limit.
- PURCHASE/REFUND/REVERSAL cannot be submitted through manual adjustments, including
  by Super Admin. Those operations belong to verified payment/accounting workflows.
- Database checks require nonnegative available balances and correct ledger arithmetic.
- Verification/history, moderation and support activities have no mutation/deletion
  endpoints. History references protect users/organizations from physical deletion.
- Notifications are filtered by recipient AND current source permission. Knowledge of
  a notification ID does not allow reading another user's notification.
- Audit metadata sanitization covers nested objects and arrays. Passwords/invite
  secrets are never intentionally passed into audit payloads.
- Report exports are allowlisted scalar columns from the same scoped report service.
  CSV download is the current page, up to 20 rows in UI; API max page size is 100.
- The original bearer-token/sessionStorage authentication is retained. Existing auth
  audit logging remains best-effort; business operations added here use strict audit.

## Shared services and schemas

Extended: PlatformOrganisationService, PlatformTokenService, PlatformAnalyticsService,
PlatformDashboardService, AuditService, existing permissions/routes/sidebar/header.
Added shared domains: SupportService and NotificationService.
Added platform adapters/workflows: PlatformUserService, ModerationService, ReportService.

Added Prisma models: OrganisationVerification, OrganisationInvitation, SupportCase,
SupportActivity, Notification, JobModeration. Added REJECTED and
MORE_INFORMATION_REQUIRED organization statuses, and typed operational enums.
Relations, indexes and migrations are included. No duplicate User/Organisation/Token,
Job/Application/Interview/Offer models were added. JobModeration.jobId intentionally
references an externally owned Jobs identifier and is resolved through RecruitmentPort.

## API map

All below use `/api/v1` and the existing shared auth/role/permission guards unless noted.

| Methods and path | Purpose / authority |
|---|---|
| GET /platform/dashboard | Permission-filtered summaries for platform roles |
| GET/POST /platform/organisations | Existing list/create; read/create grants |
| GET/PATCH /platform/organisations/:id | Existing profile/update; read/update grants |
| POST /platform/organisations/:id/suspend | Suspend ACTIVE organization; suspend grant |
| POST /platform/organisations/:id/activate | Reactivate SUSPENDED organization; reactivate grant |
| POST /platform/organisations/:id/deactivate | Archive with reason; deactivate grant |
| GET /platform/verifications | Verification queue, status filter; organization read |
| GET/POST /platform/organisations/:id/verification | History / decision; read or verify/reject grant |
| GET /platform/organisations/:id/members | Member list; members.read |
| GET /platform/organisations/:id/activity | Organization activity; activity.read |
| GET /platform/organisations/:id/monitoring | Organization analytics; organization + analytics read; recruitment additionally gated |
| GET /platform/organisations/:id/jobs | Shared Jobs search scoped to organization; organization + jobs read |
| GET /platform/organisations/:id/onboarding | Provisioning history; provision grant |
| POST /platform/organisations/:id/invitations | Initial owner invitation; provision grant |
| POST /auth/organisation-invitations/accept | Public token-capability endpoint; single-use secret, no platform session issued |
| GET /platform/users | Non-platform user search/filter; users.read |
| POST /platform/users/:id/suspend or /reactivate | Account lifecycle; respective grant and role boundary |
| GET /platform/users/:id/activity | Account administration history; users.activity.read |
| GET/POST /platform/support | List/create; support.read/manage |
| GET/PATCH /platform/support/:id | Detail/messages/transitions; support.read/manage/escalate |
| GET /platform/notifications | Own permitted alerts; notifications.read |
| POST /platform/notifications/:id/read | Mark own alert read |
| GET /platform/moderation/jobs | Shared jobs; jobs.read + moderation.read |
| POST /platform/moderation/jobs/:id/actions | Moderate; source-read grants + moderate or suspend grant |
| GET /platform/moderation/history | Moderation history; moderation.read |
| GET /platform/moderation/jobs/:id/history | Per-job moderation history |
| GET /platform/tokens/balances | Paginated balances + totals across all filtered organizations |
| GET /platform/tokens/features | Feature usage; tokens.read |
| GET /platform/tokens/discrepancies | Ledger reconciliation; tokens.read |
| GET /platform/tokens/sales | Verified payment reporting port; tokens.sales.read |
| POST /platform/tokens/adjust | Existing adjustment endpoint; tokens.adjust |
| PATCH /platform/tokens/organisations/:id/limits | Existing allocation rules; tokens.allocate |
| GET/POST/PATCH /platform/token-plans[/id] | Existing package APIs; tokens.read/manage |
| GET /platform/token-transactions | Existing ledger, now searchable |
| GET /platform/analytics | Shared analytics; analytics.read plus individual dataset permissions |
| GET /platform/audit-logs | Immutable audit list; audit.read |
| GET /platform/reports/:kind | organizations/users/tokens/moderation/recruitment; generate + source read |
| GET /platform/reports/:kind/export | Same report plus export grant |

The report kind uses British spelling `organisations`, matching existing API naming.
All existing auth and Super Admin routes remain; admin-profile read is now also
Super-Admin-only, matching the existing frontend boundary.

## Frontend routes

Existing `/platform`, `/platform/organisations`, `/platform/organisations/:id`,
`/platform/token-plans`, `/platform/token-transactions`, `/platform/token-usage`,
`/platform/analytics`, `/platform/audit-logs`, `/platform/admins`, `/platform/security`,
`/platform/settings`, `/platform/login` are retained.
Added `/platform/verifications`, `/platform/monitoring`, `/platform/users`,
`/platform/moderation/jobs`, `/platform/support`, `/platform/notifications`,
`/platform/reports` and `/organisation-invitation`.
One sidebar/layout/client. New pages share OperationsUI tables, confirmation forms,
error/empty/loading states, pagination, search and permission-controlled actions.
Organization/platform status strings are displayed explicitly. Header/navigation adapts
to small screens. Existing chart and package/admin components are reused.

## Organization Super Admin handoff

1. Platform Admin creates organization → PENDING_VERIFICATION.
2. An authorized platform operator creates an initial-admin invitation.
3. Verify/reject/request more information through the explicit review workflow.
4. APPROVE sets ACTIVE. Only then can the invited person accept the secret link.
5. Acceptance creates exactly the initial ORGANISATION_SUPER_ADMIN User using the
   existing User/Organisation models and a bcrypt password hash. Existing owners and
   duplicate accounts are rejected; the invitation is consumed transactionally.
6. The future Organization Portal owns organization login, membership, billing and
   recruiting UI. No platform login token is issued by invitation acceptance.

Invitation delivery is a one-time link for secure manual delivery. Existing email
integration is a stub, so the UI does not falsely say an invitation email was sent.
Future email delivery should publish the link through your approved shared mail service.

## Integration contracts and remaining external work

`backend/src/modules/platform/contracts/platform-domains.ts` defines RecruitmentPort
and PaymentReportingPort. Replace UnconnectedRecruitment/UnconnectedPayments providers
in PlatformModule with real adapters. They receive authenticated actor context; Jobs
requests also receive the organization scope. Do not ignore either.

RecruitmentPort supplies summary, paginated jobs, a resolved job, moderation mutation,
and report rows. In-process moderation must use the supplied Prisma transaction so
job state, moderation record and audit commit together. A remote Jobs service requires
an approved outbox/idempotency protocol before enabling mutations; do not implement
remote calls as if they were database-atomic.

PaymentReportingPort supplies verified sales and purchase rows, with monetary totals
separated by currency. It must never infer sales revenue from ALLOCATION records.
Payment providers should use shared NotificationService for PAYMENT events.

NotificationService.deliver supports a particular recipient in any future portal;
publish targets authorized platform administrators. Future portal notification/support
controllers must enforce recipient/organization ownership explicitly. Platform support
creation validates that the requester belongs to the supplied organization.

Original Redis/BullMQ/search/storage/email/AI/payment infrastructure stubs remain for
other teams. They are not presented as live health/AI statistics in the Admin dashboard.
No live WebSocket infrastructure existed, so notifications use bounded polling.

## Audit event additions

ORGANISATION_VERIFICATION_APPROVE / REJECT / REQUEST_INFORMATION,
ORGANISATION_ADMIN_INVITED, ORGANISATION_ADMIN_PROVISIONED,
ORGANISATION_DEACTIVATED, USER_SUSPENDED, USER_REACTIVATED,
SUPPORT_CREATED, SUPPORT_UPDATED, SUPPORT_ESCALATED,
JOB_APPROVE / RESTRICT / SUSPEND / RESTORE, REPORT_EXPORTED.
Existing organization, token, security, session and admin audit events are retained.

## Cleanup and limits

Removed opt-in fake API-success fallback, its mock dataset, and the seed-only sample organization whose balance lacked a ledger entry. Removed only frontend
components no longer referenced after shared-page consolidation; see CLEANUP.json.
Kept unrelated Super Admin business services, integration stubs, settings/security
screens and original Super Admin documentation. CHANGES.json lists exact paths.

No production database or external account was accessed. Full live database/backend/
browser end-to-end verification remains a deployment gate. Browser screenshots could
not be produced because the browser binary download failed in this environment.
HTTP tests use Nest's real routing/DTO/authorization with mocked persistence and an
authentication fixture; separate original authentication tests still run.
