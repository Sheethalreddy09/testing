import { AuditService } from "./audit.service";
describe("Readable audit search and bounded pagination", () => {
  const prisma: any = {
    auditLog: {
      count: jest.fn().mockResolvedValue(500),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  const service = new AuditService(prisma);
  beforeEach(() => jest.clearAllMocks());
  it("returns only the requested 20-row page with a full count", async () => {
    expect((await service.findAuditLogs({ page: 2 })).meta).toEqual({
      page: 2,
      limit: 20,
      total: 500,
      totalPages: 25,
    });
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 20 }),
    );
  });
  it("searches people, organizations and friendly activity names", async () => {
    await service.findAuditLogs({
      search: "signed in",
      entityType: "PLATFORM_SESSION",
    });
    const where = prisma.auditLog.findMany.mock.calls[0][0].where;
    expect(where.entityType).toBe("PLATFORM_SESSION");
    expect(where.OR).toContainEqual({ action: { in: ["PLATFORM_LOGIN"] } });
    expect(where.OR).toContainEqual({
      actor: { is: { email: { contains: "signed in", mode: "insensitive" } } },
    });
    expect(where.OR).toContainEqual({
      organisation: {
        is: { name: { contains: "signed in", mode: "insensitive" } },
      },
    });
  });
});
