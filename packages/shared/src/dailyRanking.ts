import type { DailyRankInput } from './dailyTypes';

/** Rank by correct answers, then faster cumulative time. Completion instant is list-order only. */
export function compareDailyLeaderboard(a: DailyRankInput, b: DailyRankInput): number {
  if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
  if (a.totalResponseMs !== b.totalResponseMs) return a.totalResponseMs - b.totalResponseMs;
  return a.completedAtMs - b.completedAtMs;
}

export function assignDailyRanks(rows: DailyRankInput[]): Map<string, number> {
  const sorted = [...rows].sort(compareDailyLeaderboard);
  const ranks = new Map<string, number>();
  let lastSignature: string | null = null;
  let lastRank = 0;
  sorted.forEach((row, index) => {
    const signature = `${row.correctCount}:${row.totalResponseMs}`;
    const rank = lastSignature === signature ? lastRank : index + 1;
    ranks.set(row.id, rank);
    lastSignature = signature;
    lastRank = rank;
  });
  return ranks;
}
