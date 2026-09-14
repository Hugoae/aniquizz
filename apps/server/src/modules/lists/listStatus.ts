import { prisma } from '@aniquizz/database';
import {
  resolveActiveListProvider,
  type ListProviderStatus,
  type ListsStatusPayload,
  type WatchedListProvider,
} from '@aniquizz/shared';
import type { CatalogueResolveResult } from './listResolver';

export const LIST_STATUS_SELECT = {
  anilistUsername: true,
  malUsername: true,
  activeListProvider: true,
  anilistLastSync: true,
  malLastSync: true,
} as const;

export interface ListStatusRow {
  anilistUsername: string | null;
  malUsername: string | null;
  activeListProvider: string | null;
  anilistLastSync: Date | null;
  malLastSync: Date | null;
}

const providerStatus = (
  provider: WatchedListProvider,
  username: string | null,
  active: WatchedListProvider | null,
  lastSync: Date | null,
  resolved: CatalogueResolveResult | null,
): ListProviderStatus => {
  const normalizedUsername = username?.trim() || null;
  if (!normalizedUsername) {
    return {
      provider,
      username: null,
      linked: false,
      active: false,
      lastSync: null,
      animeCount: null,
      state: 'unlinked',
    };
  }
  return {
    provider,
    username: normalizedUsername,
    linked: true,
    active: active === provider,
    lastSync: lastSync?.toISOString() ?? null,
    animeCount: resolved?.provider === provider ? resolved.ids.length : null,
    state: resolved?.provider === provider ? resolved.state : 'idle',
  };
};

export const buildListsStatus = (
  row: ListStatusRow,
  resolved: CatalogueResolveResult | null = null,
): ListsStatusPayload => {
  const active = resolveActiveListProvider(row);
  return {
    active,
    anilist: providerStatus(
      'anilist',
      row.anilistUsername,
      active,
      row.anilistLastSync,
      resolved,
    ),
    mal: providerStatus('mal', row.malUsername, active, row.malLastSync, resolved),
  };
};

export const loadListStatusRow = async (userId: string): Promise<ListStatusRow> => {
  const row = await prisma.profile.findUnique({
    where: { id: userId },
    select: LIST_STATUS_SELECT,
  });
  if (!row) throw new Error('Profile not found');
  return row;
};
