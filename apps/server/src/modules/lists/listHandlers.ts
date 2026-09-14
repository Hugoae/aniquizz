import { prisma } from '@aniquizz/database';
import type {
  ListOperation,
  WatchedListProvider,
} from '@aniquizz/shared';
import {
  isWatchedListProvider,
  resolveActiveListProvider,
} from '@aniquizz/shared';
import type { TypedServer, TypedSocket } from '../../core/socketTypes';
import type { GameManager } from '../game/gameManager';
import { guard, requireAuth, RATE_LIMITS } from '../../core/guards';
import { logger } from '../../utils/logger';
import { verifyAnilistUser } from '../anilist/anilistService';
import { anilistListGate } from '../anilist/anilistListGate';
import {
  invalidateMalUserCache,
  verifyMalUser,
  type MalVerifyResult,
} from '../mal/malService';
import { userRoom } from '../friends/friendsPresence';
import {
  resolvePlayerCatalogueWithMeta,
  type CatalogueResolveResult,
} from './listResolver';
import {
  buildListsStatus,
  LIST_STATUS_SELECT,
  loadListStatusRow,
  type ListStatusRow,
} from './listStatus';
import { normalizeAnilistUsername, normalizeMalUsername } from './watchlistUsername';

const inflightRefresh = new Map<string, Promise<CatalogueResolveResult>>();
const mutationQueues = new Map<string, Promise<void>>();

const malLinkError = (check: MalVerifyResult): string | null => {
  if (check === 'not_found') {
    return "Compte MyAnimeList introuvable. Vérifie le pseudo de l'URL du profil.";
  }
  if (check === 'unconfigured') {
    return "MyAnimeList n'est pas configuré sur ce serveur.";
  }
  return null;
};

const requestIdFrom = (payload: unknown): string => {
  if (!payload || typeof payload !== 'object') return `legacy-${Date.now()}`;
  const value = (payload as { requestId?: unknown }).requestId;
  if (typeof value !== 'string') return `legacy-${Date.now()}`;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= 100 ? trimmed : `legacy-${Date.now()}`;
};

