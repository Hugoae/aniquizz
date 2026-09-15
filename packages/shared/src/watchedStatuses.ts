/**
 * List statuses that count toward the Watched song pool.
 * Planning / plan-to-watch stays out — the player has not started the show.
 */

/** AniList `MediaListStatus` values included in Watched. */
export const WATCHED_ANILIST_STATUSES = [
  'COMPLETED',
  'CURRENT',
  'PAUSED',
  'REPEATING',
  'DROPPED',
] as const;

export type WatchedAnilistStatus = (typeof WATCHED_ANILIST_STATUSES)[number];

export const WATCHED_ANILIST_STATUS_SET: ReadonlySet<string> = new Set(WATCHED_ANILIST_STATUSES);

/** MAL animelist `status` query values included in Watched. */
export const WATCHED_MAL_STATUSES = ['watching', 'completed', 'on_hold', 'dropped'] as const;

export type WatchedMalStatus = (typeof WATCHED_MAL_STATUSES)[number];

export const WATCHED_MAL_STATUS_SET: ReadonlySet<string> = new Set(WATCHED_MAL_STATUSES);

/**
 * Product names shown in French UI (AniList / MAL keep English list titles).
 * Order matches how the lists appear on those sites.
 */
export const WATCHED_LIST_STATUS_LABELS = [
  'Completed',
  'Watching',
  'On-Hold',
  'Rewatching',
  'Dropped',
] as const;
