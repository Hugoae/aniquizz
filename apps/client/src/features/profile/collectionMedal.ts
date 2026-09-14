// Medal tiers for the Pokédex Musical collection progress. Purely presentational
// and computed client-side from the completion percentage.

export interface CollectionMedal {
  key: 'bronze' | 'silver' | 'gold' | 'platinum';
  label: string;
  /** Completion threshold (%) required to reach this medal. */
  min: number;
  /** Tailwind text token for the icon/label (no hex). */
  textClass: string;
}

// Ascending by threshold — also drives the caps drawn on the progress bar.
export const COLLECTION_MEDALS: CollectionMedal[] = [
  { key: 'bronze', label: 'Bronze', min: 25, textClass: 'text-medal-bronze' },
  { key: 'silver', label: 'Argent', min: 50, textClass: 'text-silver' },
  { key: 'gold', label: 'Or', min: 75, textClass: 'text-warning' },
  { key: 'platinum', label: 'Platine', min: 100, textClass: 'text-aqua' },
];

/** Highest medal earned for a given completion percentage (null under 25 %). */
export function collectionMedal(percent: number): CollectionMedal | null {
  return [...COLLECTION_MEDALS].reverse().find((m) => percent >= m.min) ?? null;
}
