import { prisma } from '@aniquizz/database';
import {
  listLinkInputSchema,
  listProviderOpInputSchema,
  MAX_WATCHLIST_HANDLE_LENGTH,
  resolveActiveListProvider,
  type ListLinkInputParsed,
  type ListOperation,
  type ListProviderOpInputParsed,
  type WatchedListProvider,
} from '@aniquizz/shared';
import type { TypedServer, TypedSocket } from '../../core/socketTypes';
import type { GameManager } from '../game/gameManager';
import { guard, requireAuth, RATE_LIMITS } from '../../core/guards';
import { parseSocketPayload } from '../../core/parseSocketPayload';
import { logger } from '../../utils/logger';
import { verifyAnilistUser } from '../anilist/anilistService';
import { anilistListGate } from '../anilist/anilistListGate';
import { invalidateMalUserCache, verifyMalUser } from '../mal/malService';
import { peekCachedCatalogues } from './listResolver';
import { listLinkRejectMessage } from './listLinkVerify';
import {
  applyRuntimeSources,
  enqueueMutation,
  loadCanonicalRow,
  publishStatus,
  resolveProviderWithInflight,
  syncLinkedProvider,
} from './listPublish';
import { LIST_STATUS_SELECT, loadListStatusRow } from './listStatus';
import { normalizeAnilistUsername, normalizeMalUsername } from './watchlistUsername';

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

  const handleGetStatus = async () => {
    const userId = uid();
    try {
      const row = await loadCanonicalRow(userId, socket, gameManager);
      publishStatus(io, userId, row, peekCachedCatalogues(row));
    } catch (error) {
      logger.error('Failed to load list status', 'Lists', error);
      socket.emit('error', { message: 'Impossible de charger les listes.' });
    }
  };

  const handleLink = (payload: ListLinkInputParsed) => {
    const parsed = parseSocketPayload(socket, listLinkInputSchema, payload);
    if (!parsed) return;
    const userId = uid();
    const { requestId, provider } = parsed;
    enqueueMutation(userId, async () => {
      try {
        const username =
          provider === 'anilist'
            ? normalizeAnilistUsername(parsed.username)
            : normalizeMalUsername(parsed.username);
        if (!username) {
          emitOperationError(requestId, 'link', provider, 'Un pseudo est requis.');
          return;
        }
        if (username.length > MAX_WATCHLIST_HANDLE_LENGTH) {
          emitOperationError(requestId, 'link', provider, 'Ce pseudo est trop long.');
          return;
        }

        const check =
          provider === 'anilist'
            ? await verifyAnilistUser(username)
            : await verifyMalUser(username);
        const reject = listLinkRejectMessage(provider, check);
        if (reject) {
          emitOperationError(requestId, 'link', provider, reject);
          return;
        }

        const row = await prisma.profile.update({
          where: { id: userId },
          data:
            provider === 'anilist'
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
        if (provider === 'anilist') anilistListGate.forgetUser(username);
        else invalidateMalUserCache(username);
        applyRuntimeSources(userId, row, socket, gameManager);
        const status = publishStatus(io, userId, row);
        socket.emit('lists:result', {
          requestId,
          operation: 'link',
          provider,
          status,
        });

        void syncLinkedProvider(io, gameManager, userId, row, provider).catch((syncError) => {
          logger.error('Failed to sync list after link', 'Lists', syncError);
        });
      } catch (error) {
        logger.error('Failed to link list', 'Lists', error);
        emitOperationError(requestId, 'link', provider, 'Impossible de lier ce compte.');
      }
    });
  };

  const handleSetActive = (payload: ListProviderOpInputParsed) => {
    const parsed = parseSocketPayload(socket, listProviderOpInputSchema, payload);
    if (!parsed) return;
    const userId = uid();
    const { requestId, provider } = parsed;
    enqueueMutation(userId, async () => {
      try {
        const current = await loadListStatusRow(userId);
        const username = provider === 'anilist' ? current.anilistUsername : current.malUsername;
        if (!username?.trim()) {
          emitOperationError(
            requestId,
            'set_active',
            provider,
            'Liez ce compte avant de l’utiliser.',
          );
          return;
        }
        const row = await prisma.profile.update({
          where: { id: userId },
          data: { activeListProvider: provider },
          select: LIST_STATUS_SELECT,
        });
        applyRuntimeSources(userId, row, socket, gameManager);
        const status = publishStatus(io, userId, row);
        socket.emit('lists:result', {
          requestId,
          operation: 'set_active',
          provider,
          status,
        });
      } catch (error) {
        logger.error('Failed to set active list', 'Lists', error);
        emitOperationError(
          requestId,
          'set_active',
          provider,
          'Impossible de changer la source active.',
        );
      }
    });
  };

  const handleRefresh = (payload: ListProviderOpInputParsed) => {
    const parsed = parseSocketPayload(socket, listProviderOpInputSchema, payload);
    if (!parsed) return;
    const userId = uid();
    const { requestId, provider } = parsed;
    enqueueMutation(userId, async () => {
      try {
        const row = await loadCanonicalRow(userId, socket, gameManager);
        const username = provider === 'anilist' ? row.anilistUsername : row.malUsername;
        if (!username?.trim()) {
          emitOperationError(
            requestId,
            'refresh',
            provider,
            'Liez ce compte avant de le synchroniser.',
          );
          return;
        }
        const resolved = await resolveProviderWithInflight(userId, row, provider, true);
        let latestRow = row;
        if (resolved.fromNetwork) {
          const stamp = new Date();
          latestRow = await prisma.profile.update({
            where: { id: userId },
            data:
              provider === 'anilist'
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
            provider,
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
          provider,
          status,
        });
      } catch (error) {
        logger.error('Failed to refresh list', 'Lists', error);
        emitOperationError(requestId, 'refresh', provider, 'Impossible de synchroniser la liste.');
      }
    });
  };

  const handleUnlink = (payload: ListProviderOpInputParsed) => {
    const parsed = parseSocketPayload(socket, listProviderOpInputSchema, payload);
    if (!parsed) return;
    const userId = uid();
    const { requestId, provider } = parsed;
    enqueueMutation(userId, async () => {
      try {
        const current = await loadListStatusRow(userId);
        const removedUsername =
          provider === 'anilist' ? current.anilistUsername : current.malUsername;
        const nextSources = {
          anilistUsername: provider === 'anilist' ? null : current.anilistUsername,
          malUsername: provider === 'mal' ? null : current.malUsername,
          activeListProvider: current.activeListProvider,
        };
        const nextActive = resolveActiveListProvider(nextSources);
        const row = await prisma.profile.update({
          where: { id: userId },
          data:
            provider === 'anilist'
              ? {
                  anilistUsername: null,
                  anilistLastSync: null,
                  activeListProvider: nextActive,
                  lastListSync: nextActive === 'mal' ? current.malLastSync : null,
                }
              : {
                  malUsername: null,
                  malLastSync: null,
                  activeListProvider: nextActive,
                  lastListSync: nextActive === 'anilist' ? current.anilistLastSync : null,
                },
          select: LIST_STATUS_SELECT,
        });
        if (removedUsername) {
          if (provider === 'anilist') anilistListGate.forgetUser(removedUsername);
          else invalidateMalUserCache(removedUsername);
        }
        applyRuntimeSources(userId, row, socket, gameManager);
        const status = publishStatus(io, userId, row);
        socket.emit('lists:result', {
          requestId,
          operation: 'unlink',
          provider,
          status,
        });
      } catch (error) {
        logger.error('Failed to unlink list', 'Lists', error);
        emitOperationError(requestId, 'unlink', provider, 'Impossible de délier ce compte.');
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
