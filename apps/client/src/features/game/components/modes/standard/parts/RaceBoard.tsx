import { memo, useMemo } from 'react';
import { Flag, Users } from 'lucide-react';
import type { GamePlayer } from '@aniquizz/shared';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/UserAvatar';
import {
  liveRaceRows,
  RACE_BOARD_PREVIEW,
  useRaceNow,
} from '@/features/game/components/shared/raceLive';
import {
  FoundHeard,
  RaceClockLabel,
  StreakFlame,
} from '@/features/game/components/shared/RaceLaneStats';
import { GAME_COPY } from '../../../../copy/gameCopy';
import type { RaceBoardState } from '../../../../state/gameReducer';
import { playerDisplayName, rankAccent } from '../../../../utils/ranking';

interface RaceBoardProps {
  players: GamePlayer[];
  board: RaceBoardState | null;
  currentUserId: string;
  /** Opens the side roster, which lists every lane. */
  onOpenRoster?: () => void;
  /** How many rows to keep before the "see ranking" button. The wait screen shows every lane. */
  maxRows?: number;
  className?: string;
}

/**
 * Live versus board: found / heard and budget left per lane, never a title.
 * Only the first rows stay here; the rest open in the sidebar.
 */
export const RaceBoard = memo(function RaceBoard({
  players,
  board,
  currentUserId,
  onOpenRoster,
  maxRows = RACE_BOARD_PREVIEW,
  className,
}: RaceBoardProps) {
  const now = useRaceNow(board);
  const rows = useMemo(() => {
    if (!board) return [];
    const byId = new Map(players.map((player) => [String(player.id), player]));
    return liveRaceRows(board, now).map((row) => ({
      row,
      player: byId.get(row.userId),
    }));
  }, [board, players, now]);

  if (rows.length === 0) return null;

  const visible = rows.slice(0, maxRows);
  const hiddenCount = rows.length - visible.length;

  return (
    <section
      aria-label={GAME_COPY.race.boardAria}
      className={cn('glass-card w-full max-w-[850px] p-3', className)}
    >
      <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Flag className="h-3.5 w-3.5" aria-hidden />
        {GAME_COPY.race.boardTitle}
      </h2>
      <ol className="flex flex-col gap-1.5">
        {visible.map(({ row, player }) => {
          const mine = row.userId === String(currentUserId);
          const name = player ? playerDisplayName(player) : 'Joueur';
          return (
            <li
              key={row.userId}
              className={cn(
                'flex items-center gap-3 rounded-lg border px-2.5 py-1.5',
                mine ? 'border-primary/40 bg-primary/10' : 'border-border/60 bg-card/60',
                player?.isConnected === false && 'opacity-60',
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold',
                  rankAccent(row.rank),
                )}
              >
                #{row.rank}
              </span>
              {player && (
                <UserAvatar avatar={player.avatar} username={name} className="h-7 w-7 shrink-0" />
              )}
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {name}
                {mine && <span className="ml-1 text-xs text-primary">({GAME_COPY.race.you})</span>}
              </span>
              <StreakFlame streak={row.streak} />
              <FoundHeard found={row.found} heard={row.heard} className="text-sm" />
              <RaceClockLabel
                remainingMs={row.remainingMs}
                finished={row.finished}
                className="w-16 text-right text-sm"
              />
            </li>
          );
        })}
      </ol>
      {hiddenCount > 0 && (
        <div className="mt-2 flex justify-center">
          <button
            type="button"
            onClick={onOpenRoster}
            className="flex items-center gap-2 rounded-full border border-border/60 bg-card/95 px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm transition-colors hover:border-primary/40 hover:text-primary"
          >
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            {GAME_COPY.race.seeRanking(hiddenCount)}
          </button>
        </div>
      )}
    </section>
  );
});
