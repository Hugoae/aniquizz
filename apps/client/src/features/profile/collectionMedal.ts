// Medal tiers for the Pokédex Musical collection progress. Purely presentational
// and computed client-side from the completion percentage.

export interface CollectionMedal {
  key: 'bronze' | 'silver' | 'gold' | 'platinum';
  label: string;
  /** Completion threshold (%) required to reach this medal. */
  min: number;
  /** Metallic accent color (hex) used for the icon/label. */
  color: string;
}

// Ascending by threshold — also drives the caps drawn on the progress bar.
export const COLLECTION_MEDALS: CollectionMedal[] = [
  { key: 'bronze', label: 'Bronze', min: 25, color: '#C67B48' },
  { key: 'silver', label: 'Argent', min: 50, color: '#CBD5E1' },
  { key: 'gold', label: 'Or', min: 75, color: '#FACC15' },
  { key: 'platinum', label: 'Platine', min: 100, color: '#22D3EE' },
];

/** Highest medal earned for a given completion percentage (null under 25 %). */
export function collectionMedal(percent: number): CollectionMedal | null {
  return [...COLLECTION_MEDALS].reverse().find((m) => percent >= m.min) ?? null;
}
