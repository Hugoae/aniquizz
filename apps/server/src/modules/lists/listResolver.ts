import { prisma } from '@aniquizz/database';
import { resolveAnilistList } from '../anilist/anilistService';
import { getUserAnimeIds as getMalAnimeIds } from '../mal/malService';

export interface WatchedListSources {
  anilistUsername?: string | null;
  malUsername?: string | null;
}

export interface CatalogueResolveResult {
  ids: number[];
  listError?: 'anilist_blocked';
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

export const resolvePlayerCatalogueWithMeta = async (
  userId: string,
  overrides: WatchedListSources = {},
): Promise<CatalogueResolveResult> => {
  let anilist = trimOrNull(overrides.anilistUsername);
  let mal = trimOrNull(overrides.malUsername);

  if (!anilist && !mal) {
    const fromDb = await loadProfileListSources(userId);
    anilist = trimOrNull(fromDb.anilistUsername);
    mal = trimOrNull(fromDb.malUsername);
  }

  if (anilist) {
    const result = await resolveAnilistList(anilist);
    return {
      ids: result.ids,
      listError: result.blocked || result.stale ? 'anilist_blocked' : undefined,
    };
  }
  if (mal) return { ids: await getMalAnimeIds(mal) };
  return { ids: [] };
};

/**
 * Resolve one player's Watched pool to internal Anime ids.
 * AniList and MAL are mutually exclusive per profile; overrides may come from RoomPlayer.
 */
export const resolvePlayerCatalogueIds = async (
  userId: string,
  overrides: WatchedListSources = {},
): Promise<number[]> => (await resolvePlayerCatalogueWithMeta(userId, overrides)).ids;
