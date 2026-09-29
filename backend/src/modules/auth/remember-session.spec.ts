import { Test } from "@nestjs/testing";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { createHash } from "crypto";
import * as bcrypt from "bcryptjs";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../../database/prisma.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

describe("Remembered platform sessions over HTTP", () => {
  let app: any, url: string, user: any;
  const sessions = new Map<string, any>();
  const hash = (token: string) =>
    createHash("sha256").update(token).digest("hex");
  beforeAll(async () => {
    user = {
      id: "admin",
      email: "admin@example.test",
      firstName: "Example",
      lastName: "Admin",
      passwordHash: await bcrypt.hash("StrongPassword!123", 4),
      role: "PLATFORM_ADMIN",
      isActive: true,
      platformAdminProfile: {
        isActive: true,
        permissions: ["platform.audit.read"],
      },
    };
    const prisma = {
      user: { findUnique: async () => user },
      platformSession: {
        create: async ({ data }: any) => {
          const row = { ...data, id: data.tokenHash };
          sessions.set(row.tokenHash, row);
          return row;
        },
        findUnique: async ({ where }: any) => sessions.get(where.tokenHash),
        update: async ({ where, data }: any) =>
          Object.assign(sessions.get(where.id), data),
      },
      securityEvent: { create: async () => ({}) },
    };
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        JwtAuthGuard,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { record: async () => {} } },
        { provide: JwtService, useValue: new JwtService() },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, fallback: any) =>
              key === "jwt.secret"
                ? "test-key-only-for-remembered-session-checks"
                : fallback,
          },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.listen(0, "127.0.0.1");
    url = await app.getUrl();
  });
  afterAll(async () => app?.close());
  beforeEach(() => {
    sessions.clear();
    user.isActive = true;
  });
  const login = (rememberMe: any = true, expectedRole = "PLATFORM_ADMIN") =>
    fetch(url + "/auth/platform/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user.email,
        password: "StrongPassword!123",
        rememberMe,
        expectedRole,
      }),
    });
  it("sets a 30-day HttpOnly cookie, restores from it, and revokes it on logout", async () => {
    const response = await login();
    expect(response.status).toBe(200);
    const cookie = response.headers.get("set-cookie")!;
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toMatch(/Max-Age=259199[89]/);
    const result: any = await response.json();
    const headers = {
      Cookie: cookie.split(";")[0],
      "X-Requested-With": "XMLHttpRequest",
      Origin: "http://localhost:5173",
    };
    expect((await fetch(url + "/auth/me", { headers })).status).toBe(200);
    const logout = await fetch(url + "/auth/logout", {
      method: "POST",
      headers,
    });
    expect(logout.status).toBe(200);
    expect(logout.headers.get("set-cookie")).toContain(
      "Expires=Thu, 01 Jan 1970",
    );
    expect(sessions.get(hash(result.accessToken)).revokedAt).toBeTruthy();
    expect((await fetch(url + "/auth/me", { headers })).status).toBe(401);
  });
  it("rejects cookie writes without verification or from an untrusted origin", async () => {
    const response = await login();
    const Cookie = response.headers.get("set-cookie")!.split(";")[0];
    expect(
      (
        await fetch(url + "/auth/logout", {
          method: "POST",
          headers: { Cookie },
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await fetch(url + "/auth/logout", {
          method: "POST",
          headers: {
            Cookie,
            "X-Requested-With": "XMLHttpRequest",
            Origin: "https://untrusted.example",
          },
        })
      ).status,
    ).toBe(403);
  });
  it("rejects expired sessions and deactivated accounts even with a remembered cookie", async () => {
    const response = await login();
    const headers = {
      Cookie: response.headers.get("set-cookie")!.split(";")[0],
    };
    const result: any = await response.json();
    user.isActive = false;
    expect((await fetch(url + "/auth/me", { headers })).status).toBe(401);
    user.isActive = true;
    sessions.get(hash(result.accessToken)).expiresAt = new Date(0);
    expect((await fetch(url + "/auth/me", { headers })).status).toBe(401);
  });
  it("clears the persistent cookie when unchecked and retains ordinary bearer login", async () => {
    const response = await login(false);
    const result: any = await response.json();
    expect(response.headers.get("set-cookie")).toContain(
      "Expires=Thu, 01 Jan 1970",
    );
    expect(
      (
        await fetch(url + "/auth/me", {
          headers: { Authorization: `Bearer ${result.accessToken}` },
        })
      ).status,
    ).toBe(200);
    const lifetime = new Date(result.expiresAt).getTime() - Date.now();
    expect(lifetime).toBeLessThanOrEqual(86400000);
  });
  it("does not issue a cookie for a mismatched role or invalid boolean", async () => {
    const wrongRole = await login(true, "PLATFORM_SUPER_ADMIN");
    expect(wrongRole.status).toBe(401);
    expect(wrongRole.headers.get("set-cookie")).toBeNull();
    expect((await login("false")).status).toBe(400);
    expect(sessions.size).toBe(0);
  });
});
