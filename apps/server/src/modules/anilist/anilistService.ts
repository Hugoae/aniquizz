import axios from 'axios';
import { logger } from '../../utils/logger';
import { normalizeAnilistUsername } from '../lists/watchlistUsername';
import {
  anilistListGate,
  isAnilistUnavailableStatus,
  type AnilistListResult,
} from './anilistListGate';

const ANILIST_GRAPHQL_URL = 'https://graphql.anilist.co';
const ANILIST_TIMEOUT_MS = 15_000;
const USER_NOT_FOUND_RE = /\bnot found\b|private (user|list)|user does not exist/i;

const USER_LIST_QUERY = `
query ($username: String) {
  MediaListCollection(userName: $username, type: ANIME) {
    lists {
      name
      entries {
        mediaId
        status
      }
    }
  }
}
`;

const USER_EXISTS_QUERY = `
query ($name: String) {
  User(name: $name) { id }
}
`;

export type AnilistVerifyResult = 'exists' | 'not_found' | 'unverified';

/** AniList statuses that count as "watched" for the game pool. */
export const WATCHED_ANILIST_STATUSES = new Set(['COMPLETED', 'CURRENT', 'PAUSED', 'REPEATING']);

const LIST_NAME_HINTS = [
  'completed',
  'watching',
  'current',
  'terminé',
  'en cours',
  'repeating',
  'rewatching',
  'paused',
  'on hold',
  'on-hold',
  'en pause',
];

export interface AnilistListGroup {
  name?: string;
  entries?: Array<{ mediaId?: number; status?: string | null }>;
}

/** Collect AniList media ids from Completed / Watching / On-Hold / Rewatching entries. */
export const collectWatchedAnilistMediaIds = (
  lists: AnilistListGroup[] | null | undefined,
): number[] => {
  if (!lists?.length) return [];
  const ids = new Set<number>();
  for (const list of lists) {
    const listName = (list.name ?? '').toLowerCase();
    const nameLooksWatched = LIST_NAME_HINTS.some((hint) => listName.includes(hint));
    for (const entry of list.entries ?? []) {
      if (!entry.mediaId) continue;
      const status = String(entry.status ?? '').toUpperCase();
      if (WATCHED_ANILIST_STATUSES.has(status) || (!status && nameLooksWatched)) {
        ids.add(entry.mediaId);
      }
    }
  }
  return Array.from(ids);
};

const httpStatus = (error: unknown): number | undefined =>
  axios.isAxiosError(error) ? error.response?.status : undefined;

interface AnilistGraphqlPayload {
  errors?: Array<{ message?: string }>;
  data?: {
    MediaListCollection?: unknown;
    User?: { id?: number } | null;
  } | null;
}

/**
 * GraphQL 200 with errors and no usable data: AniList-side failure, not a private list.
 * User-not-found / private-user messages stay a normal empty result.
 */
export const anilistGraphqlLooksLikeOutage = (payload: unknown): boolean => {
  if (!payload || typeof payload !== 'object') return false;
  const body = payload as AnilistGraphqlPayload;
  if (!body.errors?.length) return false;
  if (body.data?.MediaListCollection != null || body.data?.User != null) return false;
  const joined = body.errors.map((entry) => entry.message ?? '').join(' ');
  if (USER_NOT_FOUND_RE.test(joined)) return false;
  return true;
};

/** Timeout, connection reset, 403/429, or 5xx — AniList failed, not the player's list. */
export const isAnilistUnavailableError = (error: unknown): boolean => {
  if (!axios.isAxiosError(error)) return false;
  if (!error.response) return true;
  return isAnilistUnavailableStatus(error.response.status);
};

/**
 * Check whether an AniList username exists, used before linking it to a profile.
 * `unverified` (AniList outage, 403/429, network) is deliberately non-fatal so
 * a transient AniList outage never blocks a legitimate link.
 */
