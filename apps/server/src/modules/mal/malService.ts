import axios from 'axios';
import { prisma } from '@aniquizz/database';
import {
  WATCHED_MAL_STATUSES,
  WATCHED_MAL_STATUS_SET,
  type WatchedMalStatus,
} from '@aniquizz/shared';
import { logger } from '../../utils/logger';
import { normalizeMalUsername } from '../lists/watchlistUsername';

const MAL_API_BASE = 'https://api.myanimelist.net/v2';
const CACHE_DURATION_MS = 10 * 60 * 1000;
const PAGE_LIMIT = 1000;

export type MalVerifyResult = 'exists' | 'not_found' | 'unverified' | 'unconfigured';

/** Website HEAD needs a browser-like UA; axios' default is rejected. Existence only. */
const MAL_PROFILE_UA = 'Mozilla/5.0 AniQuizz-list-verify';

interface MalListEntry {
  node?: { id?: number };
  list_status?: { status?: string };
}

interface MalListResponse {
  data?: MalListEntry[];
  paging?: { next?: string };
}

interface CacheEntry {
  timestamp: number;
  promise: Promise<MalListResult>;
  value?: MalListResult;
}

const userCache = new Map<string, CacheEntry>();
const cacheKey = (username: string): string => username.trim().toLocaleLowerCase();

export const invalidateMalUserCache = (username: string): void => {
  userCache.delete(cacheKey(username));
};

/** Settled in-memory MAL list, or null when cold / expired. Never starts a fetch. */
export const peekMalListCache = (username: string, now = Date.now()): MalListResult | null => {
  const name = normalizeMalUsername(username);
  if (!name) return null;
  const cached = userCache.get(cacheKey(name));
  if (!cached?.value) return null;
  if (now - cached.timestamp >= CACHE_DURATION_MS) return null;
  return cached.value;
};

export interface MalListResult {
  ids: number[];
  state: 'ok' | 'cache' | 'private_empty' | 'unavailable';
  /** True only when MAL answered this fetch, including a private/empty list. */
  fromNetwork: boolean;
}

const getClientId = (): string | null => {
  const id = process.env.MAL_CLIENT_ID?.trim();
  return id || null;
};

const malHeaders = (): Record<string, string> | null => {
  const clientId = getClientId();
  if (!clientId) return null;
  return { 'X-MAL-CLIENT-ID': clientId };
};

/**
 * Official animelist 404s both missing users and private lists. Fall back to a
 * profile HEAD so a valid private account can still be linked.
 */
const probeMalProfileExists = async (name: string): Promise<MalVerifyResult> => {
  try {
    const response = await axios.head(
      `https://myanimelist.net/profile/${encodeURIComponent(name)}`,
      {
        timeout: 8_000,
        maxRedirects: 5,
        headers: { 'User-Agent': MAL_PROFILE_UA },
        validateStatus: (status) => status === 200 || status === 404,
      },
    );
    if (response.status === 200) return 'exists';
    if (response.status === 404) return 'not_found';
    return 'unverified';
  } catch (error: unknown) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    if (status === 404) return 'not_found';
    if (status === 200) return 'exists';
    logger.warn(`[MAL] Profile probe failed for "${name}" (status ${status ?? 'n/a'})`, 'MAL');
    return 'unverified';
  }
};

/**
 * Check whether a MAL username exists.
 * `unverified` is non-fatal when MAL is unreachable.
 * `unconfigured` means the server has no usable `MAL_CLIENT_ID`.
 */
export const verifyMalUser = async (username: string): Promise<MalVerifyResult> => {
  const name = normalizeMalUsername(username);
  if (!name) return 'not_found';

  const headers = malHeaders();
  if (!headers) {
    logger.warn('[MAL] MAL_CLIENT_ID not configured — cannot verify user', 'MAL');
    return 'unconfigured';
  }

  try {
    const response = await axios.get<MalListResponse>(
      `${MAL_API_BASE}/users/${encodeURIComponent(name)}/animelist`,
      { params: { limit: 1, nsfw: true }, headers, timeout: 12_000 },
    );
    if (response.status >= 200 && response.status < 300) return 'exists';
    return 'not_found';
  } catch (error: unknown) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    if (status === 403) return 'exists';
    if (status === 401) {
      logger.warn('[MAL] MAL_CLIENT_ID rejected by MyAnimeList', 'MAL');
      return 'unconfigured';
    }
    if (status === 404) return probeMalProfileExists(name);
    logger.warn(`[MAL] Could not verify user "${name}" (status ${status ?? 'n/a'})`, 'MAL');
    return 'unverified';
  }
};

