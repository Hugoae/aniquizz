import { prisma } from '@aniquizz/database';
import type {
  LibraryDifficulty,
  LibraryMetaResponse,
  LibrarySongType,
} from '@aniquizz/shared';
import { logger } from '../../utils/logger';
import { countLikedSongs } from './songLikeService';
import { buildLibrarySongWhere } from './librarySongQuery';

const META_TTL_MS = 10 * 60 * 1000;

let metaCache: { data: LibraryMetaResponse; at: number } | null = null;

export const getLibraryMeta = async (userId?: string | null): Promise<LibraryMetaResponse> => {
  const now = Date.now();
  let base: LibraryMetaResponse;
  if (metaCache && now - metaCache.at < META_TTL_MS) {
    base = metaCache.data;
  } else {
    const where = buildLibrarySongWhere({});
    const [totalSongs, songGroups, totalAnimes, totalFranchises] = await Promise.all([
      prisma.song.count({ where }),
      prisma.song.groupBy({
        by: ['songType', 'difficulty'],
        where,
        _count: { _all: true },
      }),
      prisma.anime.count({
        where: { songs: { some: where } },
      }),
      prisma.franchise.count({
        where: {
          animes: { some: { songs: { some: where } } },
        },
      }),
    ]);

    const byType: LibraryMetaResponse['byType'] = { OP: 0, ED: 0, INSERT: 0 };
    const byDifficulty: LibraryMetaResponse['byDifficulty'] = { EASY: 0, MEDIUM: 0, HARD: 0 };

    for (const row of songGroups) {
      byType[row.songType as LibrarySongType] += row._count._all;
      byDifficulty[row.difficulty as LibraryDifficulty] += row._count._all;
    }

    base = {
      totalSongs,
      totalAnimes,
      totalFranchises,
      byType,
      byDifficulty,
    };

    metaCache = { data: base, at: now };
  }

  if (!userId) return base;

  try {
    const likedCount = await countLikedSongs(userId);
    return { ...base, likedCount };
  } catch (e) {
    logger.warn('[Library] Failed to resolve liked count for meta', 'Library', e);
    return base;
  }
};

/** Test hook — clears the meta cache between cases. */
export const clearLibraryMetaCache = (): void => {
  metaCache = null;
};
