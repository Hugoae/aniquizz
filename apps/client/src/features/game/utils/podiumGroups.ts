import type { GamePlayer } from '@aniquizz/shared';

export interface PodiumSlot {
  /** Visual step styling (1 = gold / center, 2 = silver / left, 3 = bronze / right). */
  step: 1 | 2 | 3;
  /** Competition rank shown on the badge (may skip numbers when tied). */
  rank: number;
  players: GamePlayer[];
  representative: GamePlayer;
}

export interface PodiumLayout {
  left: PodiumSlot | null;
  center: PodiumSlot | null;
  right: PodiumSlot | null;
}

/** Prefer the tied player with the most correct answers, then highest score. */
function pickRepresentative(players: GamePlayer[]): GamePlayer {
  return [...players].sort((a, b) => {
    const correctDiff = (b.matchCorrectCount ?? 0) - (a.matchCorrectCount ?? 0);
    if (correctDiff !== 0) return correctDiff;
    return b.score - a.score;
  })[0];
}

/** Group sorted players by competition rank and pick up to 3 distinct rank tiers for the podium. */
export function buildPodiumLayout(sortedPlayers: GamePlayer[], ranks: Map<string, number>): PodiumLayout {
  const distinctRanks = getDistinctRanks(sortedPlayers, ranks);

  const slots: PodiumSlot[] = distinctRanks.slice(0, 3).map((rank, index) => {
    const step = (index + 1) as 1 | 2 | 3;
    const players = sortedPlayers.filter((p) => ranks.get(String(p.id)) === rank);
    return {
      step,
      rank,
      players,
      representative: pickRepresentative(players),
    };
  });

  const byStep = (step: 1 | 2 | 3) => slots.find((s) => s.step === step) ?? null;

  return {
    left: byStep(2),
    center: byStep(1),
    right: byStep(3),
  };
}

/** Competition ranks in score order (e.g. [1, 2, 5, 6] when ties skip slots). */
export function getDistinctRanks(sortedPlayers: GamePlayer[], ranks: Map<string, number>): number[] {
  const distinct: number[] = [];
  for (const player of sortedPlayers) {
    const rank = ranks.get(String(player.id));
    if (rank == null) continue;
    if (!distinct.includes(rank)) distinct.push(rank);
  }
  return distinct;
}

/** Map a competition rank to a podium tier (1–3) if it appears in the top 3 distinct ranks. */
export function podiumTierForRank(rank: number, distinctRanks: number[]): 1 | 2 | 3 | null {
  const idx = distinctRanks.indexOf(rank);
  if (idx < 0 || idx > 2) return null;
  return (idx + 1) as 1 | 2 | 3;
}
