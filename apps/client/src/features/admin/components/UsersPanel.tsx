import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  adminApi,
  AdminApiError,
  type AdminUser,
  type Role,
  type UserListFilter,
  type UserListSort,
} from "@/lib/adminApi";
import type { AdminUsersListState } from "@/features/admin/adminNavigation";
import { useAuth } from "@/features/auth/context/AuthContext";
import { cn } from "@/lib/utils";
import {
  AdminUserRow,
  type AdminUserRowPending,
} from "@/features/admin/components/AdminUserRow";

/** Build a compact page-number list with ellipses (e.g. 1 … 4 5 6 … 12). */
const buildPageNumbers = (current: number, total: number): (number | "…")[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const nums = new Set(
    [1, total, current, current - 1, current + 1].filter((p) => p >= 1 && p <= total),
  );
  const sorted = [...nums].sort((a, b) => a - b);
  const result: (number | "…")[] = [];
  for (let i = 0; i < sorted.length; i += 1) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push("…");
    result.push(sorted[i]);
  }
  return result;
};

function UsersPagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages = buildPageNumbers(page, totalPages);
  return (
    <Pagination className="pt-2">
      <PaginationContent>
        <PaginationItem>
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            Précédent
          </Button>
        </PaginationItem>
        {pages.map((p, i) =>
          p === "…" ? (
            <PaginationItem key={`ellipsis-${i}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={p}>
              <Button
                variant={page === p ? "outline" : "ghost"}
                size="icon"
                className="h-9 w-9"
                onClick={() => onPageChange(p)}
              >
                {p}
              </Button>
            </PaginationItem>
          ),
        )}
        <PaginationItem>
          <Button
            variant="ghost"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Suivant
          </Button>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

/** UI-facing errors are French; underlying API messages stay as the server sent. */
const errorMessage = (e: unknown): string =>
  e instanceof AdminApiError ? e.message : "Une erreur est survenue.";

type PendingConfirm = AdminUserRowPending;

type FilterKey = UserListFilter;
type SortKey = UserListSort;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "players", label: "Joueurs" },
  { key: "online", label: "En ligne" },
  { key: "in_game", label: "En partie" },
  { key: "moderators", label: "Modérateurs" },
  { key: "admins", label: "Admins" },
  { key: "muted", label: "Mutés" },
  { key: "banned", label: "Bannis" },
];

const EMPTY_FILTER_MESSAGES: Partial<Record<FilterKey, string>> = {
  muted: "Aucun joueur muté actuellement.",
  banned: "Aucun joueur banni actuellement.",
  online: "Aucun joueur en ligne.",
  in_game: "Aucun joueur en partie.",
  moderators: "Aucun modérateur.",
  admins: "Aucun administrateur.",
};

const SORTS: { key: SortKey; label: string }[] = [
  { key: "username", label: "Pseudo" },
  { key: "xp", label: "XP" },
  { key: "games", label: "Parties" },
  { key: "created", label: "Inscription" },
  { key: "seen", label: "Activité" },
];

export function UsersPanel({
  canManage,
  onGoToRoom,
  initialListState,
}: {
  canManage: boolean;
  onGoToRoom?: (roomId: string) => void;
  initialListState?: AdminUsersListState;
}) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState(initialListState?.query ?? "");
  const [filter, setFilter] = useState<FilterKey>(initialListState?.filter ?? "all");
  const [sortKey, setSortKey] = useState<SortKey>(initialListState?.sortKey ?? "username");
  const [sortDir, setSortDir] = useState<"asc" | "desc">(initialListState?.sortDir ?? "asc");
  const [page, setPage] = useState(initialListState?.page ?? 1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ online: 0, inGame: 0, banned: 0, muted: 0 });
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState(initialListState?.query ?? "");

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(async (opts?: {
    search?: string;
    page?: number;
    filter?: FilterKey;
    sort?: SortKey;
    sortDir?: "asc" | "desc";
  }) => {
    setLoading(true);
    try {
      const res = await adminApi.listUsers({
        query: opts?.search,
        page: opts?.page ?? 1,
        filter: opts?.filter ?? "all",
        sort: opts?.sort ?? "username",
        sortDir: opts?.sortDir ?? "asc",
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
  }, []);

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

  // Poll the current view every 10 s (presence stays fresh).
  useEffect(() => {
    const id = setInterval(
      () =>
        void load({
          search: debouncedQuery || undefined,
          page,
          filter,
          sort: sortKey,
          sortDir,
        }),
      10_000,
    );
    return () => clearInterval(id);
  }, [debouncedQuery, page, filter, sortKey, sortDir, load]);

  const run = useCallback(async (fn: () => Promise<unknown>, successMsg: string) => {
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
  }, [debouncedQuery, page, filter, sortKey, sortDir, load]);

  const handleSetPending = useCallback((p: PendingConfirm) => setPending(p), []);
  const handleOpenDetail = useCallback((u: AdminUser) => {
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
  }, [navigate, page, filter, sortKey, sortDir, debouncedQuery, profile?.id]);
  const handleRoleChange = useCallback(
    (userId: string, role: Role) => {
      void run(() => adminApi.setRole(userId, role), "Rôle mis à jour.");
    },
    [run],
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
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "username" ? "asc" : "desc");
    }
  };

  return (
    <div className="space-y-4">
      {/* Counters */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-success" /> {counts.online} en ligne
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary" /> {counts.inGame} en partie
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-destructive" /> {counts.banned} banni(s)
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-warning" /> {counts.muted} muté(s)
        </span>
      </div>

      <Input
        placeholder="Rechercher par pseudo ou email…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={filter === f.key ? "default" : "outline"}
            onClick={() => {
              setFilter(f.key);
              setPage(1);
            }}
            className={cn("rounded-full", filter !== f.key && "border-border")}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Trier :</span>
        {SORTS.map((s) => {
          const active = sortKey === s.key;
          return (
            <Button
              key={s.key}
              size="sm"
              variant="ghost"
              onClick={() => toggleSort(s.key)}
              className={cn("h-7 gap-1 px-2 text-xs", active ? "text-primary" : "text-muted-foreground")}
            >
              {s.label}
              {active && (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
            </Button>
          );
        })}
      </div>

      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Liste des utilisateurs</caption>
          <thead className="text-left text-muted-foreground border-b border-border">
            <tr>
              <th scope="col" className="p-3">Joueur</th>
              <th scope="col" className="p-3">Rôle</th>
              <th scope="col" className="p-3">Parties</th>
              <th scope="col" className="p-3">Salon</th>
              <th scope="col" className="p-3">Vu</th>
              <th scope="col" className="p-3">État</th>
              <th scope="col" className="p-3 text-right">Actions</th>
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
                onRoleChange={handleRoleChange}
              />
            ))}
            {!users.length && !loading && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground">
                  {debouncedQuery
                    ? "Aucun utilisateur ne correspond à cette recherche."
                    : EMPTY_FILTER_MESSAGES[filter] ?? "Aucun utilisateur."}
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
          {total} joueur(s) — page {page} sur {totalPages} — {users.length} affiché(s) (max 50 par page)
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
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmPending()}
              className={pending?.destructive ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {pending?.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
