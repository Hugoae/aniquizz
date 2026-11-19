import i18n from '@/lib/i18n';

/** Arrival order at the reveal. French uses 1er / 2e. English uses 1st / 2nd / 3rd. */
export function formatSpeedRankLabel(rank: number): string {
  if (i18n.language.startsWith('en')) return englishOrdinal(rank);
  if (rank === 1) return '1er';
  return `${rank}e`;
}

function englishOrdinal(rank: number): string {
  const mod100 = rank % 100;
  const mod10 = rank % 10;
  if (mod100 >= 11 && mod100 <= 13) return `${rank}th`;
  if (mod10 === 1) return `${rank}st`;
  if (mod10 === 2) return `${rank}nd`;
  if (mod10 === 3) return `${rank}rd`;
  return `${rank}th`;
}
