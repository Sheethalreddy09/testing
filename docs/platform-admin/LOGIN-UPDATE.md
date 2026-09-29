# Shared landing and separate platform login pages — 29 September 2026

The subsequent warm style update supersedes the dark-design details below; see
`../frontend-style/README.md`. The separate routes and role checks remain unchanged.

The uploaded source matches the previously reviewed updated ZIP. All 14 feature
areas remain covered as described in HANDOFF.md; this update does not complete
external recruitment or payment integrations.

## Login changes

- Keeps the existing Clyptus heading, dark background, gradients, indigo buttons,
  card styling and footer from the supplied screenshot.
- One landing page at / (also available at /platform/login) contains two login links.
- Super Admin Login opens /platform/login/super-admin.
- Admin Login opens /platform/login/admin.
- Each URL contains only its own email/password form and a link back to the landing.
- The landing keeps the dark design, with choice cards side by side on desktop and
  stacked on smaller screens. Each login page uses the original narrow card layout.
- Forms and errors reset when navigating back to choose another login.
- Both pages reuse /auth/platform/login and the existing server authentication.
- The UI sends expectedRole. The server compares it with the stored account role
  after verifying credentials and account status, before issuing a session.
- An account submitted in the wrong section is rejected. The section does not
  assign roles or change permissions. Existing accounts and passwords stay intact.
- expectedRole is optional for existing API clients. Those clients retain the
  original shared login behavior; authorization always uses the stored role.
- Existing sessions still open the shared permission-controlled dashboard.
- Root .gitignore now ignores .env.* including .env.example, as requested earlier.
  Ignore rules do not remove files already tracked in a separate Git checkout.

## Applying to your Windows checkout

Preserve your local .env, database, Docker configuration, and Git history. Replace
only these application files from this package, plus merge the .gitignore rule:

1. frontend/src/pages/auth/PlatformLogin.tsx
2. frontend/src/services/auth.service.ts
3. frontend/src/store/auth.store.ts
4. backend/src/modules/auth/dto/platform-login.dto.ts
5. backend/src/modules/auth/auth.service.ts
6. frontend/src/routes/index.tsx

New/updated regression tests are included alongside the login page and auth service.
If the preceding two-form version is already installed, only the frontend login page and routes need replacement. Restart backend and frontend. No database migration, seed, package installation or
password reset is needed for this login change. Open /; if already
signed in, log out to see the landing with the two links. The screenshot supplied was the login
page; no separate public marketing landing page was present in this source.

## Feature review

| Section | Source coverage | Remaining limits |
|---|---|---|
| 3.1 Dashboard | Local organization/user/token/support/activity counts | Recruitment counts, moderation queue, verified sales need providers |
| 3.2 Organizations | Create/search/update/lifecycle/members/activity | Requires assigned permissions |
| 3.3 Onboarding | Initial owner invitation, acceptance, status | Manual invitation delivery; email not connected |
| 3.4 Monitoring | Organization activity/status/token data | Jobs/recruitment data not connected |
| 3.5 Token operations | Plans/balances/consumption/ledger/adjustments | Verified sales not connected |
| 3.6 Token administration | Plan edits/allocation rules/usage/discrepancies | Verified purchase reporting needs payments; old feature metadata may be unspecified |
| 3.7 Job moderation | UI/actions/audit/history contracts | Live jobs and mutations unavailable without Jobs provider |
| 3.8 Verification | Approve/reject/request information/history | No additional external dependency for local workflow |
| 3.9 Users | Search/filter/status/suspend/reactivate/admin activity | Excludes platform account management |
| 3.10 Analytics | Organization charts, token volumes, basic user/support/moderation counts | Recruitment analytics and complete funnel unfinished |
| 3.11 Support | Cases/assignment/messages/escalation/status | Local platform workflow |
| 3.12 Notifications | Inbox/read state/operational event producers | Payment and live moderation events depend on external workflows |
| 3.13 Audit | Shared action logging and read-only history | Live recruitment actions require connected workflow |
| 3.14 Reports | Organization/user/token/moderation history and CSV | Recruitment not connected; UI CSV is current page, up to 20 rows |

Verification describes source coverage, not a live test against the user's database.

## Validation for this update

- Backend production build: passed.
- Backend tests: 68 passed in 8 suites.
- Frontend TypeScript/production build: passed.
- Frontend tests: 9 passed in 2 suites after the separate-page refinement.
- Tests cover matching roles, both role mismatches before session issuance,
  landing navigation, direct login URLs, correct request roles, and form reset on return.
- Browser visual testing and live database login were not performed.
- Existing nonblocking bundle-size and React Router future-flag warnings remain.
