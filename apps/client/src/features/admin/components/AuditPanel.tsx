import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  adminApi,
  AdminApiError,
  type StaffAuditAction,
  type StaffAuditEntry,
} from '@/lib/adminApi';
import { ADMIN_COPY, formatStaffDuration } from '@/features/admin/copy/adminCopy';
import { UsersPagination } from '@/features/admin/components/UsersPagination';

const errorMessage = (e: unknown): string =>
  e instanceof AdminApiError ? e.message : ADMIN_COPY.genericError;

const ACTION_FILTERS: { key: StaffAuditAction | 'all'; label: string }[] = [
  { key: 'all', label: ADMIN_COPY.audit.allActions },
  { key: 'MUTE', label: ADMIN_COPY.audit.actions.MUTE },
  { key: 'UNMUTE', label: ADMIN_COPY.audit.actions.UNMUTE },
  { key: 'BAN', label: ADMIN_COPY.audit.actions.BAN },
  { key: 'UNBAN', label: ADMIN_COPY.audit.actions.UNBAN },
  { key: 'ROLE_CHANGE', label: ADMIN_COPY.audit.actions.ROLE_CHANGE },
  { key: 'DISCONNECT', label: ADMIN_COPY.audit.actions.DISCONNECT },
];

const formatWhen = (iso: string): string =>
  new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

const detailFor = (entry: StaffAuditEntry): string => {
  if (entry.action === 'ROLE_CHANGE' && entry.fromRole && entry.toRole) {
    return `${entry.fromRole} → ${entry.toRole}`;
  }
  if (entry.action === 'MUTE' || entry.action === 'BAN') {
    return formatStaffDuration(entry.durationMinutes);
  }
  return formatStaffDuration(entry.durationMinutes);
};

export function AuditPanel({ onOpenUser }: { onOpenUser: (userId: string) => void }) {
  const [entries, setEntries] = useState<StaffAuditEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [action, setAction] = useState<StaffAuditAction | 'all'>('all');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (nextPage: number, nextAction: StaffAuditAction | 'all') => {
    setLoading(true);
    try {
      const res = await adminApi.listAudit({
        page: nextPage,
        action: nextAction === 'all' ? undefined : nextAction,
      });
      setEntries(res.entries);
      setPage(res.page);
      setTotalPages(res.totalPages);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(page, action);
  }, [load, page, action]);

  return (
    <div className="space-y-4">
      <h2 className="font-semibold">{ADMIN_COPY.audit.title}</h2>
      <div className="flex flex-wrap gap-2">
        {ACTION_FILTERS.map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={action === f.key ? 'default' : 'outline'}
            className={cn('rounded-full', action !== f.key && 'border-border')}
            onClick={() => {
              setAction(f.key);
              setPage(1);
            }}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {loading && entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">{ADMIN_COPY.audit.load}</p>
      ) : entries.length === 0 ? (
        <p className="glass-card p-6 text-center text-sm text-muted-foreground">
          {ADMIN_COPY.audit.empty}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">{ADMIN_COPY.audit.date}</th>
                <th className="py-2 pr-3 font-medium">{ADMIN_COPY.audit.actor}</th>
                <th className="py-2 pr-3 font-medium">{ADMIN_COPY.audit.action}</th>
                <th className="py-2 pr-3 font-medium">{ADMIN_COPY.audit.target}</th>
                <th className="py-2 font-medium">{ADMIN_COPY.audit.duration}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-border/60">
                  <td className="whitespace-nowrap py-2 pr-3 text-muted-foreground">
                    {formatWhen(entry.createdAt)}
                  </td>
                  <td className="py-2 pr-3">{entry.actorUsername}</td>
                  <td className="py-2 pr-3">{ADMIN_COPY.audit.actions[entry.action]}</td>
                  <td className="py-2 pr-3">
                    {entry.targetId ? (
                      <button
                        type="button"
                        className="text-primary hover:underline"
                        onClick={() => onOpenUser(entry.targetId!)}
                      >
                        {entry.targetUsername}
                      </button>
                    ) : (
                      entry.targetUsername
                    )}
                  </td>
                  <td className="py-2 text-muted-foreground">{detailFor(entry)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <UsersPagination
        page={page}
        totalPages={totalPages}
        onPageChange={(p) => {
          setPage(p);
        }}
      />
    </div>
  );
}
