import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  Ban,
  BarChart3,
  Clock,
  Cpu,
  Disc,
  Gamepad2,
  Layers,
  Link2,
  MemoryStick,
  MicOff,
  Music2,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Server,
  Shield,
  Target,
  Timer,
  Trash2,
  Trophy,
  UserCheck,
  UserPlus,
  Users,
  Wifi,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
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
import { useAuth } from "@/features/auth/context/AuthContext";
import { cn } from "@/lib/utils";
import {
  adminApi,
  AdminApiError,
  type StatsOverview,
  type StatsPeriod,
} from "@/lib/adminApi";

const errorMessage = (e: unknown): string =>
  e instanceof AdminApiError ? e.message : "Une erreur est survenue.";

const REFRESH_MS = 60_000;

const PERIODS: { key: StatsPeriod; label: string }[] = [
  { key: "24h", label: "24 h" },
  { key: "7d", label: "7 j" },
  { key: "30d", label: "30 j" },
  { key: "all", label: "Tout" },
];

/** "sur …" suffix for period-scoped metrics. */
const PERIOD_TEXT: Record<StatsPeriod, string> = {
  "24h": "24 h",
  "7d": "7 j",
  "30d": "30 j",
  all: "tout l'historique",
};

const PERIOD_SHORT: Record<StatsPeriod, string> = {
  "24h": "24 h",
  "7d": "7 j",
  "30d": "30 j",
  all: "total",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  EASY: "Facile",
  MEDIUM: "Moyen",
  HARD: "Difficile",
};

const MODE_LABELS: Record<string, string> = {
  STANDARD: "Standard",
};

const formatUptime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
};

const formatDuration = (seconds: number): string => {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

// --- SHARED PIECES ----------------------------------------------------------

function SectionTitle({ icon: Icon, title }: { icon: typeof Activity; title: string }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <Icon className="h-5 w-5 text-primary" />
      <h2 className="text-lg font-bold">{title}</h2>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  secondary,
  accent = "text-primary",
}: {
  icon: typeof Activity;
  label: string;
  value: string | number;
  secondary?: string;
  accent?: string;
}) {
  return (
    <div className="glass-card p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
        <Icon className={cn("h-4 w-4", accent)} />
      </div>
      <div className={cn("text-2xl font-bold", accent)}>{value}</div>
      {secondary && <div className="text-xs text-muted-foreground">{secondary}</div>}
    </div>
  );
}

interface Segment {
  label: string;
  value: number;
  className: string;
  dot: string;
}

