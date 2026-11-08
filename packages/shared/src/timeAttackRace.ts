// Versus time-attack (Contre-la-montre multijoueur): every player runs their own
// lane over the same playlist, so the winner is whoever found the most titles.
// Pure ranking helpers shared by the engine and tests.

import { GAME_CONFIG } from './constants';

export interface RaceStandingInput {
  userId: string;
  /** Titles found (the race score). */
  found: number;
  /** Titles started, including the clip on screen. Fewer is better on a tie. */
  heard: number;
  /** Budget left when the lane ended. Shown on the board; it does not change the rank. */
  remainingMs: number;
}

export interface RaceStanding extends RaceStandingInput {
  /** Competition rank (1-2-2-4): equal results share a place. */
  rank: number;
}

/**
 * Orders lanes by titles found, then fewer titles heard (8/13 beats 8/15).
 * The same found / heard pair shares a rank; time left does not split it.
 * Input order is kept inside a tie.
 */
export function rankRaceStandings(inputs: RaceStandingInput[]): RaceStanding[] {
  const sorted = [...inputs].sort((a, b) => b.found - a.found || a.heard - b.heard);
  let previous: RaceStandingInput | null = null;
  let previousRank = 0;
  return sorted.map((entry, index) => {
    const tied =
      previous !== null && previous.found === entry.found && previous.heard === entry.heard;
    const rank = tied ? previousRank : index + 1;
    previous = entry;
    previousRank = rank;
    return { ...entry, rank };
  });
}

/**
 * Same rule as Standard multi: rank 1 wins below the podium threshold, the top
 * three (ties on the line included) from that size on. A lane with no title
 * found never wins.
 */
export function computeRaceWinners(standings: RaceStanding[]): {
  winnerIds: string[];
  winnerCount: number;
} {
  const winnerCount =
    standings.length >= GAME_CONFIG.VICTORY_CONDITIONS.MULTI.PODIUM_THRESHOLD ? 3 : 1;
  if (standings.length === 0) return { winnerIds: [], winnerCount };
  const cutoffRank = standings[Math.min(winnerCount, standings.length) - 1]!.rank;
  const winnerIds = standings
    .filter((entry) => entry.found > 0 && entry.rank <= cutoffRank)
    .map((entry) => entry.userId);
  return { winnerIds, winnerCount };
}
