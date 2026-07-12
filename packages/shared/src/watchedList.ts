/** Watched-mode list provider linked on a profile (mutually exclusive). */
export type WatchedListProvider = 'anilist' | 'mal';

export interface WatchedListFields {
  anilistUsername?: string | null;
  malUsername?: string | null;
}

/** True when the profile has AniList or MAL linked for Watched mode. */
export function hasWatchedListLink(fields: WatchedListFields): boolean {
  return Boolean(fields.anilistUsername?.trim() || fields.malUsername?.trim());
}

/** Which provider is linked, or null when none. */
export function watchedListProvider(fields: WatchedListFields): WatchedListProvider | null {
  if (fields.anilistUsername?.trim()) return 'anilist';
  if (fields.malUsername?.trim()) return 'mal';
  return null;
}
