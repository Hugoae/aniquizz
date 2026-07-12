import axios from 'axios';
import { prisma } from '@aniquizz/database';
import { logger } from '../../utils/logger';

const MAL_API_BASE = 'https://api.myanimelist.net/v2';
const CACHE_DURATION_MS = 10 * 60 * 1000;
const PAGE_LIMIT = 1000;

const WATCHED_STATUSES = new Set(['watching', 'completed', 'on_hold']);

type MalListStatusFilter = 'watching' | 'completed' | 'on_hold';

export type MalVerifyResult = 'exists' | 'not_found' | 'unverified';

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
  promise: Promise<number[]>;
}

const userCache = new Map<string, CacheEntry>();

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
 * Check whether a MAL username exists (public animelist probe).
 * `unverified` is non-fatal when MAL is unreachable or client id is missing.
 */
export const verifyMalUser = async (username: string): Promise<MalVerifyResult> => {
  const name = username.trim();
  if (!name) return 'not_found';

  const headers = malHeaders();
  if (!headers) {
    logger.warn('[MAL] MAL_CLIENT_ID not configured — cannot verify user', 'MAL');
    return 'unverified';
  }

  try {
    const response = await axios.get<MalListResponse>(
      `${MAL_API_BASE}/users/${encodeURIComponent(name)}/animelist`,
      { params: { limit: 1 }, headers, timeout: 12_000 },
    );
    if (Array.isArray(response.data?.data)) return 'exists';
    return 'not_found';
  } catch (error: unknown) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    if (status === 404) return 'not_found';
    logger.warn(`[MAL] Could not verify user "${name}" (status ${status ?? 'n/a'})`, 'MAL');
    return 'unverified';
  }
};

const fetchMalIdsForStatus = async (
  username: string,
  status: MalListStatusFilter,
  headers: Record<string, string>,
): Promise<number[]> => {
  const malIds = new Set<number>();
  let offset = 0;

  for (;;) {
    const response = await axios.get<MalListResponse>(
      `${MAL_API_BASE}/users/${encodeURIComponent(username)}/animelist`,
      {
        params: { status, limit: PAGE_LIMIT, offset, fields: 'list_status' },
        headers,
        timeout: 20_000,
      },
    );

    const entries = response.data?.data ?? [];
    for (const entry of entries) {
      const malId = entry.node?.id;
      const entryStatus = entry.list_status?.status;
      if (malId && entryStatus && WATCHED_STATUSES.has(entryStatus)) {
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

/**
 * Fetch a user's public MAL animelist and return internal catalogue Anime ids
 * (mapped via Anime.idMal). Returns [] when unlinked, private, or unmapped.
 */
export const getUserAnimeIds = async (username: string): Promise<number[]> => {
  const name = username.trim();
  if (!name) return [];

  const now = Date.now();
  const cached = userCache.get(name);
  if (cached && now - cached.timestamp < CACHE_DURATION_MS) {
    logger.debug(`[MAL] Cache HIT for ${name}`, 'MAL');
    return cached.promise;
  }

  const fetchPromise = (async () => {
    const headers = malHeaders();
    if (!headers) {
      logger.error('[MAL] MAL_CLIENT_ID not configured', 'MAL');
      return [];
    }

    try {
      logger.info(`[MAL] Fetching animelist for ${name}`, 'MAL');

      const [watchingIds, completedIds, onHoldIds] = await Promise.all([
        fetchMalIdsForStatus(name, 'watching', headers),
        fetchMalIdsForStatus(name, 'completed', headers),
        fetchMalIdsForStatus(name, 'on_hold', headers),
      ]);

      const malIds = Array.from(new Set([...watchingIds, ...completedIds, ...onHoldIds]));
      const catalogueIds = await mapMalIdsToCatalogueIds(malIds);

      logger.info(
        `[MAL] ${name}: ${malIds.length} MAL entries → ${catalogueIds.length} catalogue animes`,
        'MAL',
      );
      return catalogueIds;
    } catch (error: unknown) {
      userCache.delete(name);
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      if (status === 404) {
        logger.warn(`[MAL] User ${name} not found`, 'MAL');
        return [];
      }
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[MAL] API error for ${name}`, 'MAL', message);
      return [];
    }
  })();

  userCache.set(name, { timestamp: now, promise: fetchPromise });
  return fetchPromise;
};
