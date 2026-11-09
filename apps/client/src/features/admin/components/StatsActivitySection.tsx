import {
  BarChart3,
  Disc,
  Gamepad2,
  Layers,
  Music2,
  Target,
  Timer,
  Trash2,
  Trophy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StatsOverview } from '@/lib/adminApi';
import { StatsMatchesChart } from '@/features/admin/components/StatsMatchesChart';
import { StatsTopPlays } from '@/features/admin/components/StatsTopPlays';
import { DIFFICULTY_LABELS, formatDuration, MODE_LABELS } from './statsPanelFormat';
import { SegmentBar, StatCard } from './statsPanelParts';

export function StatsActivitySection({
  activity,
  periodText,
  periodShort,
  isAdmin,
  onRequestReset,
}: {
  activity: StatsOverview['activity'];
  periodText: string;
  periodShort: string;
  isAdmin: boolean;
  onRequestReset: () => void;
}) {
  return (
    <>
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
            onClick={() => onRequestReset()}
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
              ? (DIFFICULTY_LABELS[activity.topDifficulty.difficulty] ??
                activity.topDifficulty.difficulty)
              : '—'
          }
          accent="text-warning"
        />
        <StatCard
          icon={Gamepad2}
          label="Mode populaire"
          value={
            activity.modes[0]
              ? (MODE_LABELS[activity.modes[0].mode] ?? activity.modes[0].mode)
              : '—'
          }
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
          {
            label: 'Prêts',
            value: activity.catalogue.completed,
            className: 'bg-success',
            dot: 'bg-success',
          },
          {
            label: 'En attente',
            value: activity.catalogue.pending,
            className: 'bg-muted-foreground/40',
            dot: 'bg-muted-foreground/40',
          },
          {
            label: 'En cours',
            value: activity.catalogue.processing,
            className: 'bg-info',
            dot: 'bg-info',
          },
          {
            label: 'Erreurs',
            value: activity.catalogue.error,
            className: 'bg-destructive',
            dot: 'bg-destructive',
          },
          {
            label: 'Ignorés',
            value: activity.catalogue.skipped,
            className: 'bg-warning',
            dot: 'bg-warning',
          },
        ]}
      />

      <StatsTopPlays activity={activity} />

      <StatsMatchesChart data={activity.perDay} />
    </>
  );
}
