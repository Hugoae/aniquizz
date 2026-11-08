import { memo, useMemo } from 'react';
import { TIME_ATTACK_RACE_MAX_PLAYERS, type GamePlayer } from '@aniquizz/shared';
import { FoundHeard } from '@/features/game/components/shared/RaceLaneStats';
import { liveRaceRows, useRaceNow } from '@/features/game/components/shared/raceLive';
import { frenchOrdinal } from '@/features/game/utils/frenchOrdinals';
import { GAME_COPY } from '../../../../copy/gameCopy';
import type { RaceBoardState } from '../../../../state/gameReducer';
import { RaceBoard } from './RaceBoard';

interface RaceLaneDoneProps {
  foundCount: number;
  players: GamePlayer[];
  board: RaceBoardState | null;
  currentUserId: string;
  onOpenRoster?: () => void;
}

/**
 * Shown once my lane is over and others are still racing. The stage is gone,
 * so the full roster (8 lanes at most) fits under the place card.
 */
export const RaceLaneDone = memo(function RaceLaneDone({
  foundCount,
  players,
  board,
  currentUserId,
  onOpenRoster,
}: RaceLaneDoneProps) {
  const now = useRaceNow(board);
  const mine = useMemo(() => {
    if (!board) return null;
    return liveRaceRows(board, now).find((row) => row.userId === String(currentUserId)) ?? null;
  }, [board, currentUserId, now]);

  return (
    <div className="flex w-full max-w-[850px] flex-col items-center gap-3" role="status">
      <div className="glass-card flex w-full flex-col items-center gap-1 px-6 py-4 text-center">
        <p className="text-sm font-medium text-muted-foreground">{GAME_COPY.race.laneDoneNow}</p>
        <p className="font-display text-4xl font-black tabular-nums text-primary">
          {mine ? frenchOrdinal(mine.rank) : '—'}
        </p>
        <FoundHeard found={mine?.found ?? foundCount} heard={mine?.heard ?? foundCount} prominent />
        <p className="mt-1 animate-pulse text-sm font-medium text-primary">
          {GAME_COPY.race.laneDoneWaiting}
        </p>
      </div>
      <RaceBoard
        players={players}
        board={board}
        currentUserId={currentUserId}
        onOpenRoster={onOpenRoster}
        maxRows={TIME_ATTACK_RACE_MAX_PLAYERS}
      />
    </div>
  );
});
