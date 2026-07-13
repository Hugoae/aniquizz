/** French ordinals for Quick Draw arrival order at reveal. */
export function formatSpeedRankLabel(rank: number): string {
  if (rank === 1) return '1er';
  return `${rank}e`;
}
