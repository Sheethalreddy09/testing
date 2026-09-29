# Setup and migration

Use Node.js 22 or 24, npm, and a PostgreSQL database. Validation used Node 24.
Commands below assume a terminal at the extracted project root. Start two terminals
for the backend and frontend. Dependencies and builds are excluded from the ZIP.

## Backend: new empty database

```bash
cd backend
npm ci
```

Copy `.env.example` to `.env` (PowerShell: `Copy-Item .env.example .env`). Set:

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/clyptus
JWT_SECRET=YOUR_UNIQUE_RANDOM_SECRET_AT_LEAST_32_CHARACTERS
JWT_EXPIRES_IN=1d
PORT=3000
CORS_ORIGIN=http://localhost:5173
SEED_SUPER_ADMIN_EMAIL=YOUR_ADMIN_EMAIL
SEED_SUPER_ADMIN_PASSWORD=YOUR_UNIQUE_PASSWORD_AT_LEAST_12_CHARACTERS
```

```bash
npx prisma generate
npx prisma migrate deploy
npx ts-node prisma/seed.ts
npm run start:dev
```

The seed creates the initial Super Admin if absent and retains the original sample
plans/settings. It does not replace an existing administrator's password. It now
requires operator-provided credentials instead of a shared default password.

API: `http://localhost:3000/api/v1`. Swagger: `http://localhost:3000/api/docs`.

## Existing database from the uploaded project

The uploaded ZIP had a Prisma schema but no migrations. This package supplies:

1. `202609290001_baseline`: the original schema.
2. `202609290002_platform_operations`: additive models, enum values, ledger checks.

Back up the database. Confirm that its current schema matches the original baseline.
If the original tables already exist and match, register the baseline WITHOUT
executing its table-creation SQL:

```bash
npx prisma migrate resolve --applied 202609290001_baseline
npx prisma migrate deploy
npx prisma generate
```

Do not run the baseline against existing tables. If your team's database already has
its own migration history, merge the additive migration into that history instead.
Do not use `migrate reset`. Existing invalid token balances/ledger arithmetic must
be reconciled through approved accounting before adding the CHECK constraints;
this package does not silently rewrite historical transactions.

## Frontend

In a second terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open `http://localhost:5173/platform/login`. Vite proxies `/api` to port 3000.
For deployment, set `VITE_API_URL` to the actual API base, including `/api/v1`, and
configure the host to serve `index.html` for React client routes. No demo login or
mock fallback is enabled. A production backend refuses the original default JWT secret.

## Create or update a Platform Admin

Sign in as the Platform Super Admin. Open Platform Admins, create an Admin, and
select permissions. Existing Admin permissions can be edited on that same page.
The backend remains the final authority; granting settings/admin-management strings
does not override Super-Admin-only role restrictions. Ask the Admin to sign out and
back in after changing permissions so the navigation reflects the new grants.

Common operational permissions include organization read/create/update/verify/reject,
member/activity read, users read/suspend/reactivate, tokens read/adjust/allocate,
support read/manage/escalate, notifications read, analytics read, audit read, and
reports generate/export plus each report's source-data read permission.

## Validation commands

```bash
# backend
npm run typecheck
npm run build
npm test -- --runInBand
npx prisma validate
npx prisma generate
# frontend
npm run typecheck
npm run build
npm test
```

The original backend lint command references ESLint, but the uploaded project contains
neither ESLint nor a configuration. It remains an identified tooling gap.
