import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { MicOff, Ban, Power, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";
import { ProfileView } from "@/features/profile/components/ProfileView";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  adminApi,
  AdminApiError,
  type AdminUser,
  type AdminUserProfile,
  type Presence,
  type Role,
  type UserListFilter,
  type UserListSort,
} from "@/lib/adminApi";
import { useAuth } from "@/features/auth/context/AuthContext";
import { cn } from "@/lib/utils";
import {
  DURATION_OPTIONS,
  formatRelativeFromNow,
  formatRemaining,
  isSanctionActive,
} from "@/lib/suspension";

const ROLE_OPTIONS: Role[] = ["USER", "MODERATOR", "ADMIN"];

const roleBadgeClass: Record<Role, string> = {
  USER: "bg-secondary text-foreground",
  MODERATOR: "bg-info/20 text-info",
  ADMIN: "bg-primary/20 text-primary",
};

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

const SORTS: { key: SortKey; label: string }[] = [
  { key: "username", label: "Pseudo" },
  { key: "xp", label: "XP" },
  { key: "games", label: "Parties" },
  { key: "created", label: "Inscription" },
  { key: "seen", label: "Activité" },
];

const PRESENCE_META: Record<Presence, { label: string; dot: string; text: string }> = {
  online: { label: "En ligne", dot: "bg-success", text: "text-success" },
  in_game: { label: "In game", dot: "bg-primary", text: "text-primary" },
  offline: { label: "Hors ligne", dot: "bg-muted-foreground/30", text: "text-muted-foreground" },
};

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

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

interface PendingConfirm {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  action: () => Promise<unknown>;
  successMsg: string;
}

