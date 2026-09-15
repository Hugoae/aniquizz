import {
  hasPlaylistSource,
  hasWatchedListLink,
  normalizePrecision,
  resolvePoolQueryFilters,
} from '@aniquizz/shared';
import { getWatchedPoolStatsForPlayers } from './watchedPoolService';
import {
  computePlaylistPoolStats,
  emptyPlaylistPoolStats,
  getPlaylistPoolStatsForRoom,
} from './playlistPoolService';
import type { TypedSocket } from '../../core/socketTypes';
import type { GameManager } from './gameManager';
import {
  countPlayableWatchedSongs,
  countPlayableSongs,
  countDistinctArtistCredits,
  countDistinctChoiceNames,
  listPlayableAnimeIds,
} from './gameService';
import { resolvePlayerCatalogueWithMeta } from '../lists/listResolver';
import { prisma } from '@aniquizz/database';
import { logger } from '../../utils/logger';
import { guardSilent, RATE_LIMITS } from '../../core/guards';

/** Lobby pool-preview sockets (Watched / playlist / catalogue). Neighbour of match handlers. */
export const registerPoolStatsHandlers = (socket: TypedSocket, gameManager: GameManager) => {
  const getWatchedPoolStats = async (input?: {
    roomId?: string;
    soundCount?: number;
    difficulty?: string[];
    types?: string[];
    watchedMode?: 'union' | 'intersection';
    precision?: string;
  }) => {
    const userId = socket.data.userId;
    if (!userId) return;
    try {
      const room = input?.roomId ? gameManager.getRoom(input.roomId) : undefined;
      if (room && room.players.has(userId)) {
        const soundCount = input?.soundCount ?? room.settings.soundCount;
        const songFilters = resolvePoolQueryFilters({
          difficulty: input?.difficulty ?? room.settings.difficulty,
          types: input?.types ?? room.settings.soundTypes,
        });
        const watchedMode = input?.watchedMode ?? room.settings.watchedMode ?? 'union';
        const stats = await getWatchedPoolStatsForPlayers(
          watchedMode,
          [...room.players.values()].map((p) => ({
            userId: p.userId,
            isBot: p.isBot,
            anilistUsername: p.anilistUsername,
            malUsername: p.malUsername,
            activeListProvider: p.activeListProvider,
          })),
          songFilters,
          soundCount,
          input?.precision ?? room.settings.precision,
        );
        socket.emit('watched:pool_stats', stats);
        return;
      }

      const soundCount = input?.soundCount ?? 10;
      const songFilters = resolvePoolQueryFilters({
        difficulty: input?.difficulty,
        types: input?.types,
      });

      const profile = await prisma.profile.findUnique({
        where: { id: userId },
        select: { anilistUsername: true, malUsername: true, activeListProvider: true },
      });
      if (!profile || !hasWatchedListLink(profile)) {
        socket.emit('watched:pool_stats', {
          animeCount: 0,
          playableSongs: 0,
          soundCount,
          insufficient: true,
          distinctNames: 0,
        });
        return;
      }
      const { ids, listError } = await resolvePlayerCatalogueWithMeta(userId, profile);
      const resolvedPrecision = normalizePrecision(input?.precision);
      const artistFilters = {
        ...songFilters,
        watchedIds: ids,
        requirePlayableArtist: resolvedPrecision === 'artist',
      };
      const playableSongs = await countPlayableWatchedSongs(ids, artistFilters);
      const playableAnimeIds = await listPlayableAnimeIds(artistFilters);
      const distinctNames =
        resolvedPrecision === 'artist'
          ? await countDistinctArtistCredits(artistFilters)
          : await countDistinctChoiceNames(resolvedPrecision, playableAnimeIds);
      socket.emit('watched:pool_stats', {
        animeCount: ids.length,
        playableSongs,
        soundCount,
        insufficient: playableSongs < soundCount,
        distinctNames,
        watchedMode: input?.watchedMode,
        listError,
      });
    } catch (e) {
      logger.error('Failed to resolve watched pool stats', 'Watched', e);
      socket.emit('watched:pool_stats', {
        animeCount: 0,
        playableSongs: 0,
        soundCount: input?.soundCount ?? 10,
        insufficient: true,
      });
    }
  };

  const getPlaylistPoolStats = async (input: {
    playlistId?: string | null;
    decadePlaylistId?: string | null;
    roomId?: string;
    soundCount?: number;
    difficulty?: string[];
    types?: string[];
    playlistWatched?: boolean;
    watchedMode?: 'union' | 'intersection';
    precision?: string;
    allowFallback?: boolean;
    requestId?: number;
  }) => {
    const userId = socket.data.userId;
    const primaryId = input?.playlistId || input?.decadePlaylistId || '';
    if (!userId || !hasPlaylistSource(input ?? {})) return;
    const withRequestId = <T extends { requestId?: number }>(payload: T): T => ({
      ...payload,
      requestId: input?.requestId,
    });
    const empty = () =>
      emptyPlaylistPoolStats(
        primaryId,
        input?.soundCount ?? 10,
        input?.decadePlaylistId ?? undefined,
        input?.requestId,
      );
    try {
      const room = input.roomId ? gameManager.getRoom(input.roomId) : undefined;
      if (room && room.players.has(userId)) {
        if (userId !== room.hostId) return;
        const stats = await getPlaylistPoolStatsForRoom(room, {
          playlistId: input.playlistId,
          decadePlaylistId: input.decadePlaylistId,
          soundCount: input.soundCount,
          ...resolvePoolQueryFilters({ difficulty: input.difficulty, types: input.types }),
          playlistWatched: input.playlistWatched,
          watchedMode: input.watchedMode,
        });
        socket.emit('playlist:pool_stats', 'missing' in stats ? empty() : withRequestId(stats));
        return;
      }

      const playlistWatched = Boolean(input.playlistWatched);
      let watchedIds: number[] | undefined;
      let listError: 'anilist_blocked' | undefined;
      if (playlistWatched) {
        const profile = await prisma.profile.findUnique({
          where: { id: userId },
          select: { anilistUsername: true, malUsername: true, activeListProvider: true },
        });
        if (profile && hasWatchedListLink(profile)) {
          const resolved = await resolvePlayerCatalogueWithMeta(userId, profile);
          watchedIds = resolved.ids;
          listError = resolved.listError;
        } else {
          watchedIds = [];
        }
      }

      const stats = await computePlaylistPoolStats({
        playlistId: input.playlistId,
        decadePlaylistId: input.decadePlaylistId,
        soundCount: input.soundCount ?? 10,
        songFilters: resolvePoolQueryFilters({ difficulty: input.difficulty, types: input.types }),
        precision: input.precision,
        playlistWatched,
        allowFallback: Boolean(input.allowFallback),
        watchedMode: input.watchedMode,
        watchedIds,
        listError,
      });
      socket.emit('playlist:pool_stats', 'missing' in stats ? empty() : withRequestId(stats));
    } catch (e) {
      logger.error('Failed to resolve playlist pool stats', 'Playlist', e);
      socket.emit('playlist:pool_stats', empty());
    }
  };

  const getCataloguePoolStats = async (input?: {
    soundCount?: number;
    difficulty?: string[];
    types?: string[];
    requestId?: number;
  }) => {
    const soundCount = input?.soundCount ?? 10;
    const songFilters = resolvePoolQueryFilters({
      difficulty: input?.difficulty,
      types: input?.types,
    });
    try {
      const [playableSongs, animeIds] = await Promise.all([
        countPlayableSongs(songFilters),
        listPlayableAnimeIds(songFilters),
      ]);
      socket.emit('catalogue:pool_stats', {
        playableSongs,
        animeCount: animeIds.length,
        soundCount,
        requestId: input?.requestId,
      });
    } catch (e) {
      logger.error('Failed to resolve catalogue pool stats', 'Game', e);
      socket.emit('catalogue:pool_stats', {
        playableSongs: 0,
        animeCount: 0,
        soundCount,
        requestId: input?.requestId,
      });
    }
  };

  socket.on(
    'watched:get_pool_stats',
    guardSilent(socket, 'watched:get_pool_stats', RATE_LIMITS.poolStats, getWatchedPoolStats),
  );
  socket.on(
    'playlist:get_pool_stats',
    guardSilent(socket, 'playlist:get_pool_stats', RATE_LIMITS.poolStats, getPlaylistPoolStats),
  );
  socket.on(
    'catalogue:get_pool_stats',
    guardSilent(socket, 'catalogue:get_pool_stats', RATE_LIMITS.poolStats, getCataloguePoolStats),
  );
};
