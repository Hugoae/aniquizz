import { useMemo } from 'react';
import { Check, Music2, Timer, User, X, Zap } from 'lucide-react';
import { ANSWER_TYPE_LABELS, formatSprintTimeSeconds, type RoundHistoryEntry } from '@aniquizz/shared';
import { formatSpeedRankLabel } from '@/features/game/copy/speedRankCopy';
import { cn } from '@/lib/utils';

interface RoundHistoryListProps {
  history: RoundHistoryEntry[];
  /** Show the song type chip (used in the richer solo list). */
  showType?: boolean;
  /** Sprint match — show speed rank, time, and point breakdown per round. */
  isSprint?: boolean;
}

function SprintPointsBreakdown({ round }: { round: RoundHistoryEntry }) {
  const bonus = round.speedBonus ?? 0;
  const base = bonus > 0 ? round.points - bonus : round.points;

  if (!round.isCorrect) {
    return <div className="text-lg font-bold text-muted-foreground/50">0</div>;
  }

  if (bonus > 0) {
    return (
      <div className="space-y-0.5">
        <div className="text-lg font-bold text-success">+{round.points}</div>
        <div className="font-mono text-[10px] tabular-nums text-muted-foreground">
          {base}+{bonus}
        </div>
      </div>
    );
  }

  return <div className="text-lg font-bold text-success">+{round.points}</div>;
}

/** Per-round recap rows shared by the solo panel and the multi detail dialog. */
export function RoundHistoryList({ history, showType = true, isSprint = false }: RoundHistoryListProps) {
  const sprintSummary = useMemo(() => {
    if (!isSprint || history.length === 0) return null;

    const timed = history.filter((r) => r.isCorrect && r.answerTimeMs != null);
    const podiums = history.filter((r) => r.speedRank != null && r.speedRank > 0 && r.speedRank <= 3);
    const fastestMs = timed.reduce<number | null>(
      (best, r) => (r.answerTimeMs != null && (best == null || r.answerTimeMs < best) ? r.answerTimeMs : best),
      null,
    );

    return { podiums: podiums.length, fastestMs };
  }, [history, isSprint]);

  if (!history || history.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Aucun détail de round disponible pour cette partie.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {isSprint && sprintSummary && (
        <div className="flex flex-wrap gap-3 rounded-lg border border-warning/20 bg-warning/5 px-3 py-2 text-xs font-semibold text-warning">
          <span className="inline-flex items-center gap-1">
            <Zap className="h-3.5 w-3.5" aria-hidden="true" />
            {sprintSummary.podiums} podium{sprintSummary.podiums > 1 ? 's' : ''} vitesse
          </span>
          {sprintSummary.fastestMs != null && (
            <span className="inline-flex items-center gap-1 font-mono tabular-nums">
              <Timer className="h-3.5 w-3.5" aria-hidden="true" />
              Meilleur : {formatSprintTimeSeconds(sprintSummary.fastestMs)} s
            </span>
          )}
        </div>
      )}

      {history.map((round) => (
        <div
          key={round.round}
          className="flex items-center gap-4 rounded-lg border border-border/60 bg-background/50 p-3"
        >
          <div className="flex w-10 flex-col items-center justify-center gap-1">
            <span className="font-mono text-[10px] text-muted-foreground">#{round.round}</span>
            <div
              className={cn(
                'rounded-full p-1.5',
                round.isCorrect ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive',
              )}
            >
              {round.isCorrect ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-base font-bold">{round.song.anime}</span>
              {showType && round.song.type && (
                <span className="rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {round.song.type}
                </span>
              )}
              {round.answerType && (
                <span className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  {ANSWER_TYPE_LABELS[round.answerType]}
                </span>
              )}
            </div>

            {round.song.artist?.trim() && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <User className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                <span className="truncate">{round.song.artist}</span>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Music2 className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              <span className="truncate">{round.song.title}</span>
            </div>

            {isSprint && round.isCorrect && round.answerTimeMs != null && (
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                <span className="inline-flex items-center gap-1 font-mono tabular-nums text-accent">
                  <Timer className="h-3 w-3" aria-hidden="true" />
                  {formatSprintTimeSeconds(round.answerTimeMs)} s
                </span>
                {round.speedRank != null && round.speedRank > 0 && (
                  <span className="rounded-md border border-warning/30 bg-warning/10 px-1.5 py-0.5 text-warning">
                    {formatSpeedRankLabel(round.speedRank)} correct
                  </span>
                )}
              </div>
            )}

            {!round.isCorrect &&
              (round.myAnswer && round.myAnswer.trim() ? (
                <div className="mt-1 truncate text-[11px] text-destructive/80">
                  Votre réponse : <span className="line-through">{round.myAnswer}</span>
                </div>
              ) : (
                <div className="mt-1 truncate text-[11px] italic text-muted-foreground/60">Aucune réponse</div>
              ))}
          </div>

          <div className="min-w-[60px] text-right">
            {isSprint ? (
              <SprintPointsBreakdown round={round} />
            ) : (
              <div
                className={cn(
                  'text-lg font-bold',
                  round.isCorrect ? 'text-success' : 'text-muted-foreground/50',
                )}
              >
                {round.isCorrect ? `+${round.points}` : '0'}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
