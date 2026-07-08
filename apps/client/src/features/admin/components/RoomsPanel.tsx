import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  Bot,
  Clock,
  Copy,
  Eye,
  EyeOff,
  Ghost,
  Loader2,
  Lock,
  Music2,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { ProfileView } from "@/features/profile/components/ProfileView";
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
import { cn } from "@/lib/utils";
import {
  adminApi,
  AdminApiError,
  type AdminRoom,
  type AdminUserProfile,
} from "@/lib/adminApi";

const errorMessage = (e: unknown): string =>
  e instanceof AdminApiError ? e.message : "Une erreur est survenue.";

const REFRESH_MS = 5000;

// --- LABEL / STYLE MAPS -----------------------------------------------------

const STATUS_META: Record<
  string,
  { label: string; className: string; dot: string; pulse?: boolean }
> = {
  waiting: { label: "En attente", className: "bg-secondary text-foreground", dot: "bg-muted-foreground/40" },
  playing: {
    label: "En partie",
    className: "bg-success/20 text-success",
    dot: "bg-success",
    pulse: true,
  },
  paused: { label: "En pause", className: "bg-warning/20 text-warning", dot: "bg-warning" },
  finished: { label: "Terminé", className: "bg-info/20 text-info", dot: "bg-info" },
};

const statusMeta = (status: string) =>
  STATUS_META[status] ?? { label: status, className: "bg-secondary text-foreground", dot: "bg-muted-foreground/40" };

const MODE_LABELS: Record<string, string> = {
  solo: "Solo",
  multiplayer: "Standard",
  competitive: "Compétitif",
};

const RESPONSE_LABELS: Record<string, string> = {
  typing: "Typing",
  qcm: "QCM",
  mix: "Typing & QCM",
};

const SELECTION_LABELS: Record<string, string> = {
  random: "Aléatoire",
  mix: "Mixte",
  watched: "Watched",
  playlist: "Playlist",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Facile",
  medium: "Moyen",
  hard: "Difficile",
};

const formatDifficulties = (diffs: string[]): string => {
  if (!diffs.length) return "Mixte";
  return diffs.map((d) => DIFFICULTY_LABELS[d] ?? d).join(", ");
};

/** Human-readable "open since" from an ISO timestamp. */
const formatOpenSince = (iso: string): string => {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const rem = min % 60;
  if (h < 24) return rem ? `${h} h ${rem} min` : `${h} h`;
  const d = Math.floor(h / 24);
  return `${d} j`;
};

// --- FILTERS / SORTS --------------------------------------------------------

type FilterKey = "all" | "waiting" | "playing" | "public" | "private";
type SortKey = "created" | "players" | "status";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "waiting", label: "En attente" },
  { key: "playing", label: "En partie" },
  { key: "public", label: "Publics" },
  { key: "private", label: "Privés" },
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: "created", label: "Ancienneté" },
  { key: "players", label: "Joueurs" },
  { key: "status", label: "Statut" },
];

const STATUS_ORDER: Record<string, number> = { playing: 0, paused: 1, waiting: 2, finished: 3 };

const isPlaying = (r: AdminRoom) => r.status === "playing" || r.status === "paused";
const connectedHumans = (r: AdminRoom) =>
  r.players.filter((p) => !p.isBot && p.isConnected).length;

interface PendingConfirm {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  action: () => Promise<unknown>;
  successMsg: string;
}

// --- PLAYER PROFILE MODAL ---------------------------------------------------

/** Fetches and shows the real profile of a room player (same as the profile page). */
function PlayerProfileDialog({
  player,
  onClose,
}: {
  player: { userId: string; connected: boolean } | null;
  onClose: () => void;
}) {
  const [profile, setProfile] = useState<AdminUserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!player) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    adminApi
      .getUserProfile(player.userId)
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
  }, [player]);

  return (
    <Dialog open={!!player} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Profil du joueur</DialogTitle>
        </DialogHeader>
        {loading || !profile || !player ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <ProfileView
            username={profile.username}
            avatar={profile.avatar}
            role={profile.role}
            anilistUsername={profile.anilistUsername}
            presenceLabel={player.connected ? "Dans le salon" : "Déconnecté"}
            presenceColor={player.connected ? "bg-success" : "bg-muted-foreground/30"}
            presenceOnline={player.connected}
            stats={profile.stats}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// --- CONFIG BADGE -----------------------------------------------------------

function ConfigBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-secondary/50 px-2 py-0.5 text-[11px] text-muted-foreground">
      {children}
    </span>
  );
}

// --- SKELETON ---------------------------------------------------------------

function RoomSkeleton() {
  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>
      <Skeleton className="h-px w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-7 w-24" />
      </div>
    </div>
  );
}

// --- MAIN -------------------------------------------------------------------

