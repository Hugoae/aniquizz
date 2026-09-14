import {
  answerInputSchema,
  getFuzzySuggestions,
  hasPlaylistSource,
  hasWatchedListLink,
  normalizePrecision,
  resolvePoolQueryFilters,
  roomIdInputSchema,
  type AnimeSearchInput,
  type ArtistSearchInput,
} from '@aniquizz/shared';
import { getWatchedPoolStatsForPlayers } from './watchedPoolService';
import {
  computePlaylistPoolStats,
  emptyPlaylistPoolStats,
  getPlaylistPoolStatsForRoom,
  validateMusicSourceStart,
} from './playlistPoolService';
import type { TypedServer, TypedSocket } from '../../core/socketTypes';
import type { GameManager } from './gameManager';
import {
  getAllAnimeNames,
  getAllArtistSearchEntries,
  countPlayableWatchedSongs,
  countPlayableSongs,
  countDistinctArtistCredits,
  countDistinctChoiceNames,
  listPlayableAnimeIds,
} from './gameService';
import { resolvePlayerCatalogueIds, resolvePlayerCatalogueWithMeta } from '../lists/listResolver';
import { prisma } from '@aniquizz/database';
import { logger } from '../../utils/logger';
import { captureError } from '../../utils/errorReporter';
import { guard, guardSilent, requireAuth, RATE_LIMITS } from '../../core/guards';
import { parseSocketPayload } from '../../core/parseSocketPayload';

