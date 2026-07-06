// Shared user-role vocabulary and hierarchy, mirrored from the Prisma `UserRole`
// enum. Kept dependency-free so both client and server can reason about roles.

export type UserRole = 'USER' | 'MODERATOR' | 'ADMIN';

/** Higher number = more privileges. */
const ROLE_RANK: Record<UserRole, number> = {
  USER: 0,
  MODERATOR: 1,
  ADMIN: 2,
};

/** True when `role` has at least the privileges of `minimum`. */
export const hasRole = (role: UserRole | null | undefined, minimum: UserRole): boolean => {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
};

export const isStaff = (role: UserRole | null | undefined): boolean => hasRole(role, 'MODERATOR');
export const isAdmin = (role: UserRole | null | undefined): boolean => hasRole(role, 'ADMIN');
