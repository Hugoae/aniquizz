import type { LeaderboardMetric, LeaderboardResponse } from '@aniquizz/shared';
import { env } from '../../config/env';

export type LeaderboardPublicSnapshot = Omit<LeaderboardResponse, 'viewer'>;

interface CacheEntry {
  at: number;
  snapshot: LeaderboardPublicSnapshot;
}

const cache = new Map<string, CacheEntry>();

/** Short TTL: rankings are denormalized and change after every finished match. */
const DEFAULT_TTL_MS = 15_000;

let ttlMs = env.NODE_ENV === 'test' ? 0 : DEFAULT_TTL_MS;

export const leaderboardCacheKey = (
  metric: LeaderboardMetric,
  page: number,
  pageSize: number,
): string => `${metric}:${page}:${pageSize}`;

export const getLeaderboardSnapshot = (key: string): LeaderboardPublicSnapshot | null => {
  if (ttlMs <= 0) return null;
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at >= ttlMs) {
    cache.delete(key);
    return null;
  }
  return hit.snapshot;
};

export const setLeaderboardSnapshot = (key: string, snapshot: LeaderboardPublicSnapshot): void => {
  if (ttlMs <= 0) return;
  cache.set(key, { at: Date.now(), snapshot });
};

export const clearLeaderboardSnapshotCache = (): void => {
  cache.clear();
};

/** Test hook — enable a TTL window without waiting on the default production value. */
export const setLeaderboardCacheTtlMsForTests = (ms: number): void => {
  ttlMs = ms;
};
