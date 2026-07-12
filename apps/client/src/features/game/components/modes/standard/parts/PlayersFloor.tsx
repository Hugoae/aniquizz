import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Users } from 'lucide-react';
import type { GamePlayer } from '@aniquizz/shared';
import { cn } from '@/lib/utils';
import { PlayerCard } from '../../../shared/PlayerCard';
import { PointsBadge } from '../../../shared/PointsBadge';
import { computeRanks, activeMatchPlayers, hasRankingSpread } from '../../../../utils/ranking';

/** Max cards shown under the video: the local player + the best others. */
const FLOOR_CAP = 8;

interface PlayersFloorProps {
  players: GamePlayer[];
  currentUserId: string;
  showResult: boolean;
  showPointsAnimation: boolean;
  pointsEarned: number | null;
  /** Hide rank pills in solo — only one human, no competition context. */
  showRank?: boolean;
  /** Opens the side roster (full ranking) when players overflow the cap. */
  onOpenRoster?: () => void;
}

export function PlayersFloor({
  players,
  currentUserId,
  showResult,
  showPointsAnimation,
  pointsEarned,
  showRank = true,
  onOpenRoster,
}: PlayersFloorProps) {
  const reduceMotion = useReducedMotion();
  const roster = useMemo(() => activeMatchPlayers(players), [players]);

  // The local player is always pinned first; the rest are the top scorers.
  const { displayed, hiddenCount } = useMemo(() => {
    const me = roster.find((p) => String(p.id) === String(currentUserId));
    const others = roster
      .filter((p) => String(p.id) !== String(currentUserId))
      .sort((a, b) => b.score - a.score);
    const ordered = me ? [me, ...others] : others;
    const shown = ordered.slice(0, FLOOR_CAP);
    return { displayed: shown, hiddenCount: roster.length - shown.length };
  }, [roster, currentUserId]);

  // Competition ranks over the active match roster (ties share a place).
  const ranks = useMemo(() => computeRanks(roster), [roster]);
  const rankingEstablished = useMemo(() => hasRankingSpread(roster), [roster]);

  // Flash a card when its player climbs the ranking (new rank strictly better).
  const prevRanksRef = useRef<Map<string, number>>(new Map());
  const [climbers, setClimbers] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!showRank || !rankingEstablished) return;
    const prev = prevRanksRef.current;
    const improved = new Set<string>();
    if (!reduceMotion) {
      ranks.forEach((rank, id) => {
        const before = prev.get(id);
        if (before !== undefined && rank < before) improved.add(id);
      });
    }
    prevRanksRef.current = ranks;
    if (improved.size === 0) return;
    setClimbers(improved);
    const t = setTimeout(() => setClimbers(new Set()), 900);
    return () => clearTimeout(t);
  }, [ranks, reduceMotion, showRank, rankingEstablished]);

  // Keep the floor to at most two balanced rows: up to 4 cards fit on one row;
  // beyond that we split evenly (8 → 4+4, 6 → 3+3) so there's never a lonely
  // trailing card on a third line.
  const columns = displayed.length <= 4 ? displayed.length : Math.ceil(displayed.length / 2);

  return (
    <div
      className={cn(
        'custom-scrollbar w-full flex-1 min-h-0 overflow-y-auto px-4 pb-3 transition-[padding] duration-300',
        // Reveal shows an answer bubble above every card, so we need generous
        // vertical room. While guessing there are no bubbles → stay compact so a
        // 4-choice QCM never pushes the floor into a scroll.
        showResult ? 'pt-16' : 'pt-6',
      )}
    >
      {/* Fixed column count keeps the floor to two predictable rows. */}
      <div
        className={cn(
          // Generous horizontal gap so a card's streak badge never crowds the
          // next card's rank pill (both overflow their corners).
          'mx-auto grid w-full max-w-4xl justify-center gap-x-8',
          showResult ? 'gap-y-20' : 'gap-y-6',
        )}
        style={{ gridTemplateColumns: `repeat(${Math.max(1, columns)}, minmax(0, 210px))` }}
      >
        {displayed.map((p) => {
          const isMe = String(p.id) === String(currentUserId);
          return (
            <motion.div
              key={p.id}
              layout={!reduceMotion}
              transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              className="relative flex w-full max-w-full justify-center"
            >
              <PlayerCard
                player={p}
                isCurrentUser={isMe}
                showResult={showResult}
                rank={showRank ? ranks.get(String(p.id)) : undefined}
                rankPending={showRank && !rankingEstablished}
                flash={showRank && rankingEstablished && climbers.has(String(p.id))}
              />
              {isMe && showPointsAnimation && pointsEarned && (
                <div className="absolute -right-2 -top-4 z-20 animate-fade-in">
                  <PointsBadge points={pointsEarned} />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {hiddenCount > 0 && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={onOpenRoster}
            className="flex items-center gap-2 rounded-full border border-border/60 bg-card/95 px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm transition-colors hover:border-primary/40 hover:text-primary"
          >
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            +{hiddenCount} autre{hiddenCount > 1 ? 's' : ''} — voir le classement
          </button>
        </div>
      )}
    </div>
  );
}
