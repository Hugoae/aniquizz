import { History, Trophy, Medal, Target, Zap, Users, Clock, X } from 'lucide-react';
import type { MatchHistoryEntry } from '@aniquizz/shared';
import { cn } from '@/lib/utils';

const MEDAL_HEX: Record<number, string> = { 1: '#FACC15', 2: '#CBD5E1', 3: '#C67B48' };

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'hier';
  if (d < 7) return `il y a ${d} j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function formatDuration(ms: number | null): string | null {
  if (!ms || ms <= 0) return null;
  const min = Math.round(ms / 60_000);
  return min < 1 ? '<1 min' : `${min} min`;
}

const modeLabel = (mode: string) => (mode ? mode.charAt(0) + mode.slice(1).toLowerCase() : mode);

function HistoryRow({ entry }: { entry: MatchHistoryEntry }) {
  const solo = entry.rank == null || entry.playerCount <= 1;
  const topMedal = !solo && entry.rank && entry.rank <= 3 ? MEDAL_HEX[entry.rank] : null;
  const defeat = solo && !entry.isWinner;

  const color = entry.isWinner
    ? 'hsl(var(--accent))'
    : topMedal ?? (defeat ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground) / 0.35)');

  const Icon = entry.isWinner ? Trophy : defeat ? X : Medal;
  const label = solo
    ? entry.isWinner
      ? 'Victoire'
      : 'Défaite'
    : `#${entry.rank} / ${entry.playerCount}`;

  const duration = formatDuration(entry.durationMs);

  return (
    <li className="relative overflow-hidden rounded-lg border border-border/40 bg-background/40 p-3">
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: color }} aria-hidden />
      <div className="space-y-2 pl-2">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn('inline-flex items-center gap-1.5 text-sm font-bold', entry.isWinner || topMedal || defeat ? '' : 'text-foreground')}
            style={{ color: entry.isWinner || topMedal || defeat ? color : undefined }}
          >
            <Icon className="h-4 w-4" />
            {label}
          </span>
          <span className="text-[11px] text-muted-foreground">{timeAgo(entry.playedAt)}</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
            {modeLabel(entry.mode)}
          </span>
          {entry.answerMode && (
            <span className="rounded-md bg-info/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-info">
              {entry.answerMode}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
          <span className="font-bold text-foreground">{entry.score.toLocaleString('fr-FR')} pts</span>
          <span className="inline-flex items-center gap-1 text-success">
            <Target className="h-3 w-3" /> {entry.correctCount}/{entry.totalRounds}
          </span>
          {entry.xpEarned > 0 && (
            <span className="inline-flex items-center gap-1 text-accent">
              <Zap className="h-3 w-3" /> +{entry.xpEarned}
            </span>
          )}
          {entry.playerCount > 1 && (
            <span className="inline-flex items-center gap-1 text-warning">
              <Users className="h-3 w-3" /> {entry.playerCount}
            </span>
          )}
          {duration && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> {duration}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

export function MatchHistory({ entries }: { entries: MatchHistoryEntry[] }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <History className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Historique de parties</h2>
      </div>

      <div className="glass-card bg-card/40 rounded-xl p-2">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-sm text-muted-foreground/60">
            <History className="h-8 w-8 opacity-40" />
            Aucune partie jouée pour l'instant.
          </div>
        ) : (
          <ul className="space-y-2">
            {entries.map((e) => (
              <HistoryRow key={e.id} entry={e} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
