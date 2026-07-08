import { Check, Music2, User, X } from 'lucide-react';
import { ANSWER_TYPE_LABELS, type RoundHistoryEntry } from '@aniquizz/shared';
import { cn } from '@/lib/utils';

interface RoundHistoryListProps {
  history: RoundHistoryEntry[];
  /** Show the song type chip (used in the richer solo list). */
  showType?: boolean;
}

/** Per-round recap rows shared by the solo panel and the multi detail dialog. */
export function RoundHistoryList({ history, showType = true }: RoundHistoryListProps) {
  if (!history || history.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Aucun détail de round disponible pour cette partie.
      </p>
    );
  }

  return (
    <div className="space-y-3">
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
            <div
              className={cn(
                'text-lg font-bold',
                round.isCorrect ? 'text-success' : 'text-muted-foreground/50',
              )}
            >
              {round.isCorrect ? `+${round.points}` : '0'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
