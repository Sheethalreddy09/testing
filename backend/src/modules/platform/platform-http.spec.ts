import { Test } from '@nestjs/testing';
import { ValidationPipe, UnauthorizedException } from '@nestjs/common';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../database/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TransformInterceptor } from '../../common/interceptors/transform.interceptor';
describe('Platform HTTP authorization and validation', () => {
  let app: any, url: string, permissions: string[];
  beforeAll(async () => {
    const prisma: any = {
      user: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
      notification: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      organisation: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: any) {
          const r = context.switchToHttp().getRequest();
          if (!r.headers['x-test-auth']) throw new UnauthorizedException();
          r.user = {
            userId: 'admin',
            role: 'PLATFORM_ADMIN',
            permissions,
            email: 'a@test.invalid',
          };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
  });
  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    permissions = [];
  });
  const call = (path: string, method = 'GET', body?: any, auth = true) =>
    fetch(url + path, {
      method,
      headers: { ...(auth ? { 'x-test-auth': 'yes' } : {}), 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  it('requires authentication', async () => {
    expect((await call('/platform/users', 'GET', undefined, false)).status).toBe(401);
  });
  it('rejects missing read permission', async () => {
    expect((await call('/platform/users')).status).toBe(403);
  });
  it('permits scoped user listing and pagination', async () => {
    permissions = ['platform.users.read'];
    const res = await call('/platform/users?page=2&limit=5');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      success: true,
      data: [],
      meta: { page: 2, limit: 5 },
    });
  });
  it('rejects malformed pagination', async () => {
    permissions = ['platform.users.read'];
    expect((await call('/platform/users?page=-1')).status).toBe(400);
  });
  it('rejects a Platform Admin accessing system settings even with settings permission', async () => {
    permissions = ['platform.settings.read'];
    expect((await call('/platform/settings')).status).toBe(403);
  });
  it('rejects self promotion through the existing admins endpoint', async () => {
    permissions = ['platform.admins.create'];
    expect((await call('/platform/admins', 'POST', { role: 'PLATFORM_SUPER_ADMIN' })).status).toBe(
      403,
    );
  });
  it('blocks token mutation without explicit permission', async () => {
    expect((await call('/platform/tokens/adjust', 'POST', {})).status).toBe(403);
  });
  it('validates verification decisions before execution', async () => {
    permissions = ['platform.organisations.verify'];
    expect(
      (
        await call('/platform/organisations/o/verification', 'POST', {
          decision: 'SKIP',
          reason: 'no',
        })
      ).status,
    ).toBe(400);
  });
  it('keeps unread count in the API envelope', async () => {
    permissions = ['platform.notifications.read'];
    const res = await call('/platform/notifications');
    expect(await res.json()).toMatchObject({ unread: 0, data: [] });
  });
  it('exposes unavailable jobs honestly', async () => {
    permissions = ['platform.jobs.read', 'platform.moderation.read'];
    const res = await call('/platform/moderation/jobs');
    expect(await res.json()).toMatchObject({ available: false, data: [] });
  });
  it('prevents permission bypass using CSV export', async () => {
    permissions = ['platform.reports.export', 'platform.reports.generate'];
    expect((await call('/platform/reports/users/export')).status).toBe(403);
  });
  it('has no audit mutation routes', async () => {
    permissions = ['platform.audit.read'];
    expect((await call('/platform/audit-logs', 'DELETE')).status).toBe(404);
  });
});
