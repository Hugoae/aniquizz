import { prisma } from '@aniquizz/database';
import {
  resolveActiveListProvider,
  type ListFetchState,
  type WatchedListProvider,
} from '@aniquizz/shared';
import { resolveAnilistList } from '../anilist/anilistService';
import { anilistListGate } from '../anilist/anilistListGate';
import { invalidateMalUserCache, resolveMalList } from '../mal/malService';

export interface WatchedListSources {
  anilistUsername?: string | null;
  malUsername?: string | null;
  activeListProvider?: string | null;
}

export interface CatalogueResolveResult {
  ids: number[];
  listError?: 'anilist_blocked';
  provider: WatchedListProvider | null;
  state: ListFetchState;
  fromNetwork: boolean;
}

const trimOrNull = (value?: string | null): string | null => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
};

export const loadProfileListSources = async (userId: string): Promise<WatchedListSources> => {
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { anilistUsername: true, malUsername: true, activeListProvider: true },
  });
  return {
    anilistUsername: profile?.anilistUsername ?? null,
    malUsername: profile?.malUsername ?? null,
    activeListProvider: (profile?.activeListProvider as WatchedListProvider | null) ?? null,
  };
};

const resolveAnilist = async (
  username: string,
  bustCache: boolean,
): Promise<CatalogueResolveResult> => {
  if (bustCache && !anilistListGate.isInBackoff()) {
    anilistListGate.forgetUser(username);
  }
  const before = anilistListGate.hasFreshSuccess(username);
  const result = await resolveAnilistList(username);
  const fromNetwork = !before && !result.stale && !result.blocked;
  let state: ListFetchState = 'ok';
  if (result.blocked && result.stale) state = 'stale';
  else if (result.blocked) state = 'unavailable';
  else if (result.stale) state = 'stale';
  else if (result.ids.length === 0) state = 'private_empty';
  else if (anilistListGate.hasFreshSuccess(username) && !fromNetwork) state = 'cache';
  return {
    ids: result.ids,
    listError: result.blocked || result.stale ? 'anilist_blocked' : undefined,
    provider: 'anilist',
    state,
    fromNetwork,
  };
};

const resolveMal = async (
  username: string,
  bustCache: boolean,
): Promise<CatalogueResolveResult> => {
  if (bustCache) invalidateMalUserCache(username);
  const result = await resolveMalList(username);
  return {
    ids: result.ids,
    provider: 'mal',
    state: result.state,
    fromNetwork: result.fromNetwork,
  };
};

export const resolvePlayerCatalogueWithMeta = async (
  userId: string,
  overrides: WatchedListSources = {},
  opts: { bustCache?: boolean } = {},
): Promise<CatalogueResolveResult> => {
  let anilist = trimOrNull(overrides.anilistUsername);
  let mal = trimOrNull(overrides.malUsername);
  let active = overrides.activeListProvider;

  if (!anilist && !mal) {
    const fromDb = await loadProfileListSources(userId);
    anilist = trimOrNull(fromDb.anilistUsername);
    mal = trimOrNull(fromDb.malUsername);
    active = fromDb.activeListProvider;
  } else if (active === undefined) {
    const fromDb = await loadProfileListSources(userId);
    active = fromDb.activeListProvider;
  }

  const provider = resolveActiveListProvider({
    anilistUsername: anilist,
    malUsername: mal,
    activeListProvider: active,
  });

  if (provider === 'anilist' && anilist) {
    return resolveAnilist(anilist, opts.bustCache === true);
  }
  if (provider === 'mal' && mal) {
    return resolveMal(mal, opts.bustCache === true);
  }
  return { ids: [], provider: null, state: 'unlinked', fromNetwork: false };
};

/**
 * Resolve one player's Watched pool to internal Anime ids.
 * Uses the active source, with a safe fallback if that source was unlinked.
 */
export const resolvePlayerCatalogueIds = async (
  userId: string,
  overrides: WatchedListSources = {},
): Promise<number[]> => (await resolvePlayerCatalogueWithMeta(userId, overrides)).ids;
