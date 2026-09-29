Clyptus Platform Portal

A shared platform portal for the Clyptus Job Portal, with separate Platform Super Admin and Platform Admin login pages. Super Admin manages platform administrators and their permissions; Admin handles the operations assigned to their account.

The project uses one React frontend and one NestJS backend. Both roles share the landing page, database, authentication services and platform APIs.

Quick start — existing setup

If dependencies are installed and your database and environment files are already configured, keep PostgreSQL running and open two PowerShell terminals at the project root.

Terminal 1 — backend

cd .\backend
npm run start:dev

Terminal 2 — frontend

cd .\frontend
npm run dev

Service

Local URL

Shared landing page

http://localhost:5173/

Super Admin login

http://localhost:5173/platform/login/super-admin

Admin login

http://localhost:5173/platform/login/admin

Backend API

http://localhost:3000/api/v1

Swagger API documentation

http://localhost:3000/api/docs

These URLs assume the default frontend and backend ports. Check the terminal output if either port has changed.

Technology stack

Layer

Technologies

Frontend

React, TypeScript, Vite, React Router

UI

Authored CSS, Tailwind CSS, Lucide React, Recharts

State and forms

TanStack Query, Zustand, React Hook Form, Zod

Backend

NestJS, TypeScript, REST APIs

Database

PostgreSQL, Prisma ORM

Authentication

JWT, bcrypt password hashes, server-backed sessions

Tests

Jest, Vitest, React Testing Library

Redis, queues, email, storage, AI and payment configuration placeholders exist in the broader project. Their presence does not mean those integrations are connected.

Project structure

clyptus-platform/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── src/
│   │   ├── common/
│   │   ├── config/
│   │   ├── database/
│   │   └── modules/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── features/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── store/
│   │   └── styles/
│   └── package.json
├── docs/
│   ├── admin-ux/
│   ├── frontend-style/
│   └── platform-admin/
├── scripts/
└── README.md

First-time local setup

1. Prerequisites

Node.js 22 or 24 and npm. The latest recorded validation used Node.js 24.

A running PostgreSQL database, either local or in Docker.

The extracted project or your existing checkout.

Use your existing Docker configuration. The following steps do not replace containers or database volumes.

2. Install backend dependencies

From the project root:

cd .\backend
npm ci

3. Configure the backend environment

Create backend/.env only if it does not already exist. If the supplied template is available:

if (-not (Test-Path .env)) { Copy-Item .env.example .env }

If your Git checkout does not contain .env.example, create backend/.env manually with the required values below. Replace the placeholders before starting the backend.

NODE_ENV=development
PORT=3000
API_PREFIX=/api/v1
CORS_ORIGIN=http://localhost:5173

DATABASE_URL="postgresql://postgres:postgres@localhost:5434/clyptus_recruitment?schema=public"

JWT_SECRET="REPLACE_WITH_A_UNIQUE_RANDOM_SECRET_OF_AT_LEAST_32_CHARACTERS"
JWT_EXPIRES_IN=1d

SEED_SUPER_ADMIN_EMAIL="your-super-admin-email@example.com"
SEED_SUPER_ADMIN_PASSWORD="REPLACE_WITH_YOUR_OWN_PASSWORD_OF_AT_LEAST_12_CHARACTERS"

The database URL above assumes your Docker mapping is 5434:5432 and uses the local PostgreSQL credentials shown. Match the username, password, database and host port to your actual setup. Use port 5432 if that is your exposed host port. The schema suffix must be exactly ?schema=public without extra quotation marks inside the URL.

.env contains the values used locally. .env.example is only a template; editing it does not configure the application. Keep existing .env values when applying source updates.

4. Prepare a new, empty database

Run these commands from backend/:

npx prisma generate
npx prisma migrate deploy
node --env-file=.env -r ts-node/register prisma/seed.ts

The seed command explicitly loads backend/.env. It creates the initial Super Admin, starter token plans and initial platform settings. Plan descriptions are sample configuration and do not enable external recruitment or payment integrations.

For an existing database: follow Setup and migration before applying migrations. A database with existing tables may need its migration baseline recorded first. Do not use prisma migrate reset to apply this update.

The latest audit/login/permission UI update introduces no additional database migration if the preceding platform operations migrations are already applied.

5. Start the backend

npm run start:dev

6. Install and start the frontend

Open another terminal at the project root:

cd .\frontend
npm ci
npm run dev

For local development, a frontend .env is optional. Without it, the API client uses /api/v1, and Vite forwards /api requests to the backend on port 3000.

To configure it explicitly, create frontend/.env:

VITE_API_URL=/api/v1

Restart Vite after changing frontend environment values.

Login and account management

Super Admin

Open the shared landing page and select Super Admin Login.

Sign in with the email and password used during the initial seed.

Open Platform Admins to create an Admin account.

Enter the Admin's details and choose their allowed permissions.

There is no universal built-in password. Credentials come from your database and initial seed configuration. Re-running the seed does not reset the password of an existing Super Admin.

Platform Admin

Open the shared landing page and select Admin Login.

Use the credentials created by the Super Admin.

Available navigation and actions depend on assigned permissions.

The backend checks the stored account role against the selected login page. Selecting Super Admin Login does not grant Super Admin access.

Remember me

Both login pages include an optional Remember me checkbox.

Keeps the account signed in on that browser for up to 30 days.

Uses an HttpOnly server-issued cookie; passwords are not stored in browser storage.

Checks session validity, account status and current permissions on the server.

Logout revokes the session and clears the cookie.

Clearing browser storage, expiration or server-side revocation requires signing in again.