/** Dropdown offering each duration plus a "lift" action when already active. */
function SanctionMenu({
  kind,
  active,
  onApply,
  onLift,
  disabled,
}: {
  kind: "mute" | "ban";
  active: boolean;
  onApply: (minutes: number, label: string) => void;
  onLift: () => void;
  disabled?: boolean;
}) {
  const isMute = kind === "mute";
  const Icon = isMute ? MicOff : Ban;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          className={active ? (isMute ? "border-warning/40 text-warning" : "border-destructive/40 text-destructive") : ""}
        >
          <Icon className="h-3.5 w-3.5 mr-1" />
          {isMute ? "Mute" : "Ban"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{isMute ? "Réduire au silence" : "Bannir"} pour…</DropdownMenuLabel>
        {DURATION_OPTIONS.map((opt) => (
          <DropdownMenuItem key={opt.minutes} onClick={() => onApply(opt.minutes, opt.label)}>
            {opt.label}
          </DropdownMenuItem>
        ))}
        {active && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLift} className="text-success focus:text-success">
              {isMute ? "Lever le mute" : "Lever le ban"}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Profile modal shown when clicking a player row: fetches the real profile
 * (same layout as the profile page) and overlays live presence / sanctions. */
function UserDetailDialog({
  user,
  onClose,
  onGoToRoom,
}: {
  user: AdminUser | null;
  onClose: () => void;
  onGoToRoom?: (roomId: string) => void;
}) {
  const [profile, setProfile] = useState<AdminUserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    adminApi
      .getUserProfile(user.id)
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch((e) => toast.error(errorMessage(e)))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const banned = isSanctionActive(user?.bannedUntil);
  const muted = isSanctionActive(user?.mutedUntil);
  const meta = user ? PRESENCE_META[user.presence] : PRESENCE_META.offline;

  return (
    <Dialog open={!!user} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Profil du joueur</DialogTitle>
        </DialogHeader>

        {loading || !profile || !user ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <ProfileView
            username={profile.username}
            avatar={profile.avatar}
            role={profile.role}
            anilistUsername={profile.anilistUsername}
            presenceLabel={meta.label}
            presenceColor={meta.dot}
            presenceOnline={user.presence !== "offline"}
            stats={profile.stats}
            headerExtra={
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {user.currentRoom && (
                  <button
                    className="text-primary hover:underline"
                    onClick={() => {
                      onGoToRoom?.(user.currentRoom!.id);
                      onClose();
                    }}
                  >
                    Salon : {user.currentRoom.name}
                  </button>
                )}
                {user.presence === "offline" && (
                  <span className="text-muted-foreground">
                    Vu {formatRelativeFromNow(profile.lastSeenAt)}
                  </span>
                )}
                <span className="text-muted-foreground">Inscrit le {formatDate(profile.createdAt)}</span>
                {banned && (
                  <Badge className="bg-destructive/20 text-destructive">
                    Banni · {formatRemaining(user.bannedUntil)}
                  </Badge>
                )}
                {muted && (
                  <Badge className="bg-warning/20 text-warning">
                    Muet · {formatRemaining(user.mutedUntil)}
                  </Badge>
                )}
              </div>
            }
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export function UsersPanel({
  canManage,
  onGoToRoom,
}: {
  canManage: boolean;
  onGoToRoom?: (roomId: string) => void;
}) {
  const { profile } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sortKey, setSortKey] = useState<SortKey>("username");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ online: 0, inGame: 0, banned: 0 });
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [detail, setDetail] = useState<AdminUser | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");

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

  const run = async (fn: () => Promise<unknown>, successMsg: string) => {
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
  };

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
          <thead className="text-left text-muted-foreground border-b border-border">
            <tr>
              <th className="p-3">Joueur</th>
              <th className="p-3">Rôle</th>
              <th className="p-3">Parties</th>
              <th className="p-3">Salon</th>
              <th className="p-3">Vu</th>
              <th className="p-3">État</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const banned = isSanctionActive(u.bannedUntil);
              const muted = isSanctionActive(u.mutedUntil);
              const isSelf = u.id === profile?.id;
              return (
                <tr
                  key={u.id}
                  className="border-b border-border/50 hover:bg-secondary/50 cursor-pointer"
                  onClick={() => setDetail(u)}
                  title="Voir le profil"
                >
                  <td className="p-3">
                    <div className="font-semibold flex items-center gap-2 transition-colors hover:text-primary">
                      {u.username}
                    </div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                    <div className="text-[11px] text-muted-foreground/70">
                      Inscrit le {formatDate(u.createdAt)}
                    </div>
                  </td>

                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    {canManage && !isSelf ? (
                      <select
                        className="bg-background border border-border rounded px-2 py-1"
                        value={u.role}
                        onChange={(e) =>
                          void run(
                            () => adminApi.setRole(u.id, e.target.value as Role),
                            "Rôle mis à jour.",
                          )
                        }
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Badge className={roleBadgeClass[u.role]}>{u.role}</Badge>
                    )}
                  </td>

                  <td className="p-3">
                    {u.gamesPlayed} parties · Niv {u.level}
                  </td>

                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    {u.currentRoom ? (
                      <button
                        className="text-primary hover:underline"
                        onClick={() => onGoToRoom?.(u.currentRoom!.id)}
                      >
                        {u.currentRoom.name}
                      </button>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>

                  <td className="p-3">
                    {u.presence !== "offline" ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeFromNow(u.lastSeenAt)}
                      </span>
                    )}
                  </td>

                  <td className="p-3">
                    <div className="flex flex-col gap-1.5">
                        <span className={cn("flex items-center gap-2 text-xs font-medium", PRESENCE_META[u.presence].text)}>
                          <span className={cn("h-2 w-2 rounded-full", PRESENCE_META[u.presence].dot)} />
                          {PRESENCE_META[u.presence].label}
                        </span>
                        {banned && (
                          <Badge className="bg-destructive/20 text-destructive w-fit">
                            Banni · {formatRemaining(u.bannedUntil)}
                          </Badge>
                        )}
                        {muted && (
                          <Badge className="bg-warning/20 text-warning w-fit">
                            Muet · {formatRemaining(u.mutedUntil)}
                          </Badge>
                        )}
                      </div>
                  </td>

                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-wrap justify-end gap-1">
                        <SanctionMenu
                          kind="mute"
                          active={muted}
                          onApply={(minutes, label) =>
                            setPending({
                              title: `Réduire ${u.username} au silence ?`,
                              description: `Le joueur ne pourra plus écrire dans le chat pendant : ${label}.`,
                              confirmLabel: "Mute",
                              action: () => adminApi.mute(u.id, minutes),
                              successMsg: `Joueur réduit au silence (${label}).`,
                            })
                          }
                          onLift={() =>
                            setPending({
                              title: `Lever le mute de ${u.username} ?`,
                              description: "Le joueur pourra de nouveau écrire dans le chat.",
                              confirmLabel: "Lever le mute",
                              action: () => adminApi.mute(u.id, null),
                              successMsg: "Mute levé.",
                            })
                          }
                        />
                        <SanctionMenu
                          kind="ban"
                          active={banned}
                          disabled={isSelf}
                          onApply={(minutes, label) =>
                            setPending({
                              title: `Bannir ${u.username} ?`,
                              description: `Le joueur sera déconnecté et ne pourra plus se connecter pendant : ${label}.`,
                              confirmLabel: "Bannir",
                              destructive: true,
                              action: () => adminApi.ban(u.id, minutes),
                              successMsg: `Joueur banni (${label}).`,
                            })
                          }
                          onLift={() =>
                            setPending({
                              title: `Lever le ban de ${u.username} ?`,
                              description: "Le joueur pourra de nouveau se connecter.",
                              confirmLabel: "Lever le ban",
                              action: () => adminApi.ban(u.id, null),
                              successMsg: "Ban levé.",
                            })
                          }
                        />
                        {canManage && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={u.presence === "offline"}
                              title="Déconnecter le compte (sans bannir)"
                              onClick={() =>
                                setPending({
                                  title: `Déconnecter ${u.username} ?`,
                                  description:
                                    "Le joueur sera déconnecté de son compte et devra se reconnecter. Aucune sanction n'est appliquée.",
                                  confirmLabel: "Déconnecter",
                                  action: () => adminApi.disconnectUser(u.id),
                                  successMsg: "Joueur déconnecté.",
                                })
                              }
                            >
                              <Power className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setPending({
                                  title: `Réinitialiser les statistiques de ${u.username} ?`,
                                  description:
                                    "Parties, victoires, XP et niveau seront remis à zéro. Cette action est irréversible.",
                                  confirmLabel: "Réinitialiser",
                                  destructive: true,
                                  action: () => adminApi.resetStats(u.id),
                                  successMsg: "Statistiques réinitialisées.",
                                })
                              }
                            >
                              Reset statistiques
                            </Button>
                          </>
                        )}
                      </div>
                  </td>
                </tr>
              );
            })}
            {!users.length && !loading && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground">
                  Aucun utilisateur.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="text-xs text-muted-foreground">
          {total} joueur(s) · page {page} sur {totalPages} · {users.length} affiché(s) (max 50 par page)
        </p>
        <UsersPagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      <UserDetailDialog user={detail} onClose={() => setDetail(null)} onGoToRoom={onGoToRoom} />

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
