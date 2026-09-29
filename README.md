# Clyptus shared Platform Portal

Platform Admin implementation on the existing Platform Super Admin foundation.
One React application, one NestJS application, shared authentication, permissions,
Prisma models and organization/token/audit services. No second platform was created.

Start with `docs/platform-admin/SETUP.md`. The full requirement checklist and
integration boundaries are in `docs/platform-admin/HANDOFF.md`.

- `frontend/`: React, TypeScript, Vite, Tailwind, React Query, React Hook Form, Zustand.
- `backend/`: NestJS, PostgreSQL, Prisma, JWT sessions, shared operational services.
- `docs/platform-admin/REQUIREMENTS.txt`: exact supplied requirements.
- `docs/platform-admin/CHANGES.json`: file-by-file changes against the uploaded ZIP.
- `docs/platform-admin/VALIDATION.md`: actual checks and limits of validation.

Jobs/recruitment and verified payment reporting need adapters supplied by the owning
teams. The UI reports these domains as unavailable; it does not invent production data.
