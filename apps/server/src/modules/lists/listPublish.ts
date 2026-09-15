import { prisma } from '@aniquizz/database';
import type { WatchedListProvider } from '@aniquizz/shared';
import { resolveActiveListProvider } from '@aniquizz/shared';
import type { TypedServer, TypedSocket } from '../../core/socketTypes';
import type { GameManager } from '../game/gameManager';
import { userRoom } from '../friends/friendsPresence';
import {
  resolvePlayerCatalogueWithMeta,
  type CatalogueResolveResult,
  type WatchedListSources,
} from './listResolver';
import {
  buildListsStatus,
  LIST_STATUS_SELECT,
  loadListStatusRow,
  type ListStatusRow,
} from './listStatus';

const inflightRefresh = new Map<string, Promise<CatalogueResolveResult>>();
const mutationQueues = new Map<string, Promise<void>>();

export const applyRuntimeSources = (
  userId: string,
  row: ListStatusRow,
  socket: TypedSocket,
  gameManager: GameManager,
): void => {
  const active = resolveActiveListProvider(row);
  socket.data.anilistUsername = row.anilistUsername;
  socket.data.malUsername = row.malUsername;
  socket.data.activeListProvider = active;
  gameManager.applyListSources(userId, {
    anilistUsername: row.anilistUsername,
    malUsername: row.malUsername,
    activeListProvider: active,
  });
};

export const publishStatus = (
  io: TypedServer,
  userId: string,
  row: ListStatusRow,
  resolved: CatalogueResolveResult | CatalogueResolveResult[] | null = null,
) => {
  const status = buildListsStatus(row, resolved);
  io.to(userRoom(userId)).emit('lists:status', status);
  return status;
};

export const enqueueMutation = (userId: string, task: () => Promise<void>): void => {
  const previous = mutationQueues.get(userId) ?? Promise.resolve();
  const current = previous
    .catch(() => undefined)
    .then(task)
    .finally(() => {
      if (mutationQueues.get(userId) === current) mutationQueues.delete(userId);
    });
  mutationQueues.set(userId, current);
};

export const resolveProviderWithInflight = (
  userId: string,
  sources: WatchedListSources,
  provider: WatchedListProvider,
  bustCache: boolean,
): Promise<CatalogueResolveResult> => {
  const key = `${userId}:${provider}`;
  let pending = inflightRefresh.get(key);
  if (!pending) {
    pending = resolvePlayerCatalogueWithMeta(
      userId,
      {
        anilistUsername: sources.anilistUsername,
        malUsername: sources.malUsername,
        activeListProvider: provider,
      },
      { bustCache },
    ).finally(() => inflightRefresh.delete(key));
    inflightRefresh.set(key, pending);
  }
  return pending;
};

export const syncLinkedProvider = async (
  io: TypedServer,
  gameManager: GameManager,
  userId: string,
  row: ListStatusRow,
  provider: WatchedListProvider,
): Promise<void> => {
  const expectedUsername = provider === 'anilist' ? row.anilistUsername : row.malUsername;
  if (!expectedUsername) return;
  const resolved = await resolveProviderWithInflight(userId, row, provider, true);
  let latestRow = await loadListStatusRow(userId);
  const currentUsername =
    provider === 'anilist' ? latestRow.anilistUsername : latestRow.malUsername;
  if (currentUsername !== expectedUsername) return;
  if (resolved.fromNetwork) {
    const stamp = new Date();
    if (provider === 'anilist') {
      await prisma.profile.updateMany({
        where: { id: userId, anilistUsername: expectedUsername },
        data: { anilistLastSync: stamp, lastListSync: stamp },
      });
    } else {
      await prisma.profile.updateMany({
        where: { id: userId, malUsername: expectedUsername },
        data: { malLastSync: stamp, lastListSync: stamp },
      });
    }
    latestRow = await loadListStatusRow(userId);
  }
  publishStatus(io, userId, latestRow, resolved);
  if (resolved.state !== 'unavailable' && resolved.state !== 'stale') {
    gameManager.notifyWatchedListChanged(userId);
  }
};

export const loadCanonicalRow = async (
  userId: string,
  socket: TypedSocket,
  gameManager: GameManager,
): Promise<ListStatusRow> => {
  let row = await loadListStatusRow(userId);
  const active = resolveActiveListProvider(row);
  if (row.activeListProvider !== active) {
    row = await prisma.profile.update({
      where: { id: userId },
      data: { activeListProvider: active },
      select: LIST_STATUS_SELECT,
    });
  }
  applyRuntimeSources(userId, row, socket, gameManager);
  return row;
};
