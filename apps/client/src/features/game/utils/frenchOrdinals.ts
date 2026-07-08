/** User-facing French ordinal for competition ranks (isolated for future i18n). */

export function frenchOrdinal(rank: number): string {
  if (rank === 1) return '1re';
  return `${rank}e`;
}

/** e.g. « à la 1re place », « à la 5e place » */
export function frenchRankPlacePhrase(rank: number): string {
  if (rank === 1) return 'à la 1re place';
  return `à la ${rank}e place`;
}

/** Subtitle for a non-winning multi finish. */
export function multiFinishSubtitle(rank: number): string {
  return `Vous terminez ${frenchRankPlacePhrase(rank)}.`;
}
