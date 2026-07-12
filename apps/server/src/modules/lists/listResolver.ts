import { prisma } from '@aniquizz/database';
import { getUserAnimeIds as getAnilistAnimeIds } from '../anilist/anilistService';
import { getUserAnimeIds as getMalAnimeIds } from '../mal/malService';

export interface WatchedListSources {
  anilistUsername?: string | null;
  malUsername?: string | null;
}

const trimOrNull = (value?: string | null): string | null => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
};

export const loadProfileListSources = async (userId: string): Promise<WatchedListSources> => {
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { anilistUsername: true, malUsername: true },
  });
  return {
    anilistUsername: profile?.anilistUsername ?? null,
    malUsername: profile?.malUsername ?? null,
  };
};

/**
 * Resolve one player's Watched pool to internal Anime ids.
 * AniList and MAL are mutually exclusive per profile; overrides may come from RoomPlayer.
 */
export const resolvePlayerCatalogueIds = async (
  userId: string,
  overrides: WatchedListSources = {},
): Promise<number[]> => {
  let anilist = trimOrNull(overrides.anilistUsername);
  let mal = trimOrNull(overrides.malUsername);

  if (!anilist && !mal) {
    const fromDb = await loadProfileListSources(userId);
    anilist = trimOrNull(fromDb.anilistUsername);
    mal = trimOrNull(fromDb.malUsername);
  }

  if (anilist) return getAnilistAnimeIds(anilist);
  if (mal) return getMalAnimeIds(mal);
  return [];
};
