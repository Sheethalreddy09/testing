# Admin experience update — 29 September 2026

## Changes

- Audit logs show readable activity, the person, organization/item, and time. View details presents metadata as labelled fields and permission names, with technical references collapsed. The original audit data remains intact.
- Search matches people, organization names, action codes and common activity labels. Filter by activity type. The full history is paginated on the server at 20 rows per page; a 500-record history spans 25 pages.
- Dashboard activity is limited to five events on the server and client, with a View all activity link. No historical records are deleted. The existing database already indexes audit timestamps.
- The shared landing remains at / and /platform/login. Admin Login opens /platform/login/admin; Super Admin Login opens /platform/login/super-admin. The backend checks the account's actual role.
- Remember me is optional on both login pages. It sets a server-issued HttpOnly, SameSite=Lax cookie for up to 30 days. Production cookies require HTTPS. The frontend keeps only a non-secret remember-session hint in localStorage; no password or token is placed there. Existing sessionStorage bearer support is retained for ordinary tabs. Closing and reopening the browser restores remembered accounts through /auth/me.
- Logout revokes the server session and clears the cookie. Expiry, session revocation and account deactivation still apply. Cookie-based writes require the custom request header and accepted origin; the frontend sends credentials automatically.
- Create Admin and Assign Admin permissions use a grouped, searchable checkbox table with human-readable actions and an enabled count. Saving uses the existing permission API. Critical settings and Admin-account management remain Super Admin only. Viewing a dataset and performing actions on it may require both permissions; selecting an action does not silently add other access.

## Apply to an existing checkout

Copy the changed source files listed in CHANGED-FILES.json to matching locations in your existing project. Keep your local .env files. There are no new dependencies, database migrations, seed operations, Docker changes, or password changes.

Restart BOTH processes from the project root in separate terminals:

```powershell
cd backend
npm run start:dev
```

```powershell
cd frontend
npm run dev
```

For a fresh extracted copy, run npm ci in each folder first and follow the existing project setup guide. Dependency folders are not included in this ZIP.

For Remember me, use the same browser and allow cookies/site storage. Log in once with the checkbox selected. Production frontend/API should be same-site, with HTTPS and CORS_ORIGIN set to the exact frontend origin. The Vite development proxy works with the existing /api/v1 configuration. Remembered sessions do not survive clearing browser cookies or server-side revocation.

## Verification

- Backend build passed; 75 tests passed across 10 suites.
- Frontend production build passed; 11 tests passed across 2 files.
- HTTP tests cover remembered-cookie restoration, expiry, account deactivation, logout revocation, ordinary bearer login, wrong login role, boolean validation and rejected cross-site writes.
- Desktop (1440px) and mobile (390px) browser checks passed: separate login routes, Remember me, a five-event dashboard, 20-row pagination, readable metadata, permission updates and create-Admin layouts. No page overflow or browser runtime errors were observed.
- Preview screenshots and results.json use mocked example API records, including 500 organizations. They are design/interaction fixtures, not verification against your running local database.
- The frontend does not define an npm run lint script. The production build performs TypeScript checking. Vite retains the existing large-bundle warning.

Existing recruitment-domain and verified-payment integration limitations remain as documented in docs/platform-admin/HANDOFF.md. This update does not add those external integrations.
