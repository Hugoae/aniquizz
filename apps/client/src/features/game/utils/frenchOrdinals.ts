import i18n from '@/lib/i18n';
import { formatSpeedRankLabel } from '@/features/game/copy/speedRankCopy';

/** Place ordinal. French keeps 1re for “place”; speed rank uses 1er. */
export function frenchOrdinal(rank: number): string {
  if (i18n.language.startsWith('en')) return formatSpeedRankLabel(rank);
  if (rank === 1) return '1re';
  return `${rank}e`;
}

export function frenchRankPlacePhrase(rank: number): string {
  if (i18n.language.startsWith('en')) return `in ${formatSpeedRankLabel(rank)} place`;
  if (rank === 1) return 'à la 1re place';
  return `à la ${rank}e place`;
}

export function multiFinishSubtitle(rank: number): string {
  if (i18n.language.startsWith('en')) return `You finish ${frenchRankPlacePhrase(rank)}.`;
  return `Vous terminez ${frenchRankPlacePhrase(rank)}.`;
}
