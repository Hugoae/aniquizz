import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Activity,
  Ban,
  Clock,
  Cpu,
  Gamepad2,
  Link2,
  MemoryStick,
  MicOff,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Server,
  Shield,
  UserCheck,
  UserPlus,
  Users,
  Wifi,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { useAuth } from '@/features/auth/context/AuthContext';
import { cn } from '@/lib/utils';
import { adminApi, AdminApiError, type StatsOverview, type StatsPeriod } from '@/lib/adminApi';
import { LiveClock } from './LiveClock';
import { PERIOD_SHORT, PERIOD_TEXT, PERIODS, formatUptime } from './statsPanelFormat';
import { SectionTitle, SegmentBar, StatCard } from './statsPanelParts';
import { StatsActivitySection } from './StatsActivitySection';

const errorMessage = (e: unknown): string =>
  e instanceof AdminApiError ? e.message : 'Une erreur est survenue.';

const REFRESH_MS = 60_000;

export function StatsPanel() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'ADMIN';
  const [data, setData] = useState<StatsOverview | null>(null);
  const [period, setPeriod] = useState<StatsPeriod>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
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
    const tick = () => {
      if (document.hidden) return;
      void load();
    };
    const id = setInterval(tick, REFRESH_MS);
    const onVis = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [autoRefresh, load]);

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
  const periodText = PERIOD_TEXT[period];
  const periodShort = PERIOD_SHORT[period];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="text-xs text-muted-foreground">
          <LiveClock
            render={(now) => `Rafraîchi il y a ${Math.floor((now - lastUpdated) / 1000)}s`}
          />
        </span>
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

      {/* --- Temps réel --- */}
      <SectionTitle icon={Activity} title="Temps réel" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={Clock}
          label="Uptime"
          value={formatUptime(live.uptimeSeconds)}
          accent="text-info"
        />
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
        <StatCard
          icon={MemoryStick}
          label="Mémoire (RSS)"
          value={`${live.memoryRssMb} Mo`}
          accent="text-warning"
        />
        <StatCard icon={Cpu} label="Node" value={live.nodeVersion} accent="text-accent" />
        <StatCard
          icon={Wifi}
          label="Sockets connectés"
          value={live.connectedSockets}
          accent="text-success"
        />
        <StatCard
          icon={Server}
          label="Joueurs (total salons)"
          value={live.playersInRooms}
          accent="text-primary"
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <SegmentBar
          segments={[
            {
              label: 'Publics',
              value: live.roomsPublic,
              className: 'bg-success',
              dot: 'bg-success',
            },
            {
              label: 'Privés',
              value: live.roomsPrivate,
              className: 'bg-warning',
              dot: 'bg-warning',
            },
          ]}
        />
        <SegmentBar
          segments={[
            {
              label: 'En attente',
              value: live.roomsWaiting,
              className: 'bg-muted-foreground/40',
              dot: 'bg-muted-foreground/40',
            },
            {
              label: 'En partie',
              value: live.roomsPlaying,
              className: 'bg-success',
              dot: 'bg-success',
            },
            {
              label: 'En pause',
              value: live.roomsPaused,
              className: 'bg-warning',
              dot: 'bg-warning',
            },
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
        <StatCard
          icon={Shield}
          label="Modérateurs"
          value={community.roles.MODERATOR}
          accent="text-info"
        />
        <StatCard
          icon={Shield}
          label="Admins"
          value={community.roles.ADMIN}
          accent="text-primary"
        />
      </div>
      <SegmentBar
        segments={[
          {
            label: 'Joueurs',
            value: community.roles.USER,
            className: 'bg-muted-foreground/40',
            dot: 'bg-muted-foreground/40',
          },
          {
            label: 'Modérateurs',
            value: community.roles.MODERATOR,
            className: 'bg-info',
            dot: 'bg-info',
          },
          {
            label: 'Admins',
            value: community.roles.ADMIN,
            className: 'bg-primary',
            dot: 'bg-primary',
          },
        ]}
      />

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <div className="flex gap-1" role="group" aria-label="Période des métriques historiques">
          {PERIODS.map((p) => (
            <Button
              key={p.key}
              size="sm"
              variant={period === p.key ? 'default' : 'outline'}
              className={cn('rounded-full', period !== p.key && 'border-border')}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">Période des métriques historiques</span>
      </div>

      <StatsActivitySection
        activity={activity}
        periodText={periodText}
        periodShort={periodShort}
        isAdmin={isAdmin}
        onRequestReset={() => setConfirmReset(true)}
      />
      <AlertDialog open={confirmReset} onOpenChange={(open) => !open && setConfirmReset(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Réinitialiser l'activité de jeu ?</AlertDialogTitle>
            <AlertDialogDescription>
              Tout l'historique des parties (parties jouées, top animes, top sons, durées, taux de
              réponse) et les sons découverts seront <b>définitivement supprimés</b>. Le catalogue
              de sons et les profils des joueurs ne sont pas affectés. Cette action est
              irréversible.
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
              {resetting ? 'Suppression…' : 'Réinitialiser'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