function SegmentBar({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary/50">
        {total === 0 ? (
          <div className="h-full w-full bg-secondary/50" />
        ) : (
          segments.map((seg) => (
            <div
              key={seg.label}
              className={cn("h-full", seg.className)}
              style={{ width: `${(seg.value / total) * 100}%` }}
              title={`${seg.label}: ${seg.value}`}
            />
          ))
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {segments.map((seg) => (
          <span key={seg.label} className="flex items-center gap-1.5 text-muted-foreground">
            <span className={cn("h-2 w-2 rounded-full", seg.dot)} />
            {seg.label} <span className="font-semibold text-foreground">{seg.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function TopList({
  icon: Icon,
  title,
  items,
  empty,
}: {
  icon: typeof Activity;
  title: string;
  items: { primary: string; secondary?: string; count: number }[];
  empty: string;
}) {
  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </div>
      {items.length === 0 ? (
        <div className="text-xs text-muted-foreground">{empty}</div>
      ) : (
        <ol className="space-y-2">
          {items.map((it, i) => (
            <li key={`${it.primary}-${i}`} className="flex items-center gap-3 text-sm">
              <span className="w-5 shrink-0 text-center text-xs font-bold text-muted-foreground">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{it.primary}</div>
                {it.secondary && (
                  <div className="truncate text-xs text-muted-foreground">{it.secondary}</div>
                )}
              </div>
              <span className="shrink-0 rounded-md bg-secondary/50 px-2 py-0.5 text-xs text-muted-foreground">
                {it.count}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

const CHART_COLORS = ["#a855f7", "#8b5cf6", "#6366f1"];

function MatchesChart({ data }: { data: { date: string; count: number }[] }) {
  const chartData = data.map((d) => ({
    ...d,
    label: d.date.slice(8, 10) + "/" + d.date.slice(5, 7),
  }));
  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <BarChart3 className="h-4 w-4 text-primary" />
        Parties par jour
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={chartData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.05)" }}
            contentStyle={{
              background: "hsl(var(--background))",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "hsl(var(--muted-foreground))" }}
            formatter={(value: number) => [`${value} partie(s)`, ""]}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// --- MAIN -------------------------------------------------------------------

export function StatsPanel() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "ADMIN";
  const [data, setData] = useState<StatsOverview | null>(null);
  const [period, setPeriod] = useState<StatsPeriod>("7d");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [, tick] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const periodRef = useRef(period);
  periodRef.current = period;

  const load = useCallback(async () => {
    try {
      const res = await adminApi.statsOverview(periodRef.current);
      setData(res);
      setLastUpdated(Date.now());
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, period]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(id);
  }, [autoRefresh, load]);

  // Ticker for the "refreshed Xs ago" label.
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const doReset = async () => {
    setResetting(true);
    try {
      const res = await adminApi.resetActivityStats();
      toast.success(`Activité réinitialisée : ${res.matches} partie(s) supprimée(s).`);
      setConfirmReset(false);
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setResetting(false);
    }
  };

  if (!data) {
    return <div className="text-muted-foreground">Chargement des statistiques…</div>;
  }

  const { live, community, activity } = data;
  const secondsAgo = Math.floor((Date.now() - lastUpdated) / 1000);
  const periodText = PERIOD_TEXT[period];
  const periodShort = PERIOD_SHORT[period];

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <Button
              key={p.key}
              size="sm"
              variant={period === p.key ? "default" : "outline"}
              className={cn("rounded-full", period !== p.key && "border-border")}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">Période des métriques historiques</span>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Rafraîchi il y a {secondsAgo}s</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAutoRefresh((v) => !v)}
            title={autoRefresh ? "Mettre en pause l'auto-refresh" : "Reprendre l'auto-refresh"}
          >
            {autoRefresh ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* --- Temps réel --- */}
      <SectionTitle icon={Activity} title="Temps réel" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Clock} label="Uptime" value={formatUptime(live.uptimeSeconds)} accent="text-info" />
        <StatCard
          icon={Users}
          label="Joueurs en ligne"
          value={live.uniqueOnline}
          secondary={`${live.connectedSockets} socket(s)`}
          accent="text-success"
        />
        <StatCard
          icon={Radio}
          label="Salons actifs"
          value={live.activeRooms}
          secondary={`${live.activeMatches} partie(s) en cours`}
          accent="text-primary"
        />
        <StatCard
          icon={Gamepad2}
          label="Joueurs en salon"
          value={live.humansInRooms}
          secondary={live.botsInRooms ? `+ ${live.botsInRooms} bot(s)` : undefined}
          accent="text-accent"
        />
        <StatCard icon={MemoryStick} label="Mémoire (RSS)" value={`${live.memoryRssMb} Mo`} accent="text-warning" />
        <StatCard icon={Cpu} label="Node" value={live.nodeVersion} accent="text-accent" />
        <StatCard icon={Wifi} label="Sockets connectés" value={live.connectedSockets} accent="text-success" />
        <StatCard icon={Server} label="Joueurs (total salons)" value={live.playersInRooms} accent="text-primary" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <SegmentBar
          segments={[
            { label: "Publics", value: live.roomsPublic, className: "bg-success", dot: "bg-success" },
            { label: "Privés", value: live.roomsPrivate, className: "bg-warning", dot: "bg-warning" },
          ]}
        />
        <SegmentBar
          segments={[
            { label: "En attente", value: live.roomsWaiting, className: "bg-muted-foreground/40", dot: "bg-muted-foreground/40" },
            { label: "En partie", value: live.roomsPlaying, className: "bg-success", dot: "bg-success" },
            { label: "En pause", value: live.roomsPaused, className: "bg-warning", dot: "bg-warning" },
          ]}
        />
      </div>

      {/* --- Communauté --- */}
      <SectionTitle icon={Users} title="Communauté" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={Users}
          label="Joueurs inscrits"
          value={community.totalPlayers}
          secondary={`+${community.newPlayers24h} (24 h) — +${community.newPlayers7d} (7 j)`}
          accent="text-primary"
        />
        <StatCard
          icon={UserCheck}
          label="Joueurs actifs"
          value={community.activePlayers24h}
          secondary={`${community.activePlayers7d} sur 7 j`}
          accent="text-success"
        />
        <StatCard
          icon={UserPlus}
          label="Nouveaux (7 j)"
          value={community.newPlayers7d}
          secondary={`${community.newPlayers24h} sur 24 h`}
          accent="text-accent"
        />
        <StatCard
          icon={Link2}
          label="Listes anime liées"
          value={community.watchedListLinked}
          secondary={`${community.watchedListLinkedPercent}% — AniList ${community.anilistLinked} · MAL ${community.malLinked}`}
          accent="text-info"
        />
        <StatCard icon={Ban} label="Bannis" value={community.banned} accent="text-destructive" />
        <StatCard icon={MicOff} label="Mutés" value={community.muted} accent="text-warning" />
        <StatCard icon={Shield} label="Modérateurs" value={community.roles.MODERATOR} accent="text-info" />
        <StatCard icon={Shield} label="Admins" value={community.roles.ADMIN} accent="text-primary" />
      </div>
      <SegmentBar
        segments={[
          { label: "Joueurs", value: community.roles.USER, className: "bg-muted-foreground/40", dot: "bg-muted-foreground/40" },
          { label: "Modérateurs", value: community.roles.MODERATOR, className: "bg-info", dot: "bg-info" },
          { label: "Admins", value: community.roles.ADMIN, className: "bg-primary", dot: "bg-primary" },
        ]}
      />

      {/* --- Activité de jeu --- */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <Gamepad2 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Activité de jeu</h2>
        </div>
        {isAdmin && (
          <Button
            size="sm"
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setConfirmReset(true)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Réinitialiser l'activité
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={Trophy}
          label="Parties jouées"
          value={activity.totalMatches}
          secondary={`${activity.matchesToday} aujourd'hui — ${activity.matchesWeek} cette semaine`}
          accent="text-primary"
        />
        <StatCard
          icon={Timer}
          label="Durée moyenne"
          value={formatDuration(activity.avgMatchDurationSec)}
          secondary={`sur ${periodText}`}
          accent="text-accent"
        />
        <StatCard
          icon={Target}
          label="Taux de bonne réponse"
          value={`${activity.correctRatePercent}%`}
          secondary={`sur ${periodText}`}
          accent="text-success"
        />
        <StatCard
          icon={Disc}
          label="Sons découverts"
          value={activity.discoveredSongs}
          secondary={`${activity.coveragePercent}% du catalogue jouable`}
          accent="text-accent"
        />
        <StatCard
          icon={Music2}
          label="Catalogue jouable"
          value={activity.playableSongs}
          secondary={`${activity.catalogue.total} sons au total`}
          accent="text-primary"
        />
        <StatCard
          icon={Layers}
          label="Difficulté populaire"
          value={
            activity.topDifficulty
              ? DIFFICULTY_LABELS[activity.topDifficulty.difficulty] ?? activity.topDifficulty.difficulty
              : "—"
          }
          accent="text-warning"
        />
        <StatCard
          icon={Gamepad2}
          label="Mode populaire"
          value={activity.modes[0] ? MODE_LABELS[activity.modes[0].mode] ?? activity.modes[0].mode : "—"}
          secondary={activity.modes[0] ? `${activity.modes[0].count} partie(s)` : undefined}
          accent="text-info"
        />
        <StatCard
          icon={BarChart3}
          label={`Parties (${periodShort})`}
          value={activity.matchesPeriod}
          accent="text-success"
        />
      </div>

      {/* Catalogue health */}
      <SegmentBar
        segments={[
          { label: "Prêts", value: activity.catalogue.completed, className: "bg-success", dot: "bg-success" },
          { label: "En attente", value: activity.catalogue.pending, className: "bg-muted-foreground/40", dot: "bg-muted-foreground/40" },
          { label: "En cours", value: activity.catalogue.processing, className: "bg-info", dot: "bg-info" },
          { label: "Erreurs", value: activity.catalogue.error, className: "bg-destructive", dot: "bg-destructive" },
          { label: "Ignorés", value: activity.catalogue.skipped, className: "bg-warning", dot: "bg-warning" },
        ]}
      />

      <div className="grid gap-3 md:grid-cols-2">
        <TopList
          icon={Trophy}
          title="Top animes joués"
          empty="Aucune partie sur la période."
          items={activity.topAnimes.map((a) => ({ primary: a.name, count: a.count }))}
        />
        <TopList
          icon={Music2}
          title="Top sons joués"
          empty="Aucune partie sur la période."
          items={activity.topSongs.map((s) => ({
            primary: s.title,
            secondary: `${s.artist} — ${s.anime}`,
            count: s.count,
          }))}
        />
      </div>

      <MatchesChart data={activity.perDay} />

      <AlertDialog open={confirmReset} onOpenChange={(open) => !open && setConfirmReset(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Réinitialiser l'activité de jeu ?</AlertDialogTitle>
            <AlertDialogDescription>
              Tout l'historique des parties (parties jouées, top animes, top sons, durées, taux de
              réponse) et les sons découverts seront <b>définitivement supprimés</b>. Le catalogue de
              sons et les profils des joueurs ne sont pas affectés. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void doReset();
              }}
              disabled={resetting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {resetting ? "Suppression…" : "Réinitialiser"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
