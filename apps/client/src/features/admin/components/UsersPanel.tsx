import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  adminApi,
  AdminApiError,
  type AdminUser,
  type UserListFilter,
  type UserListSort,
} from '@/lib/adminApi';
import type { AdminUsersListState } from '@/features/admin/adminNavigation';
import { useAuth } from '@/features/auth/context/AuthContext';
import { ADMIN_COPY } from '@/features/admin/copy/adminCopy';
import { AdminUserRow, type AdminUserRowPending } from '@/features/admin/components/AdminUserRow';
import { UsersPagination } from '@/features/admin/components/UsersPagination';
import { UsersPanelToolbar } from '@/features/admin/components/UsersPanelToolbar';

/** UI-facing errors are French; underlying API messages stay as the server sent. */
const errorMessage = (e: unknown): string =>
  e instanceof AdminApiError ? e.message : ADMIN_COPY.genericError;

type PendingConfirm = AdminUserRowPending;

type FilterKey = UserListFilter;
type SortKey = UserListSort;

function emptyUsersMessage(filter: FilterKey): string {
  switch (filter) {
    case 'muted':
      return ADMIN_COPY.users.empty.muted;
    case 'banned':
      return ADMIN_COPY.users.empty.banned;
    case 'online':
      return ADMIN_COPY.users.empty.online;
    case 'in_game':
      return ADMIN_COPY.users.empty.in_game;
    case 'moderators':
      return ADMIN_COPY.users.empty.moderators;
    case 'admins':
      return ADMIN_COPY.users.empty.admins;
    default:
      return ADMIN_COPY.users.empty.all;
  }
}

export function UsersPanel({
  canManage,
  onGoToRoom,
  initialListState,
  lookupUserId,
}: {
  canManage: boolean;
  onGoToRoom?: (roomId: string) => void;
  initialListState?: AdminUsersListState;
  lookupUserId?: string | null;
}) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState(lookupUserId ?? initialListState?.query ?? '');
  const [filter, setFilter] = useState<FilterKey>(initialListState?.filter ?? 'all');
  const [sortKey, setSortKey] = useState<SortKey>(initialListState?.sortKey ?? 'seen');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(initialListState?.sortDir ?? 'desc');
  const [page, setPage] = useState(initialListState?.page ?? 1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ online: 0, inGame: 0, banned: 0, muted: 0 });
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState(
    lookupUserId ?? initialListState?.query ?? '',
  );

  useEffect(() => {
    if (!lookupUserId) return;
    setQuery(lookupUserId);
    setDebouncedQuery(lookupUserId);
    setPage(1);
  }, [lookupUserId]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(
    async (opts?: {
      search?: string;
      page?: number;
      filter?: FilterKey;
      sort?: SortKey;
      sortDir?: 'asc' | 'desc';
    }) => {
      setLoading(true);
      try {
        const res = await adminApi.listUsers({
          query: opts?.search,
          page: opts?.page ?? 1,
          filter: opts?.filter ?? 'all',
          sort: opts?.sort ?? 'seen',
          sortDir: opts?.sortDir ?? 'desc',
        });
        setUsers(res.users);
        setPage(res.page);
        setTotalPages(res.totalPages);
        setTotal(res.total);
        setCounts(res.counts);
      } catch (e) {
        toast.error(errorMessage(e));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Fetch whenever page, filters, sort or debounced search changes.
  useEffect(() => {
    void load({
      search: debouncedQuery || undefined,
      page,
      filter,
      sort: sortKey,
      sortDir,
    });
  }, [debouncedQuery, page, filter, sortKey, sortDir, load]);

  // Poll the current view every 10 s (presence stays fresh). Pause when the tab is hidden.
  useEffect(() => {
    const tick = () => {
      if (document.hidden) return;
      void load({
        search: debouncedQuery || undefined,
        page,
        filter,
        sort: sortKey,
        sortDir,
      });
    };
    const id = setInterval(tick, 10_000);
    const onVis = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [debouncedQuery, page, filter, sortKey, sortDir, load]);

  const run = useCallback(
    async (fn: () => Promise<unknown>, successMsg: string) => {
      try {
        await fn();
        toast.success(successMsg);
        await load({
          search: debouncedQuery || undefined,
          page,
          filter,
          sort: sortKey,
          sortDir,
        });
      } catch (e) {
        toast.error(errorMessage(e));
      }
    },
    [debouncedQuery, page, filter, sortKey, sortDir, load],
  );

  const handleSetPending = useCallback((p: PendingConfirm) => setPending(p), []);
  const handleOpenDetail = useCallback(
    (u: AdminUser) => {
      if (u.id === profile?.id) return;
      navigate(`/profile/${u.id}`, {
        state: {
          returnTo: '/admin',
          admin: {
            tab: 'users',
            users: { page, filter, sortKey, sortDir, query: debouncedQuery },
          },
        },
      });
    },
    [navigate, page, filter, sortKey, sortDir, debouncedQuery, profile?.id],
  );

  const confirmPending = async () => {
    if (!pending) return;
    const { action, successMsg } = pending;
    setPending(null);
    await run(action, successMsg);
  };

  const toggleSort = (key: SortKey) => {
    setPage(1);
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'username' ? 'asc' : 'desc');
    }
  };

  return (
    <div className="space-y-3">
      <UsersPanelToolbar
        counts={counts}
        query={query}
        onQuery={setQuery}
        filter={filter}
        onFilter={(next) => {
          setFilter(next);
          setPage(1);
        }}
        sortKey={sortKey}
        sortDir={sortDir}
        onToggleSort={toggleSort}
      />

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <caption className="sr-only">{ADMIN_COPY.users.listCaption}</caption>
          <thead className="text-left text-xs text-muted-foreground border-b border-border">
            <tr>
              <th scope="col" className="px-3 py-2">
                Joueur
              </th>
              <th scope="col" className="px-3 py-2">
                Rôle
              </th>
              <th scope="col" className="px-3 py-2">
                Parties
              </th>
              <th scope="col" className="px-3 py-2">
                Salon
              </th>
              <th scope="col" className="px-3 py-2">
                Vu
              </th>
              <th scope="col" className="px-3 py-2">
                État
              </th>
              <th scope="col" className="px-3 py-2 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <AdminUserRow
                key={u.id}
                user={u}
                canManage={canManage}
                isSelf={u.id === profile?.id}
                onOpenDetail={handleOpenDetail}
                onGoToRoom={onGoToRoom}
                onSetPending={handleSetPending}
              />
            ))}
            {!users.length && !loading && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground">
                  {debouncedQuery ? ADMIN_COPY.users.empty.search : emptyUsersMessage(filter)}
                </td>
              </tr>
            )}
            {loading && !users.length && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="text-xs text-muted-foreground">
          {ADMIN_COPY.users.pageSummary(total, page, totalPages, users.length)}
        </p>
        <UsersPagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      <AlertDialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending?.title}</AlertDialogTitle>
            <AlertDialogDescription>{pending?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{ADMIN_COPY.users.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmPending()}
              className={pending?.destructive ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {pending?.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
