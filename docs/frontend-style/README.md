# Clyptus frontend style update

## Scope

Applies the supplied warm Clyptus style guide to the shared landing page, both
separate login pages, Admin/Super Admin shell, shared operation tables/forms,
metrics, dialogs, token packages, settings, audit, security and analytics charts.
Routes, permissions, API calls, credential validation and the database schema
remain unchanged. Mobile navigation now closes after selecting a destination.

## Design source of truth

- `src/styles/variables.css`: supplied color tokens, fonts, and shared semantic colors.
- `src/styles/globals.css`: imports Google Fonts, variables and Tailwind, then defines
  shared buttons, form controls, containers, layout and page-specific auth styles.
- `src/main.tsx`: imports globals.css. Old index.css is retired and not imported.
- `tailwind.config.ts`: maps semantic utility names to the CSS variables, with
  mobile/tablet breakpoints matching the guide.
- `src/components/common/Brand.tsx`: reuses the existing Lucide Sparkles mark.
- `src/components/platform/OperationsUI.tsx`: existing shared tables, forms and
  metrics reused with the new theme; no duplicate data or behavior layer.
- `src/assets/auth-workplace.svg`: new local architectural illustration. The input
  ZIP contained no auth illustration or image assets to reuse.

Primary accent remains #E8630A. Compact white action labels use the shared darker
orange --color-action (#bc4b00, white contrast approximately 5.07:1); hover uses
--color-action-hover. This retains the warm brand while keeping small labels legible.
DM Sans and Fraunces are requested from Google Fonts, with Segoe UI/sans-serif and
Georgia/serif fallbacks. Network failure does not make text unavailable.

The login pages retain their existing email/password fields. Remember Me and
Forgot Password were absent in the original app and were not added as nonfunctional
controls. No marquee or autoplay animation is introduced. Reduced motion disables
transitions and animations, while loading text remains visible.

## URLs

- `/` and `/platform/login`: shared portal selection landing.
- `/platform/login/admin`: Admin login.
- `/platform/login/super-admin`: Super Admin login.
- `/platform`: existing role/permission-controlled dashboard.

## Applying the update

Stop the frontend. Copy the updated frontend source, tailwind.config.ts and
index.html into your existing project, retaining your local environment files,
node_modules, Docker configuration and Git history. See CHANGED-FILES.json for
an exact list relative to the preceding separate-login-pages package.
No dependency installation, database migration, seed, or password change is
required for the styling update. Start the frontend again with `npm run dev`.
The ZIP also includes the existing backend; no backend files changed in this turn.

## Validation

- `npm run build`: passed (includes TypeScript compilation).
- `npm test`: 9 tests passed in 2 suites, including separate login route navigation.
- `npm run lint`: attempted; unavailable because this frontend has no lint script
  or ESLint setup. No new lint dependency was introduced for a style-only update.
- Chromium/Playwright: 12 desktop/mobile captures at 1440x1000 and 390x844.
- Landing, both login pages, dashboard, organizations table and organization dialog
  inspected; no document horizontal overflow or browser runtime exceptions.
- Mobile drawer navigation, role-filtered navigation and reduced-motion fallback
  checked. Browser fixtures were used for authenticated API responses; the numbers
  visible in the previews are test data and are not added to application code.
- Browser checks do not verify live database integration or production login.
- Existing bundle-size and React Router future-flag warnings remain nonblocking.

Feature coverage remains as documented in docs/platform-admin/HANDOFF.md and
LOGIN-UPDATE.md. Recruitment/Jobs and verified-payment integrations are still
pending. This update changes their appearance, not integration availability.