export const verifyAnilistUser = async (username: string): Promise<AnilistVerifyResult> => {
  const name = normalizeAnilistUsername(username);
  if (!name) return 'not_found';
  if (anilistListGate.isInBackoff()) {
    logger.warn(`[AniList] Skip verify for "${name}" — AniList backoff active`, 'AniList');
    return 'unverified';
  }
  try {
    const response = await axios.post(
      ANILIST_GRAPHQL_URL,
      { query: USER_EXISTS_QUERY, variables: { name } },
      { timeout: ANILIST_TIMEOUT_MS },
    );
    if (anilistGraphqlLooksLikeOutage(response.data)) {
      anilistListGate.onUnavailable(name);
      logger.warn(`[AniList] GraphQL outage while verifying "${name}"`, 'AniList');
      return 'unverified';
    }
    if (response.data?.data?.User?.id) return 'exists';
    return 'not_found';
  } catch (error: unknown) {
    const status = httpStatus(error);
    if (status === 404) return 'not_found';
    if (isAnilistUnavailableError(error)) {
      anilistListGate.onUnavailable(name);
    }
    logger.warn(`[AniList] Could not verify user "${name}" (status ${status ?? 'n/a'})`, 'AniList');
    return 'unverified';
  }
};

const inflight = new Map<string, Promise<AnilistListResult>>();

/** Resolve a user's watched AniList ids, reusing last success during AniList outages. */
export const resolveAnilistList = async (username: string): Promise<AnilistListResult> => {
  if (!username) return { ids: [], blocked: false, stale: false };

  if (anilistListGate.isInBackoff()) {
    const served = anilistListGate.serveBackoff(username);
    logger.warn(
      `AniList backoff active — serving ${served.stale ? `${served.ids.length} stale ids` : 'empty list'} for ${username}`,
      'AniList',
    );
    return served;
  }

  if (anilistListGate.hasFreshSuccess(username)) {
    const ids = anilistListGate.freshIds(username) ?? [];
    logger.debug(`AniList fresh-cache HIT for ${username} (${ids.length} ids)`, 'AniList');
    return { ids, blocked: false, stale: false };
  }

  const pending = inflight.get(username);
  if (pending) return pending;

  const fetchPromise = (async (): Promise<AnilistListResult> => {
    try {
      logger.info(`Fetching AniList list for ${username}`, 'AniList');

      const response = await axios.post(
        ANILIST_GRAPHQL_URL,
        { query: USER_LIST_QUERY, variables: { username } },
        { timeout: ANILIST_TIMEOUT_MS },
      );

      if (anilistGraphqlLooksLikeOutage(response.data)) {
        const served = anilistListGate.onUnavailable(username);
        logger.warn(
          `AniList GraphQL outage for ${username} — serving ${served.stale ? `${served.ids.length} stale ids` : 'empty list'}, backing off`,
          'AniList',
        );
        return served;
      }

      const collection = response.data?.data?.MediaListCollection;
      const lists = collection?.lists as AnilistListGroup[] | undefined;

      if (!lists?.length) {
        logger.warn(`No AniList MediaListCollection for ${username} (private or empty)`, 'AniList');
        anilistListGate.rememberSuccess(username, []);
        return { ids: [], blocked: false, stale: false };
      }

      const ids = collectWatchedAnilistMediaIds(lists);
      anilistListGate.rememberSuccess(username, ids);
      logger.info(`${username}: ${ids.length} unique AniList ids`, 'AniList');
      return { ids, blocked: false, stale: false };
    } catch (error: unknown) {
      const status = httpStatus(error);
      if (status === 404) {
        logger.warn(`AniList user ${username} not found`, 'AniList');
        anilistListGate.forgetUser(username);
        return { ids: [], blocked: false, stale: false };
      }
      if (isAnilistUnavailableError(error)) {
        const served = anilistListGate.onUnavailable(username);
        logger.warn(
          `AniList ${status ?? 'network'} for ${username} — serving ${served.stale ? `${served.ids.length} stale ids` : 'empty list'}, backing off`,
          'AniList',
        );
        return served;
      }
      logger.error(`AniList API error for ${username}`, 'AniList', error);
      const stale = anilistListGate.freshIds(username);
      if (stale?.length) {
        return { ids: stale, blocked: true, stale: true };
      }
      return { ids: [], blocked: true, stale: false };
    } finally {
      inflight.delete(username);
    }
  })();

  inflight.set(username, fetchPromise);
  return fetchPromise;
};

export const getUserAnimeIds = async (username: string): Promise<number[]> =>
  (await resolveAnilistList(username)).ids;
