import { prisma } from '@aniquizz/database';
import { DAILY_SONG_SELECT, type DailySongRow } from './dailySnapshot';

/** Same order of magnitude as the QCM name cache — catalogue edits are rare. */
export const DAILY_PLAYABLE_POOL_TTL_MS = 15 * 60 * 1000;

let cache: { at: number; promise: Promise<DailySongRow[]> } | null = null;

export function invalidateDailyPlayablePool(): void {
  cache = null;
}

const fetchPlayablePool = async (): Promise<DailySongRow[]> => {
  const rows = await prisma.song.findMany({
    where: {
      downloadStatus: 'COMPLETED',
      songType: { in: ['OP', 'ED'] },
      videoKey: { not: '' },
    },
    select: DAILY_SONG_SELECT,
  });
  return rows as unknown as DailySongRow[];
};

/**
 * OP/ED catalogue used by daily generation. Cached so a 14-day horizon does not
 * issue 14 full scans. Concurrent callers share one in-flight promise.
 */
export async function loadPlayablePool(): Promise<DailySongRow[]> {
  const now = Date.now();
  if (cache && now - cache.at < DAILY_PLAYABLE_POOL_TTL_MS) {
    return cache.promise;
  }
  const promise = fetchPlayablePool().catch((error) => {
    if (cache?.promise === promise) cache = null;
    throw error;
  });
  cache = { at: now, promise };
  return promise;
}
