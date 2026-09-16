/** French ordinals for speed-bonus arrival order at reveal. */
export function formatSpeedRankLabel(rank: number): string {
  if (rank === 1) return '1er';
  return `${rank}e`;
}