export const registerGameHandlers = (
  io: TypedServer,
  socket: TypedSocket,
  gameManager: GameManager,
) => {
  // requireAuth/guard guarantee a non-null userId before these run.
  const uid = (): string => socket.data.userId as string;

  const startGame = async (payload: { roomId: string }) => {
    const parsed = parseSocketPayload(socket, roomIdInputSchema, payload);
    if (!parsed) return;
    const { roomId } = parsed;
    const room = gameManager.getRoom(roomId);
    if (!room) return;
    const check = room.canStartMatch(uid());
    if (!check.ok) {
      socket.emit('error', { message: check.reason ?? 'Impossible de lancer la partie.' });
      return;
    }
    const settingsAtValidation = room.settings;
    const sourceCheck = await validateMusicSourceStart(room);
    if (!sourceCheck.ok) {
      socket.emit('error', {
        message: sourceCheck.reason ?? 'Liste insuffisante pour cette source.',
      });
      return;
    }
    if (room.settings !== settingsAtValidation) {
      socket.emit('error', {
        message: 'Paramètres modifiés pendant la vérification, relancez.',
      });
      return;
    }
    void room.startMatch(() => gameManager.broadcastRoomList());
  };

  const submitAnswer = (payload: {
    roomId: string;
    answer: string;
    answerType: 'typing' | 'qcm' | 'duo';
    revealAfterAnswer?: boolean;
  }) => {
    const parsed = parseSocketPayload(socket, answerInputSchema, payload);
    if (!parsed) return;
    gameManager.getRoom(parsed.roomId)?.handleAnswer(uid(), parsed.answer, parsed.answerType, {
      revealAfterAnswer: parsed.revealAfterAnswer,
    });
  };

  const votePause = (payload: { roomId: string }) => {
    const parsed = parseSocketPayload(socket, roomIdInputSchema, payload);
    if (!parsed) return;
    gameManager.getRoom(parsed.roomId)?.votePause(uid());
  };

  const voteSkip = (payload: { roomId: string }) => {
    const parsed = parseSocketPayload(socket, roomIdInputSchema, payload);
    if (!parsed) return;
    gameManager.getRoom(parsed.roomId)?.voteSkip(uid());
  };

  const skipCurrentRound = ({ roomId }: { roomId: string }) => {
    gameManager.getRoom(roomId)?.forceEndRound(uid());
  };

  const returnToLobby = ({ roomId }: { roomId: string }) => {
    gameManager.getRoom(roomId)?.playerReturnToLobby(uid());
  };

  const cancelGame = ({ roomId }: { roomId: string }) => {
    gameManager.getRoom(roomId)?.cancelMatch(uid());
  };

  const getGameState = ({ roomId }: { roomId: string }) => {
    const room = gameManager.getRoom(roomId);
    if (!room || !room.players.has(uid())) return;
    socket.emit('game_state_sync', room.getSyncState());
  };

  const getMyWatched = async () => {
    const userId = socket.data.userId;
    if (!userId) return;
    try {
      const ids = await resolvePlayerCatalogueIds(userId);
      socket.emit('my_watched_list', ids);
    } catch (e) {
      logger.error('Failed to fetch watched list', 'Watched', e);
      socket.emit('my_watched_list', []);
    }
  };

  const getWatchedCount = async () => {
    const userId = socket.data.userId;
    if (!userId) return;
    try {
      const ids = await resolvePlayerCatalogueIds(userId);
      const playableSongs = await countPlayableWatchedSongs(ids);
      socket.emit('watched_count', { listSize: ids.length, playableSongs });
    } catch (e) {
      logger.error('Failed to count watched songs', 'Watched', e);
      socket.emit('watched_count', { listSize: 0, playableSongs: 0 });
    }
  };

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

  // Server-side autocomplete: run the fuzzy match over the cached catalogue and
  // return only the ranked matches (tiny payload) instead of shipping the whole
  // catalogue to every client. `requestId` lets the client discard stale answers.
  const animeSearch = async ({ requestId, query, precision }: AnimeSearchInput) => {
    try {
      const list = await getAllAnimeNames();
      const results = getFuzzySuggestions(list, query, normalizePrecision(precision));
      socket.emit('anime:search_results', { requestId, results });
    } catch (error) {
      captureError(error, { context: 'Game', source: 'anime:search' });
      socket.emit('anime:search_results', { requestId, results: [] });
    }
  };

  // Ship the full catalogue name list once so the client can run the fuzzy match
  // locally (instant, no per-keystroke round-trip). The list is server-cached.
  const sendAllAnimeNames = async () => {
    try {
      const list = await getAllAnimeNames();
      socket.emit('anime:all_names', {
        animes: list.map((a) => ({ name: a.name, franchise: a.franchise, altNames: a.altNames })),
      });
    } catch (error) {
      captureError(error, { context: 'Game', source: 'anime:get_all' });
      socket.emit('anime:all_names', { animes: [] });
    }
  };

  const artistSearch = async ({ requestId, query }: ArtistSearchInput) => {
    try {
      const list = await getAllArtistSearchEntries();
      const results = getFuzzySuggestions(list, query, 'artist');
      socket.emit('artist:search_results', { requestId, results });
    } catch (error) {
      captureError(error, { context: 'Game', source: 'artist:search' });
      socket.emit('artist:search_results', { requestId, results: [] });
    }
  };

  const sendAllArtistNames = async () => {
    try {
      const artists = await getAllArtistSearchEntries();
      socket.emit('artist:all_names', { artists });
    } catch (error) {
      captureError(error, { context: 'Game', source: 'artist:get_all' });
      socket.emit('artist:all_names', { artists: [] });
    }
  };

  socket.on('start_game', requireAuth(socket, startGame));
  socket.on('game:answer', guard(socket, 'game:answer', RATE_LIMITS.answer, submitAnswer));
  socket.on('vote_pause', requireAuth(socket, votePause));
  socket.on('vote_skip', requireAuth(socket, voteSkip));
  socket.on('game:skip_round', requireAuth(socket, skipCurrentRound));
  socket.on('game:return_to_lobby', requireAuth(socket, returnToLobby));
  socket.on('game:cancel', requireAuth(socket, cancelGame));
  socket.on('get_game_state', requireAuth(socket, getGameState));
  socket.on('get_my_watched', requireAuth(socket, getMyWatched));
  socket.on('get_watched_count', requireAuth(socket, getWatchedCount));
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
  socket.on('watched:get_pool_stats', requireAuth(socket, getWatchedPoolStats));
  socket.on(
    'playlist:get_pool_stats',
    guardSilent(socket, 'playlist:get_pool_stats', RATE_LIMITS.poolStats, getPlaylistPoolStats),
  );
  socket.on('catalogue:get_pool_stats', requireAuth(socket, getCataloguePoolStats));
  socket.on(
    'anime:search',
    guardSilent(socket, 'anime:search', RATE_LIMITS.animeSearch, animeSearch),
  );
  socket.on(
    'anime:get_all',
    guardSilent(socket, 'anime:get_all', RATE_LIMITS.animeCatalogue, sendAllAnimeNames),
  );
  socket.on(
    'artist:search',
    guardSilent(socket, 'artist:search', RATE_LIMITS.animeSearch, artistSearch),
  );
  socket.on(
    'artist:get_all',
    guardSilent(socket, 'artist:get_all', RATE_LIMITS.animeCatalogue, sendAllArtistNames),
  );
};
