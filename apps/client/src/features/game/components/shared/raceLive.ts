import { useEffect, useState } from 'react';
import { rankRaceStandings, type RaceBoardEntry } from '@aniquizz/shared';

/** Rows kept on the in-match board; the rest live in the sidebar. */
export const RACE_BOARD_PREVIEW = 4;

/** Displayed clock goes red under this many seconds. */
export const RACE_CLOCK_URGENT_SECONDS = 15;

export interface LiveRaceRow {
  userId: string;
  rank: number;
  found: number;
  heard: number;
  remainingMs: number;
  finished: boolean;
  running: boolean;
  streak: number;
}

interface RaceBoardSnapshot {
  entries: RaceBoardEntry[];
  receivedAt: number;
}

/** Budget left right now: running lanes keep counting down from the last snapshot. */
export function liveRemainingMs(entry: RaceBoardEntry, receivedAt: number, now: number): number {
  if (!entry.running || entry.finished) return entry.remainingMs;
  return Math.max(0, entry.remainingMs - (now - receivedAt));
}

/** True once the clock the player sees is strictly under 15 seconds. */
export function isRaceClockUrgent(remainingMs: number, finished: boolean): boolean {
  if (finished) return false;
  return Math.ceil(Math.max(0, remainingMs) / 1000) < RACE_CLOCK_URGENT_SECONDS;
}

/** Local clock for a live board. Ticks only while a lane is still running. */
export function useRaceNow(board: RaceBoardSnapshot | null): number {
  const anyRunning = board?.entries.some((entry) => entry.running && !entry.finished) ?? false;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!anyRunning) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [anyRunning, board?.receivedAt]);

  return now;
}

/** Same order as the final ranking: most found, then fewest heard, then time left. */
export function liveRaceRows(board: RaceBoardSnapshot, now: number): LiveRaceRow[] {
  const byId = new Map(board.entries.map((entry) => [entry.userId, entry]));
  return rankRaceStandings(
    board.entries.map((entry) => ({
      userId: entry.userId,
      found: entry.foundCount,
      heard: entry.heardCount,
      remainingMs: liveRemainingMs(entry, board.receivedAt, now),
    })),
  ).map((standing) => {
    const entry = byId.get(standing.userId)!;
    return {
      userId: standing.userId,
      rank: standing.rank,
      found: standing.found,
      heard: standing.heard,
      remainingMs: standing.remainingMs,
      finished: entry.finished,
      running: entry.running,
      streak: entry.streak,
    };
  });
}
