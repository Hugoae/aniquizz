import { prisma, type StaffAuditAction, type UserRole } from '@aniquizz/database';
import { logger } from '../../utils/logger';

const PAGE_SIZE = 50;

export const STAFF_AUDIT_ACTIONS = [
  'MUTE',
  'UNMUTE',
  'BAN',
  'UNBAN',
  'ROLE_CHANGE',
  'DISCONNECT',
] as const satisfies readonly StaffAuditAction[];

export async function recordStaffAudit(input: {
  actorId: string;
  actorUsername: string;
  targetId: string;
  action: StaffAuditAction;
  durationMinutes?: number | null;
  fromRole?: UserRole | null;
  toRole?: UserRole | null;
}): Promise<void> {
  try {
    const target = await prisma.profile.findUnique({
      where: { id: input.targetId },
      select: { username: true },
    });
    await prisma.staffAuditLog.create({
      data: {
        actorId: input.actorId,
        actorUsername: input.actorUsername,
        targetId: input.targetId,
        targetUsername: target?.username ?? input.targetId,
        action: input.action,
        durationMinutes: input.durationMinutes ?? null,
        fromRole: input.fromRole ?? null,
        toRole: input.toRole ?? null,
      },
    });
  } catch (e) {
    logger.error('Failed to record staff audit', 'Admin', e);
  }
}

export async function listStaffAudit(opts: { page?: number; action?: StaffAuditAction }) {
  const page = Math.max(1, opts.page ?? 1);
  const where = opts.action ? { action: opts.action } : {};
  const [rows, total] = await Promise.all([
    prisma.staffAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        actorId: true,
        actorUsername: true,
        targetId: true,
        targetUsername: true,
        action: true,
        durationMinutes: true,
        fromRole: true,
        toRole: true,
        createdAt: true,
      },
    }),
    prisma.staffAuditLog.count({ where }),
  ]);

  return {
    entries: rows,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}