const applyRuntimeSources = (
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

const publishStatus = (
  io: TypedServer,
  userId: string,
  row: ListStatusRow,
  resolved: CatalogueResolveResult | null = null,
) => {
  const status = buildListsStatus(row, resolved);
  io.to(userRoom(userId)).emit('lists:status', status);
  return status;
};

const enqueueMutation = (userId: string, task: () => Promise<void>): void => {
  const previous = mutationQueues.get(userId) ?? Promise.resolve();
  const current = previous
    .catch(() => undefined)
    .then(task)
    .finally(() => {
      if (mutationQueues.get(userId) === current) mutationQueues.delete(userId);
    });
  mutationQueues.set(userId, current);
};

export const registerListHandlers = (
  io: TypedServer,
  socket: TypedSocket,
  gameManager: GameManager,
) => {
  const uid = (): string => socket.data.userId as string;

  const emitOperationError = (
    requestId: string,
    operation: ListOperation,
    provider: WatchedListProvider | null,
    message: string,
  ) => {
    socket.emit('lists:error', { requestId, operation, provider, message });
  };

  const loadCanonicalRow = async (userId: string): Promise<ListStatusRow> => {
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

  const syncLinkedProvider = async (
    userId: string,
    row: ListStatusRow,
    provider: WatchedListProvider,
  ) => {
    const expectedUsername =
      provider === 'anilist' ? row.anilistUsername : row.malUsername;
    if (!expectedUsername) return;
    const key = `${userId}:${provider}`;
    let pending = inflightRefresh.get(key);
    if (!pending) {
      pending = resolvePlayerCatalogueWithMeta(
        userId,
        {
          anilistUsername: row.anilistUsername,
          malUsername: row.malUsername,
          activeListProvider: provider,
        },
        { bustCache: true },
      ).finally(() => inflightRefresh.delete(key));
      inflightRefresh.set(key, pending);
    }
    const resolved = await pending;
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

  const handleGetStatus = async () => {
    const userId = uid();
    try {
      const row = await loadCanonicalRow(userId);
      publishStatus(io, userId, row);
    } catch (error) {
      logger.error('Failed to load list status', 'Lists', error);
      socket.emit('error', { message: 'Impossible de charger les listes.' });
    }
  };

  const handleLink = (payload: {
    requestId: string;
    provider: WatchedListProvider;
    username: string;
  }) => {
    const userId = uid();
    const requestId = requestIdFrom(payload);
    enqueueMutation(userId, async () => {
      try {
        if (!isWatchedListProvider(payload?.provider)) {
          emitOperationError(requestId, 'link', null, 'Source de liste invalide.');
          return;
        }
        const username =
          payload.provider === 'anilist'
            ? normalizeAnilistUsername(typeof payload.username === 'string' ? payload.username : '')
            : normalizeMalUsername(typeof payload.username === 'string' ? payload.username : '');
        if (!username) {
          emitOperationError(requestId, 'link', payload.provider, 'Pseudo requis.');
          return;
        }

        if (payload.provider === 'anilist') {
          const check = await verifyAnilistUser(username);
          if (check === 'not_found') {
            emitOperationError(
              requestId,
              'link',
              'anilist',
              "Compte AniList introuvable. Vérifie l'orthographe de ton pseudo.",
            );
            return;
          }
        } else {
          const check = await verifyMalUser(username);
          const message = malLinkError(check);
          if (message) {
            emitOperationError(requestId, 'link', 'mal', message);
            return;
          }
        }

        const row = await prisma.profile.update({
          where: { id: userId },
          data:
            payload.provider === 'anilist'
              ? {
                  anilistUsername: username,
                  activeListProvider: 'anilist',
                  anilistLastSync: null,
                }
              : {
                  malUsername: username,
                  activeListProvider: 'mal',
                  malLastSync: null,
                },
          select: LIST_STATUS_SELECT,
        });
        if (payload.provider === 'anilist') anilistListGate.forgetUser(username);
        else invalidateMalUserCache(username);
        applyRuntimeSources(userId, row, socket, gameManager);
        const status = publishStatus(io, userId, row);
        socket.emit('lists:result', {
          requestId,
          operation: 'link',
          provider: payload.provider,
          status,
        });

        void syncLinkedProvider(userId, row, payload.provider).catch((syncError) => {
          logger.error('Failed to sync list after link', 'Lists', syncError);
        });
      } catch (error) {
        logger.error('Failed to link list', 'Lists', error);
        emitOperationError(requestId, 'link', payload?.provider ?? null, 'Impossible de lier ce compte.');
      }
    });
  };

  const handleSetActive = (payload: {
    requestId: string;
    provider: WatchedListProvider;
  }) => {
    const userId = uid();
    const requestId = requestIdFrom(payload);
    enqueueMutation(userId, async () => {
      try {
        if (!isWatchedListProvider(payload?.provider)) {
          emitOperationError(requestId, 'set_active', null, 'Source de liste invalide.');
          return;
        }
        const current = await loadListStatusRow(userId);
        const username =
          payload.provider === 'anilist' ? current.anilistUsername : current.malUsername;
        if (!username?.trim()) {
          emitOperationError(
            requestId,
            'set_active',
            payload.provider,
            'Lie ce compte avant de l’utiliser.',
          );
          return;
        }
        const row = await prisma.profile.update({
          where: { id: userId },
          data: { activeListProvider: payload.provider },
          select: LIST_STATUS_SELECT,
        });
        applyRuntimeSources(userId, row, socket, gameManager);
        const status = publishStatus(io, userId, row);
        socket.emit('lists:result', {
          requestId,
          operation: 'set_active',
          provider: payload.provider,
          status,
        });
      } catch (error) {
        logger.error('Failed to set active list', 'Lists', error);
        emitOperationError(
          requestId,
          'set_active',
          payload?.provider ?? null,
          'Impossible de changer la source active.',
        );
      }
    });
  };

  const handleRefresh = (payload: {
    requestId: string;
    provider: WatchedListProvider;
  }) => {
    const userId = uid();
    const requestId = requestIdFrom(payload);
    enqueueMutation(userId, async () => {
      try {
        if (!isWatchedListProvider(payload?.provider)) {
          emitOperationError(requestId, 'refresh', null, 'Source de liste invalide.');
          return;
        }
        const row = await loadCanonicalRow(userId);
        const username =
          payload.provider === 'anilist' ? row.anilistUsername : row.malUsername;
        if (!username?.trim()) {
          emitOperationError(
            requestId,
            'refresh',
            payload.provider,
            'Lie ce compte avant de le synchroniser.',
          );
          return;
        }
        const key = `${userId}:${payload.provider}`;
        let pending = inflightRefresh.get(key);
        if (!pending) {
          pending = resolvePlayerCatalogueWithMeta(
            userId,
            {
              anilistUsername: row.anilistUsername,
              malUsername: row.malUsername,
              activeListProvider: payload.provider,
            },
            { bustCache: true },
          ).finally(() => inflightRefresh.delete(key));
          inflightRefresh.set(key, pending);
        }
        const resolved = await pending;
        let latestRow = row;
        if (resolved.fromNetwork) {
          const stamp = new Date();
          latestRow = await prisma.profile.update({
            where: { id: userId },
            data:
              payload.provider === 'anilist'
                ? { anilistLastSync: stamp, lastListSync: stamp }
                : { malLastSync: stamp, lastListSync: stamp },
            select: LIST_STATUS_SELECT,
          });
        }
        const status = publishStatus(io, userId, latestRow, resolved);
        if (resolved.state === 'unavailable' || resolved.state === 'stale') {
          emitOperationError(
            requestId,
            'refresh',
            payload.provider,
            resolved.state === 'stale'
              ? 'Service indisponible : la dernière liste en cache reste utilisée.'
              : 'Le service de liste est momentanément indisponible.',
          );
          return;
        }
        gameManager.notifyWatchedListChanged(userId);
        socket.emit('lists:result', {
          requestId,
          operation: 'refresh',
          provider: payload.provider,
          status,
        });
      } catch (error) {
        logger.error('Failed to refresh list', 'Lists', error);
        emitOperationError(
          requestId,
          'refresh',
          payload?.provider ?? null,
          'Impossible de synchroniser la liste.',
        );
      }
    });
  };

  const handleUnlink = (payload: {
    requestId: string;
    provider: WatchedListProvider;
  }) => {
    const userId = uid();
    const requestId = requestIdFrom(payload);
    enqueueMutation(userId, async () => {
      try {
        if (!isWatchedListProvider(payload?.provider)) {
          emitOperationError(requestId, 'unlink', null, 'Source de liste invalide.');
          return;
        }
        const current = await loadListStatusRow(userId);
        const removedUsername =
          payload.provider === 'anilist' ? current.anilistUsername : current.malUsername;
        const nextSources = {
          anilistUsername: payload.provider === 'anilist' ? null : current.anilistUsername,
          malUsername: payload.provider === 'mal' ? null : current.malUsername,
          activeListProvider: current.activeListProvider,
        };
        const nextActive = resolveActiveListProvider(nextSources);
        const row = await prisma.profile.update({
          where: { id: userId },
          data:
            payload.provider === 'anilist'
              ? {
                  anilistUsername: null,
                  anilistLastSync: null,
                  activeListProvider: nextActive,
                  lastListSync:
                    nextActive === 'mal' ? current.malLastSync : null,
                }
              : {
                  malUsername: null,
                  malLastSync: null,
                  activeListProvider: nextActive,
                  lastListSync:
                    nextActive === 'anilist' ? current.anilistLastSync : null,
                },
          select: LIST_STATUS_SELECT,
        });
        if (removedUsername) {
          if (payload.provider === 'anilist') anilistListGate.forgetUser(removedUsername);
          else invalidateMalUserCache(removedUsername);
        }
        applyRuntimeSources(userId, row, socket, gameManager);
        const status = publishStatus(io, userId, row);
        socket.emit('lists:result', {
          requestId,
          operation: 'unlink',
          provider: payload.provider,
          status,
        });
      } catch (error) {
        logger.error('Failed to unlink list', 'Lists', error);
        emitOperationError(
          requestId,
          'unlink',
          payload?.provider ?? null,
          'Impossible de délier ce compte.',
        );
      }
    });
  };

  socket.on('lists:get_status', requireAuth(socket, handleGetStatus));
  socket.on('lists:link', guard(socket, 'lists:link', RATE_LIMITS.listsMutate, handleLink));
  socket.on(
    'lists:set_active',
    guard(socket, 'lists:set_active', RATE_LIMITS.listsMutate, handleSetActive),
  );
  socket.on(
    'lists:refresh',
    guard(socket, 'lists:refresh', RATE_LIMITS.listsRefresh, handleRefresh),
  );
  socket.on('lists:unlink', guard(socket, 'lists:unlink', RATE_LIMITS.listsMutate, handleUnlink));
};
