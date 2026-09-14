import { GAME_CONFIG } from './constants';
import type { MatchHistoryEntry } from './game';
import { addCalendarDays } from './dailyCalendar';
import {
  DAILY_ROUND_COUNT,
  DAILY_WIN_MIN_CORRECT,
  DAILY_XP_PERFECT_BONUS,
  DAILY_XP_WIN_BONUS,
} from './dailyConstants';

/** Recap victory from `DAILY_WIN_MIN_CORRECT`, or all remaining songs if the day is shorter. */
export function isDailyVictory(
  correctCount: number,
  activeRoundCount = DAILY_ROUND_COUNT,
): boolean {
  const active = Math.max(0, Math.round(activeRoundCount));
  if (active <= 0) return false;
  const n = Math.max(0, Math.round(correctCount));
  return n >= Math.min(DAILY_WIN_MIN_CORRECT, active);
}

/**
 * Daily XP uses the same participation + correct rates as a match, plus a win
 * / perfect bonus. A full 0/5 day is 15 XP; a perfect 5/5 is 105.
 */
export function dailyXp(correctCount: number, activeRoundCount = DAILY_ROUND_COUNT): number {
  const L = GAME_CONFIG.LEVELING;
  const active = Math.max(0, Math.round(activeRoundCount));
  const n = Math.min(active, Math.max(0, Math.round(correctCount)));
  if (active <= 0) return 0;
  const participation = active * L.XP_PER_ROUND;
  const correct = n * L.XP_PER_CORRECT;
  const win = isDailyVictory(n, active) ? DAILY_XP_WIN_BONUS : 0;
  const perfect = n === active ? DAILY_XP_PERFECT_BONUS : 0;
  return Math.max(L.MIN_XP, participation + correct + win + perfect);
}

export const PROFILE_HISTORY_TAKE = 8;

export function toDailyHistoryEntry(input: {
  id: string;
  playedAt: Date | string;
  challengeNumber: number;
  correctCount: number;
  activeRoundCount: number;
  xpAwarded: number;
  won: boolean;
  totalResponseMs: number;
  rank?: number | null;
}): MatchHistoryEntry {
  const playedAt = input.playedAt instanceof Date ? input.playedAt.toISOString() : input.playedAt;
  return {
    id: input.id,
    playedAt,
    mode: 'DAILY',
    kind: 'daily',
    answerMode: 'QCM',
    totalRounds: input.activeRoundCount,
    score: 0,
    rank: input.rank ?? null,
    isWinner: input.won,
    correctCount: input.correctCount,
    xpEarned: input.xpAwarded,
    playerCount: 1,
    durationMs: null,
    challengeNumber: input.challengeNumber,
    totalResponseMs: input.totalResponseMs,
  };
}

export function mergeProfileHistory(
  matches: MatchHistoryEntry[],
  dailies: MatchHistoryEntry[],
  take = PROFILE_HISTORY_TAKE,
): MatchHistoryEntry[] {
  return [...matches, ...dailies]
    .sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime())
    .slice(0, take);
}

export function nextDailyStreak(input: {
  currentStreak: number;
  longestStreak: number;
  lastCompletionDate: string | null;
  challengeDate: string;
}): { currentStreak: number; longestStreak: number } {
  if (input.lastCompletionDate === input.challengeDate) {
    return {
      currentStreak: input.currentStreak,
      longestStreak: Math.max(input.longestStreak, input.currentStreak),
    };
  }
  const continued = Boolean(
    input.lastCompletionDate &&
    addCalendarDays(input.lastCompletionDate, 1) === input.challengeDate,
  );
  const currentStreak = continued ? input.currentStreak + 1 : 1;
  return {
    currentStreak,
    longestStreak: Math.max(input.longestStreak, currentStreak),
  };
}

export type DailyCareerSummary = {
  dailyTotalCorrect: number;
  dailyTotalResponseMs: number;
  dailyAvgRank: number | null;
  dailyBestRank: number | null;
  dailyAvgTimeMs: number | null;
  dailyBestTimeMs: number | null;
};

const EMPTY_DAILY_CAREER: DailyCareerSummary = {
  dailyTotalCorrect: 0,
  dailyTotalResponseMs: 0,
  dailyAvgRank: null,
  dailyBestRank: null,
  dailyAvgTimeMs: null,
  dailyBestTimeMs: null,
};

/**
 * Same rounding as `summarizeDailyCareer`, from SQL `_sum` / `_avg` / `_min`
 * so profile stats never load every daily attempt into Node.
 */
export function summarizeDailyCareerFromAggregates(input: {
  count: number;
  totalCorrect: number;
  totalMs: number;
  avgRank: number | null;
  bestRank: number | null;
  bestTimeMs: number | null;
}): DailyCareerSummary {
  if (input.count <= 0) return EMPTY_DAILY_CAREER;
  return {
    dailyTotalCorrect: input.totalCorrect,
    dailyTotalResponseMs: input.totalMs,
    dailyAvgRank: input.avgRank == null ? null : Math.round(input.avgRank * 10) / 10,
    dailyBestRank: input.bestRank,
    dailyAvgTimeMs: Math.round(input.totalMs / input.count),
    dailyBestTimeMs: input.bestTimeMs,
  };
}

export function summarizeDailyCareer(
  rows: Array<{ rank: number | null; totalResponseMs: number; correctCount: number }>,
): DailyCareerSummary {
  if (rows.length === 0) return EMPTY_DAILY_CAREER;
  let totalCorrect = 0;
  let totalMs = 0;
  let rankSum = 0;
  let rankN = 0;
  let bestRank: number | null = null;
  let bestTime: number | null = null;
  for (const row of rows) {
    totalCorrect += row.correctCount;
    totalMs += row.totalResponseMs;
    if (row.rank != null) {
      rankSum += row.rank;
      rankN += 1;
      bestRank = bestRank == null ? row.rank : Math.min(bestRank, row.rank);
    }
    bestTime = bestTime == null ? row.totalResponseMs : Math.min(bestTime, row.totalResponseMs);
  }
  return summarizeDailyCareerFromAggregates({
    count: rows.length,
    totalCorrect,
    totalMs,
    avgRank: rankN > 0 ? rankSum / rankN : null,
    bestRank,
    bestTimeMs: bestTime,
  });
}
