import { Flame, Check } from 'lucide-react';
import type { GamePlayer } from '@aniquizz/shared';
import { cn } from '@/lib/utils';
import { rankAccent, rankNeutralAccent } from '../../../utils/ranking';
import { PlayerCardBase } from '../../shared/PlayerCardBase';

interface StandardPlayerCardProps {
  player: GamePlayer;
  isCurrentUser?: boolean;
  showResult?: boolean;
  /** Competition rank (1-based); ties share a place. Drives the corner medal. */
  rank?: number;
  /** All scores still tied — show a neutral `#-` pill instead of `#1` for everyone. */
  rankPending?: boolean;
  /** Briefly glow + lift the card (e.g. when the player climbs the ranking). */
  flash?: boolean;
  onClick?: () => void;
}

export function StandardPlayerCard({ player, isCurrentUser, showResult, rank, rankPending, flash, onClick }: StandardPlayerCardProps) {
  const isCorrect = player.isCorrect === true;
  const isWrong = showResult && !isCorrect;
  const displayedAnswer = player.currentAnswer || '…';
  const answeredDuringGuess = !showResult && player.hasAnswered === true;
  const streak = player.streak ?? 0;

  // Rank pill, half on the top-left corner / half in the void. Matches the
  // sidebar style (squared, `#N`, shared accent) for consistency.
  const rankMedal = (rank !== undefined || rankPending) && (
    <div
      className={cn(
        'absolute -left-2.5 -top-2.5 z-20 flex h-6 min-w-[1.5rem] items-center justify-center rounded-md px-1 text-[11px] font-black shadow-md',
        rankPending ? rankNeutralAccent() : rankAccent(rank!),
      )}
    >
      #{rankPending ? '-' : rank}
    </div>
  );

  // Anti-cheat: signal THAT a player has answered, never the content. Centered on
  // the card's bottom border so it never collides with the rank pill.
  const answeredBadge = answeredDuringGuess && (
    <div className="absolute -bottom-2.5 left-1/2 z-10 flex h-5 w-5 -translate-x-1/2 animate-in zoom-in items-center justify-center rounded-full border-2 border-card bg-primary shadow-sm duration-300">
      <Check className="h-3 w-3 text-primary-foreground" />
    </div>
  );

  // Answer bubble revealed at round end.
  const bubble = showResult && (
    <div
      className={cn(
        'absolute bottom-[calc(100%+12px)] left-1/2 z-30 w-max max-w-[150px] -translate-x-1/2 animate-in zoom-in slide-in-from-bottom-2 rounded-xl border px-3 py-2 text-center text-[11px] font-bold shadow-xl duration-300',
        isCorrect ? 'border-success/60 bg-success text-success-foreground' : 'border-destructive/60 bg-destructive text-destructive-foreground',
      )}
    >
      <span className="line-clamp-2 w-full whitespace-normal break-words leading-tight">{displayedAnswer}</span>
      <div
        className={cn(
          'absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r',
          isCorrect ? 'border-success/60 bg-success' : 'border-destructive/60 bg-destructive',
        )}
      />
    </div>
  );

  // Reveal focuses on answers; streak stays visible in the sidebar roster.
  const streakBadge = !showResult && streak >= 3 && (
    <div className="absolute -right-2 -top-2 z-10 flex animate-in zoom-in items-center gap-0.5 rounded-md border border-warning/50 bg-warning/10 px-1.5 py-0.5 shadow-sm duration-300">
      <Flame className={cn('h-3 w-3 fill-warning text-warning', streak >= 5 && 'animate-pulse')} />
      <span className="text-[10px] font-black italic text-warning">{streak}</span>
    </div>
  );

  return (
    <PlayerCardBase
      player={player}
      isCurrentUser={isCurrentUser}
      onClick={onClick}
      bubbleContent={bubble}
      topLeftContent={
        <>
          {rankMedal}
          {answeredBadge}
        </>
      }
      topRightContent={streakBadge}
      className={cn(
        showResult && isCorrect && 'border-success/50 bg-success/10 shadow-[0_0_15px_hsl(var(--success)/0.15)]',
        showResult && isWrong && 'border-destructive/50 bg-destructive/10',
        flash && 'animate-rank-flash',
      )}
    />
  );
}