Ordinary sign-in retains the existing sessionStorage bearer-token flow. Production remembered cookies require HTTPS and a compatible same-site frontend/API setup.

Assigning Admin permissions

Super Admin can assign permissions while creating an Admin and edit them later through Permissions on the Platform Admins page.

The permission table groups actions by feature, uses readable labels, provides search and shows the number enabled. Select the required checkboxes and choose Save changes.

Some operations require both permission to view a dataset and permission to change it. Report exports also require the source-data permission. Admin-account management and critical platform settings remain restricted to Super Admin.

After changing permissions, ask the Admin to sign out and back in so navigation reflects the new access. The backend remains the authority for each request.

Platform Admin features

Area

Current coverage

Dashboard

Permission-filtered organization/user counts, token balances and usage, operational summaries, recent activity

Organization management

Create, search, view, update, verify, reject, suspend, reactivate, deactivate, members and activity

Organization onboarding

Initial administrator invitation, provisioning and onboarding status

Organization monitoring

Status, members, activity and token usage; recruitment data needs its adapter

Token operations

Packages, balances, transactions, authorized adjustments and allocation limits

Token administration

Package updates, organization/feature usage and read-only discrepancy review

Job moderation

Moderation UI, history and API contracts; live job operations need the shared Jobs adapter

Organization verification

Approve, reject, request information and review decision history

User administration

Search/filter non-platform users and authorized suspension/reactivation

Analytics

Local organization/user/token/support/moderation data; recruitment funnel needs integration

Support

Cases, messages, assignment, escalation and status tracking

Notifications

Recipient- and permission-filtered alerts; payment alerts await their producer

Audit logs

Read-only history, readable details, search, category filtering and pagination

Reports and exports

Permitted local reports and current-page CSV exports; recruitment reports need integration

For the detailed feature checklist and backend boundaries, see Platform Admin handoff.

Audit logs and large activity histories

The dashboard displays only the latest five events. View all activity opens the complete audit history, with 20 records per page and search/filter controls.

For example, 500 audit events occupy 25 pages; the number of organizations does not directly equal the number of audit events. Each organization may generate many events. Limiting the dashboard display does not delete history.

Audit rows show the activity, the person who performed it, the organization/item and the time. View details displays metadata as labelled fields and readable permission names instead of raw JSON. Technical references are collapsed separately.

Frontend design

The frontend follows the warm Clyptus style: off-white surfaces, restrained orange actions, dark typography, subtle borders and responsive layouts.

Design tokens: frontend/src/styles/variables.css

Active global styles: frontend/src/styles/globals.css

Body font: DM Sans, with system fallbacks

Heading font: Fraunces, with serif fallbacks

Icons: Lucide React

Desktop login: illustration and form in two columns

Mobile login: illustration stacked above the form

Reuse existing components and tokens. src/index.css and src/App.css are not the active styling source. See the Frontend style guide notes.

Builds and tests

Run from backend/:

npm run typecheck
npm run build
npm test -- --runInBand

Run from frontend/:

npm run typecheck
npm run build
npm test

Latest recorded checks for the Admin UX update:

Backend build passed; 75 tests passed across 10 suites.

Frontend build passed; 11 tests passed across 2 files.

Desktop/mobile browser checks passed for the login pages, bounded dashboard activity, audit pagination/details and permission editing.

Browser checks used mocked example API data, not the user's live database.

Frontend lint is not configured. The backend lint script exists, but its ESLint tooling/configuration remains a setup gap. Vite also reports a large-bundle warning.

Troubleshooting

Problem

What to check

'vite' is not recognized

Run npm ci inside frontend/, then npm run dev.

DATABASE_URL is missing

Create backend/.env; run Prisma commands from backend/.

PostgreSQL connection fails

Confirm the container/database is running and the URL uses the exposed host port.

Unterminated quoted identifier near public

Correct the URL suffix to ?schema=public; remove extra quotes inside the value.

Invalid email or password

Use the correct login page and the password actually stored for that account. Changing seed variables does not reset an existing password.

Seed variables are missing

Fill both seed values in backend/.env and use the explicit node --env-file=.env ... seed command above.

An Admin cannot see a page or perform an action

Review their permissions as Super Admin; check any required read permission and sign in again.

Remember me does not restore

Check cookies/site storage, session expiry and account status. In production, check HTTPS, API origin and CORS.

Recruitment or payment data is unavailable

Connect the corresponding domain adapter; these datasets are not supplied by the local platform database alone.

Frontend cannot connect to API

Ensure the backend runs on port 3000, check VITE_API_URL, and restart Vite after environment changes.

Integration boundaries

The following work remains with the corresponding domain owners:

RecruitmentPort: live Jobs, Applications, Interviews, Offers, recruitment reporting and job moderation mutations.

PaymentReportingPort: verified monetary sales and purchase reporting. Manual token allocations are not payment revenue.

Invitation email delivery: invitations currently produce a one-time link for manual delivery; automatic email delivery is not connected.

Other infrastructure stubs, including search, queues, storage and AI, require their own integration work.

Notifications use polling rather than a live WebSocket stack. CSV export downloads the current page, up to 20 rows in the UI.

Git and environment files

The supplied .gitignore excludes dependencies, build output, coverage, logs, .env and .env.*, including .env.example, as requested for this project. A file already tracked by Git stays tracked until explicitly removed from the index.

Keep real passwords, JWT secrets and provider keys out of commits. Environment examples in a downloaded package are setup references only.

Further documentation

Setup and migrations

Feature coverage and integration handoff

Separate login pages

Frontend style notes

Latest Admin UX update and checks

The latest Admin UX notes supersede older authentication and browser-validation descriptions in the earlier handoff.
