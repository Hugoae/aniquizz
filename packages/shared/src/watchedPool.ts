// packages/shared/src/watchedPool.ts
// Watched / AniList pool helpers shared by client and server.

/** Stats for the resolved Watched pool (solo list or lobby union/intersection). */
export interface WatchedPoolStats {
  /** Distinct AniList anime ids in the resolved pool. */
  animeCount: number;
  /** Playable songs (COMPLETED) matching current filters. */
  playableSongs: number;
  /** Rounds requested in room settings. */
  soundCount: number;
  /** True when playableSongs < soundCount (host may opt in to random completion). */
  insufficient: boolean;
  /** Distinct choice names in the playable Watched pool (QCM gate). */
  distinctNames?: number;
  watchedMode?: 'union' | 'intersection';
  /**
   * AniList GraphQL failed (5xx, 403/429, timeout, backoff).
   * Ids may still be a last-success cache (`stale`); the UI must warn, not stay silent.
   */
  listError?: 'anilist_blocked';
}

/** Shown when Watched pool is empty because AniList's API is down, not the player's list. */
export const ANILIST_API_DOWN_MESSAGE = "L'API AniList est down. Réessaie plus tard.";

export const isWatchedPoolInsufficient = (playableSongs: number, soundCount: number): boolean =>
  playableSongs < soundCount;

/** Reconcile pool stats with the current requested round count (live settings edits). */
export const withWatchedPoolSoundCount = (
  stats: WatchedPoolStats | null | undefined,
  soundCount: number | undefined,
): WatchedPoolStats | null | undefined => {
  if (!stats || soundCount == null || stats.soundCount === soundCount) return stats;
  return {
    ...stats,
    soundCount,
    insufficient: isWatchedPoolInsufficient(stats.playableSongs, soundCount),
  };
};
