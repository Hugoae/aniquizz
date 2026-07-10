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
  watchedMode?: 'union' | 'intersection';
}

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
