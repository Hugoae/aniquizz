/** Minimal player shape for competition ranking. */
export interface RankedScoreInput {
  id: string;
  score: number;
}

/**
 * Competition ranking ("1-2-2-4"): equal scores share the same place and the
 * next distinct score skips tied slots.
 *
 * @returns Map keyed by `id` → rank (1-based).
 */
export function computeCompetitionRanks(players: RankedScoreInput[]): Map<string, number> {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const ranks = new Map<string, number>();
  let lastScore: number | null = null;
  let lastRank = 0;

  sorted.forEach((player, index) => {
    const rank = lastScore !== null && player.score === lastScore ? lastRank : index + 1;
    ranks.set(player.id, rank);
    lastScore = player.score;
    lastRank = rank;
  });

  return ranks;
}

/** Distinct competition ranks in score order (e.g. [1, 2, 5] when rank 2 is tied). */
export function distinctRanksInOrder(
  sortedPlayers: RankedScoreInput[],
  ranks: Map<string, number>,
): number[] {
  const distinct: number[] = [];
  for (const player of sortedPlayers) {
    const rank = ranks.get(player.id);
    if (rank == null) continue;
    if (!distinct.includes(rank)) distinct.push(rank);
  }
  return distinct;
}