export function RoomsPanel({ highlightRoomId }: { highlightRoomId?: string | null }) {
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [detail, setDetail] = useState<{ userId: string; connected: boolean } | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [, forceTick] = useState(0);
  const highlightRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const { rooms } = await adminApi.listRooms();
      setRooms(rooms);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  // 1 s ticker to keep "open since" and the round countdown live.
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Coming from a "current room" link: make sure the room is visible, then scroll.
  useEffect(() => {
    if (highlightRoomId) {
      setFilter("all");
      setQuery("");
    }
  }, [highlightRoomId]);

  useEffect(() => {
    if (highlightRoomId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightRoomId, rooms]);

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn();
      toast.success(msg);
      await load();
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
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const toggleReveal = (id: string) =>
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const copy = async (text: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(msg);
    } catch {
      toast.error("Copie impossible.");
    }
  };

  const counts = useMemo(() => {
    let playing = 0;
    let waiting = 0;
    let players = 0;
    for (const r of rooms) {
      if (isPlaying(r)) playing += 1;
      if (r.status === "waiting") waiting += 1;
      players += r.humanCount;
    }
    return { total: rooms.length, playing, waiting, players };
  }, [rooms]);

  const visibleRooms = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rooms.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q) && !r.id.toLowerCase().includes(q)) return false;
      switch (filter) {
        case "waiting":
          return r.status === "waiting";
        case "playing":
          return isPlaying(r);
        case "public":
          return !r.isPrivate;
        case "private":
          return r.isPrivate;
        default:
          return true;
      }
    });

    const dir = sortDir === "asc" ? 1 : -1;
    list = [...list].sort((a, b) => {
      switch (sortKey) {
        case "players":
          return (a.playerCount - b.playerCount) * dir;
        case "status":
          return ((STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)) * dir;
        case "created":
        default:
          return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
      }
    });
    return list;
  }, [rooms, query, filter, sortKey, sortDir]);

  return (
    <div className="space-y-4">
      {/* Counters */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="flex items-center gap-2 font-medium">
          <Users className="h-4 w-4 text-muted-foreground" /> {counts.total} salon(s)
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-success" /> {counts.playing} en partie
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/40" /> {counts.waiting} en attente
        </span>
        <span className="flex items-center gap-2 text-muted-foreground">
          {counts.players} joueur(s) au total
        </span>
        <Button size="sm" variant="outline" className="ml-auto" onClick={() => void load()}>
          Rafraîchir
        </Button>
      </div>

      <Input
        placeholder="Rechercher un salon par nom ou code…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={filter === f.key ? "default" : "outline"}
            onClick={() => setFilter(f.key)}
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

      {/* First load skeleton */}
      {!loaded && (
        <div className="space-y-4">
          <RoomSkeleton />
          <RoomSkeleton />
        </div>
      )}

      {loaded && !visibleRooms.length && (
        <div className="glass-card p-6 text-center text-muted-foreground">
          {rooms.length ? "Aucun salon ne correspond aux filtres." : "Aucun salon en cours."}
        </div>
      )}

      {visibleRooms.map((room) => {
        const meta = statusMeta(room.status);
        const botCount = room.playerCount - room.humanCount;
        const ghost = connectedHumans(room) === 0;
        const sortedPlayers = [...room.players].sort(
          (a, b) => Number(b.isHost) - Number(a.isHost),
        );
        const showPw = revealed.has(room.id);
        const remainingMs = room.progress?.endsAt ? Math.max(0, room.progress.endsAt - Date.now()) : null;

        return (
          <div
            key={room.id}
            ref={room.id === highlightRoomId ? highlightRef : undefined}
            className={cn(
              "glass-card p-4 space-y-3 transition-all animate-in fade-in-0 duration-300",
              room.id === highlightRoomId && "ring-2 ring-primary/60",
              ghost && "opacity-80",
            )}
          >
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 font-semibold">
                  {room.isPrivate && <Lock className="h-3.5 w-3.5 text-warning" />}
                  {room.name}
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                    title="Copier le code du salon"
                    onClick={() => void copy(room.id, "Code du salon copié.")}
                  >
                    #{room.id} <Copy className="h-3 w-3" />
                  </button>
                  <Badge className={cn("gap-1.5", meta.className)}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot, meta.pulse && "animate-pulse")} />
                    {meta.label}
                  </Badge>
                  {ghost && (
                    <Badge className="gap-1 bg-warning/15 text-warning">
                      <Ghost className="h-3 w-3" /> Fantôme
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {room.playerCount}/{room.maxPlayers} joueurs · {room.humanCount} humain(s)
                    {botCount > 0 && ` · ${botCount} bot(s)`}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> ouvert depuis {formatOpenSince(room.createdAt)}
                  </span>
                </div>

                {/* Config badges */}
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  <ConfigBadge>{MODE_LABELS[room.settings.mode] ?? room.settings.mode}</ConfigBadge>
                  <ConfigBadge>
                    <Music2 className="h-3 w-3" /> {room.settings.soundCount} sons
                  </ConfigBadge>
                  <ConfigBadge>{formatDifficulties(room.settings.difficulty)}</ConfigBadge>
                  <ConfigBadge>{room.settings.guessDuration}s / round</ConfigBadge>
                  <ConfigBadge>
                    {RESPONSE_LABELS[room.settings.responseType] ?? room.settings.responseType}
                  </ConfigBadge>
                  <ConfigBadge>
                    {SELECTION_LABELS[room.settings.soundSelection] ?? room.settings.soundSelection}
                  </ConfigBadge>
                  {room.isPrivate && (
                    <ConfigBadge>
                      <Lock className="h-3 w-3" />
                      {showPw ? room.password || "(vide)" : "••••••"}
                      <button
                        className="hover:text-foreground"
                        title={showPw ? "Masquer" : "Afficher le mot de passe"}
                        onClick={() => toggleReveal(room.id)}
                      >
                        {showPw ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </button>
                      {showPw && room.password && (
                        <button
                          className="hover:text-foreground"
                          title="Copier le mot de passe"
                          onClick={() => void copy(room.password, "Mot de passe copié.")}
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      )}
                    </ConfigBadge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!isPlaying(room)}
                  onClick={() =>
                    setPending({
                      title: `Terminer la partie de "${room.name}" ?`,
                      description:
                        "La partie en cours sera arrêtée et les joueurs renvoyés au salon.",
                      confirmLabel: "Terminer",
                      action: () => adminApi.endMatch(room.id),
                      successMsg: "Partie terminée.",
                    })
                  }
                >
                  Terminer
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() =>
                    setPending({
                      title: `Fermer le salon "${room.name}" ?`,
                      description:
                        "Le salon sera définitivement fermé et tous les joueurs en seront expulsés.",
                      confirmLabel: "Fermer",
                      destructive: true,
                      action: () => adminApi.closeRoom(room.id),
                      successMsg: "Salon fermé.",
                    })
                  }
                >
                  Fermer
                </Button>
              </div>
            </div>

            {/* Live match progress */}
            {isPlaying(room) && room.progress && (
              <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">
                    Round {room.progress.currentRound}/{room.progress.totalRounds}
                    {room.progress.phase && (
                      <span className="ml-2 text-muted-foreground">
                        {room.progress.phase === "guessing"
                          ? "· manche"
                          : room.progress.phase === "reveal"
                            ? "· révélation"
                            : "· intro"}
                      </span>
                    )}
                  </span>
                  {remainingMs !== null && (
                    <span className="text-muted-foreground">{Math.ceil(remainingMs / 1000)}s</span>
                  )}
                </div>
                {room.progress.anime && (
                  <div className="truncate text-sm">
                    {room.progress.anime}
                    {room.progress.title && (
                      <span className="text-muted-foreground"> — {room.progress.title}</span>
                    )}
                  </div>
                )}
                <Progress
                  value={
                    room.progress.totalRounds
                      ? (room.progress.currentRound / room.progress.totalRounds) * 100
                      : 0
                  }
                  className="h-2"
                />
              </div>
            )}

            {/* Players */}
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              {sortedPlayers.map((p) => (
                <div
                  key={p.userId}
                  className={cn(
                    "flex items-center gap-2 rounded-lg bg-secondary/50 px-2 py-1 text-xs transition-colors",
                    !p.isBot && "cursor-pointer hover:bg-secondary",
                  )}
                  onClick={
                    p.isBot
                      ? undefined
                      : () => setDetail({ userId: p.userId, connected: p.isConnected })
                  }
                  title={p.isBot ? undefined : "Voir le profil"}
                >
                  <span className="relative">
                    <UserAvatar avatar={p.avatar} username={p.username} className="h-6 w-6" />
                    <span
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-background",
                        p.isConnected ? "bg-success" : "bg-muted-foreground/40",
                      )}
                    />
                  </span>
                  <span className={cn("font-medium", !p.isConnected && "opacity-60")}>{p.username}</span>
                  {p.isHost && <Badge className="bg-primary/20 text-primary">Hôte</Badge>}
                  {p.isBot && (
                    <Badge className="gap-1 bg-accent/15 text-accent">
                      <Bot className="h-3 w-3" /> Bot
                    </Badge>
                  )}
                  <span className="text-muted-foreground">{p.score} pts</span>
                  <button
                    className="text-destructive hover:text-destructive/80"
                    title="Expulser"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPending({
                        title: `Expulser ${p.username} ?`,
                        description: `${p.username} sera retiré du salon "${room.name}".`,
                        confirmLabel: "Expulser",
                        destructive: true,
                        action: () => adminApi.kick(room.id, p.userId),
                        successMsg: "Joueur expulsé.",
                      });
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <PlayerProfileDialog player={detail} onClose={() => setDetail(null)} />

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
