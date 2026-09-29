import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { NotificationCategory, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PlatformQueryDto, pagination, paged } from '../../common/dto/platform-query.dto';
@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}
  static async deliver(
    tx: Prisma.TransactionClient,
    recipientId: string,
    category: NotificationCategory,
    title: string,
    entityType: string,
    entityId: string,
  ) {
    return tx.notification.create({ data: { recipientId, category, title, entityType, entityId } });
  }
  static async publish(
    tx: Prisma.TransactionClient,
    permission: string,
    category: NotificationCategory,
    title: string,
    entityType: string,
    entityId: string,
  ) {
    const users = await tx.user.findMany({
      where: {
        isActive: true,
        OR: [
          { role: 'PLATFORM_SUPER_ADMIN' },
          {
            role: 'PLATFORM_ADMIN',
            platformAdminProfile: { isActive: true, permissions: { has: permission } },
          },
        ],
      },
      select: { id: true },
    });
    if (users.length)
      await tx.notification.createMany({
        data: users.map((u) => ({
          recipientId: u.id,
          requiredPermission: permission,
          category,
          title,
          entityType,
          entityId,
        })),
      });
  }
  private scope(a: AuthenticatedUser) {
    return {
      recipientId: a.userId,
      ...(a.role === 'PLATFORM_SUPER_ADMIN'
        ? {}
        : { OR: [{ requiredPermission: null }, { requiredPermission: { in: a.permissions } }] }),
    };
  }
  async list(a: AuthenticatedUser, q: PlatformQueryDto) {
    if (
      q.category &&
      !Object.values(NotificationCategory).includes(q.category as NotificationCategory)
    )
      throw new BadRequestException('Invalid category');
    const where = {
      ...this.scope(a),
      ...(q.unread === 'true' ? { readAt: null } : {}),
      ...(q.category ? { category: q.category as NotificationCategory } : {}),
      ...(q.search ? { title: { contains: q.search, mode: 'insensitive' as const } } : {}),
    };
    const [data, total, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        ...pagination(q),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { ...this.scope(a), readAt: null } }),
    ]);
    return { ...paged(data, total, q), unread };
  }
  async read(a: AuthenticatedUser, id: string) {
    const result = await this.prisma.notification.updateMany({
      where: { ...this.scope(a), id },
      data: { readAt: new Date() },
    });
    if (!result.count) throw new NotFoundException('Notification not found');
    return { id, read: true };
  }
}