const fetchMalIdsForStatus = async (
  username: string,
  status: WatchedMalStatus,
  headers: Record<string, string>,
): Promise<number[]> => {
  const malIds = new Set<number>();
  let offset = 0;

  for (;;) {
    const response = await axios.get<MalListResponse>(
      `${MAL_API_BASE}/users/${encodeURIComponent(username)}/animelist`,
      {
        params: { status, limit: PAGE_LIMIT, offset, fields: 'list_status', nsfw: true },
        headers,
        timeout: 20_000,
      },
    );

    const entries = response.data?.data ?? [];
    for (const entry of entries) {
      const malId = entry.node?.id;
      const entryStatus = entry.list_status?.status;
      if (malId && entryStatus && WATCHED_MAL_STATUS_SET.has(entryStatus)) {
        malIds.add(malId);
      }
    }

    if (entries.length < PAGE_LIMIT) break;
    offset += PAGE_LIMIT;
    if (offset > 20_000) break;
  }

  return Array.from(malIds);
};

const mapMalIdsToCatalogueIds = async (malIds: number[]): Promise<number[]> => {
  if (!malIds.length) return [];
  const rows = await prisma.anime.findMany({
    where: { idMal: { in: malIds } },
    select: { id: true },
  });
  return rows.map((row) => row.id);
};

/** Resolve a MAL list while preserving unavailable vs private/empty semantics. */
export const resolveMalList = async (username: string): Promise<MalListResult> => {
  const name = normalizeMalUsername(username);
  if (!name) return { ids: [], state: 'private_empty', fromNetwork: false };

  const now = Date.now();
  const key = cacheKey(name);
  const cached = userCache.get(key);
  if (cached && now - cached.timestamp < CACHE_DURATION_MS) {
    logger.debug(`[MAL] Cache HIT for ${name}`, 'MAL');
    const result = await cached.promise;
    cached.value = result;
    return {
      ...result,
      state: result.state === 'ok' ? 'cache' : result.state,
      fromNetwork: false,
    };
  }

  const fetchPromise = (async () => {
    const headers = malHeaders();
    if (!headers) {
      logger.error('[MAL] MAL_CLIENT_ID not configured', 'MAL');
      return { ids: [], state: 'unavailable', fromNetwork: false } satisfies MalListResult;
    }

    try {
      logger.info(`[MAL] Fetching animelist for ${name}`, 'MAL');

      const batches = await Promise.all(
        WATCHED_MAL_STATUSES.map((status) => fetchMalIdsForStatus(name, status, headers)),
      );
      const malIds = Array.from(new Set(batches.flat()));
      const catalogueIds = await mapMalIdsToCatalogueIds(malIds);

      logger.info(
        `[MAL] ${name}: ${malIds.length} MAL entries → ${catalogueIds.length} catalogue animes`,
        'MAL',
      );
      return {
        ids: catalogueIds,
        state: catalogueIds.length > 0 ? 'ok' : 'private_empty',
        fromNetwork: true,
      } satisfies MalListResult;
    } catch (error: unknown) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      if (status === 404 || status === 403) {
        logger.warn(`[MAL] Animelist for ${name} is missing or private`, 'MAL');
        return { ids: [], state: 'private_empty', fromNetwork: true } satisfies MalListResult;
      }
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[MAL] API error for ${name}`, 'MAL', message);
      return { ids: [], state: 'unavailable', fromNetwork: false } satisfies MalListResult;
    }
  })();

  const entry: CacheEntry = { timestamp: now, promise: fetchPromise };
  userCache.set(key, entry);
  const result = await fetchPromise;
  if (result.state === 'unavailable') {
    userCache.delete(key);
    return result;
  }
  entry.value = result;
  return result;
};

/** Return only catalogue ids for gameplay callers. */
export const getUserAnimeIds = async (username: string): Promise<number[]> =>
  (await resolveMalList(username)).ids;
