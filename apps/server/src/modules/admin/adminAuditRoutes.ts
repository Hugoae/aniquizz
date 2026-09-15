import type { Router } from 'express';
import type { StaffAuditAction } from '@aniquizz/database';
import { listStaffAudit, STAFF_AUDIT_ACTIONS } from './adminAuditService';
import { staff, wrap } from './adminHttp';

const isAuditAction = (value: string): value is StaffAuditAction =>
  (STAFF_AUDIT_ACTIONS as readonly string[]).includes(value);

export function registerAdminAuditRoutes(router: Router): void {
  router.get(
    '/audit',
    ...staff('MODERATOR'),
    wrap(async (req, res) => {
      const page = req.query.page ? Number(req.query.page) : 1;
      const actionRaw = typeof req.query.action === 'string' ? req.query.action : undefined;
      const action = actionRaw && isAuditAction(actionRaw) ? actionRaw : undefined;
      res.json(
        await listStaffAudit({
          page: Number.isFinite(page) ? page : 1,
          action,
        }),
      );
    }),
  );
}
