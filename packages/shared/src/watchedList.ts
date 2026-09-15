/** Watched-mode list provider linked on a profile. */

export type WatchedListProvider = 'anilist' | 'mal';

/** AniList / MAL handle after URL extract. Generous vs MAL's 16-char official cap. */
export const MAX_WATCHLIST_HANDLE_LENGTH = 64;
/** Raw paste in the link dialog (profile URL before normalize). */
export const MAX_WATCHLIST_USERNAME_INPUT_LENGTH = 200;
/** Client correlation id on lists:* mutators. */
export const MAX_LIST_REQUEST_ID_LENGTH = 100;

export interface WatchedListFields {
  anilistUsername?: string | null;
  malUsername?: string | null;
  /** Prisma stores a string; `resolveActiveListProvider` narrows it. */
  activeListProvider?: string | null;
}

/** True when the profile has AniList or MAL linked for Watched mode. */
export function hasWatchedListLink(fields: WatchedListFields): boolean {
  return Boolean(fields.anilistUsername?.trim() || fields.malUsername?.trim());
}

export function isWatchedListProvider(value: unknown): value is WatchedListProvider {
  return value === 'anilist' || value === 'mal';
}

/**
 * Strict active source with a safe fallback if the preferred provider was unlinked.
 * Historical default when both exist and no preference is stored: AniList first.
 */
export function resolveActiveListProvider(fields: WatchedListFields): WatchedListProvider | null {
  const anilist = Boolean(fields.anilistUsername?.trim());
  const mal = Boolean(fields.malUsername?.trim());
  const preferred = isWatchedListProvider(fields.activeListProvider)
    ? fields.activeListProvider
    : null;
  if (preferred === 'anilist' && anilist) return 'anilist';
  if (preferred === 'mal' && mal) return 'mal';
  if (anilist) return 'anilist';
  if (mal) return 'mal';
  return null;
}

/** Which provider is linked, or null when none. Prefer resolveActiveListProvider. */
export function watchedListProvider(fields: WatchedListFields): WatchedListProvider | null {
  return resolveActiveListProvider(fields);
}

export type ListFetchState =
  'idle' | 'ok' | 'cache' | 'stale' | 'private_empty' | 'unavailable' | 'unlinked';

export interface ListProviderStatus {
  provider: WatchedListProvider;
  username: string | null;
  linked: boolean;
  active: boolean;
  lastSync: string | null;
  animeCount: number | null;
  state: ListFetchState;
}

export interface ListsStatusPayload {
  anilist: ListProviderStatus;
  mal: ListProviderStatus;
  active: WatchedListProvider | null;
}

export type ListOperation = 'link' | 'set_active' | 'refresh' | 'unlink';

export interface ListOperationResult {
  requestId: string;
  operation: ListOperation;
  provider: WatchedListProvider;
  status: ListsStatusPayload;
}

export interface ListOperationError {
  requestId: string;
  operation: ListOperation;
  provider: WatchedListProvider | null;
  message: string;
}
