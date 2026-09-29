import { ForbiddenException } from '@nestjs/common';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';
export const can = (actor: AuthenticatedUser, permission: string) =>
  actor.role === 'PLATFORM_SUPER_ADMIN' ||
  (actor.role === 'PLATFORM_ADMIN' && (actor.permissions || []).includes(permission));
export function requirePermission(actor: AuthenticatedUser, permission: string) {
  if (!can(actor, permission)) throw new ForbiddenException(`Missing permission: ${permission}`);
}
export const publicUser = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  organisationId: true,
  createdAt: true,
} as const;
export const ordinaryRoles = [
  'CANDIDATE',
  'RECRUITER',
  'ORGANISATION_ADMIN',
  'ORGANISATION_SUPER_ADMIN',
] as const;
