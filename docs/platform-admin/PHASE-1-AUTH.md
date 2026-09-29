# Phase 1 — Shared Platform Authentication

## Implemented

A shared login flow now serves both `PLATFORM_SUPER_ADMIN` and `PLATFORM_ADMIN`.

### Backend

- `POST /api/v1/auth/platform/login`
  - validates email/password;
  - accepts only platform-level roles;
  - resolves Platform Admin permissions from `PlatformAdminProfile`;
  - issues a signed JWT;
  - creates a `PlatformSession` using a SHA-256 token hash;
  - writes a `PLATFORM_LOGIN` audit event.
- `GET /api/v1/auth/me`
  - returns authenticated server-resolved identity and permissions.
- `POST /api/v1/auth/logout`
  - revokes the current `PlatformSession`;
  - writes a `PLATFORM_LOGOUT` audit event.
- `JwtAuthGuard` now verifies that the bearer token belongs to a non-revoked, non-expired server-side session.

### Frontend

- Shared `/platform/login` page for Platform Super Admin and Platform Admin.
- Real authentication state replaces the previous hard-coded Super Admin session and Dev Role Simulator.
- Access token is held in `sessionStorage` and attached by the shared Axios API client.
- App startup calls `/auth/me` to restore/validate the session.
- `/platform/*` is authentication-protected.
- Existing feature routes are permission-protected.
- `/platform/admins` and `/platform/settings` remain Super Admin-only in the current implementation.
- A dedicated Access Denied page handles unauthorized route navigation.

### Development mock safety

Existing platform mock fallback is now opt-in with `VITE_ENABLE_MOCK_FALLBACK=true`. HTTP 401/403 responses never fall back to fake successful data.

## Notes

- No separate Admin/Super Admin login applications were created.
- No existing Super Admin business service was duplicated.
- Production hardening may later move the bearer token to an HttpOnly-cookie/refresh-token flow if that becomes the approved security architecture.
