import {
  answerInputSchema,
  getFuzzySuggestions,
  normalizePrecision,
  roomIdInputSchema,
  type AnimeSearchInput,
  type ArtistSearchInput,
} from '@aniquizz/shared';
import { validateMusicSourceStart } from './playlistPoolService';
import type { TypedServer, TypedSocket } from '../../core/socketTypes';
import type { GameManager } from './gameManager';
import {
  getAllAnimeNames,
  getAllArtistSearchEntries,
  countPlayableWatchedSongs,
} from './gameService';
import { resolvePlayerCatalogueIds } from '../lists/listResolver';
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

  const skipCurrentRound = (payload: { roomId: string }) => {
    const parsed = parseSocketPayload(socket, roomIdInputSchema, payload);
    if (!parsed) return;
    gameManager.getRoom(parsed.roomId)?.forceEndRound(uid());
  };

  const returnToLobby = (payload: { roomId: string }) => {
    const parsed = parseSocketPayload(socket, roomIdInputSchema, payload);
    if (!parsed) return;
    gameManager.getRoom(parsed.roomId)?.playerReturnToLobby(uid());
  };

  const cancelGame = (payload: { roomId: string }) => {
    const parsed = parseSocketPayload(socket, roomIdInputSchema, payload);
    if (!parsed) return;
    gameManager.getRoom(parsed.roomId)?.cancelMatch(uid());
  };

  const getGameState = (payload: { roomId: string }) => {
    const parsed = parseSocketPayload(socket, roomIdInputSchema, payload);
    if (!parsed) return;
    const room = gameManager.getRoom(parsed.roomId);
    if (!room || !room.players.has(uid())) return;
    // A refresh drops the previous socket. Match events go to `io.to(room.id)`,
    // so the new socket must rejoin that channel and replace `player.socketId`.
    // Do not `markInLobby` here — that can abort a playing match.
    void socket.join(room.id);
    gameManager.cancelCleanup(room.id);
    room.reattachMatchSocket(uid(), socket.id);
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

  socket.on('start_game', guard(socket, 'start_game', RATE_LIMITS.startGame, startGame));
  socket.on('game:answer', guard(socket, 'game:answer', RATE_LIMITS.answer, submitAnswer));
  socket.on('vote_pause', guard(socket, 'vote_pause', RATE_LIMITS.vote, votePause));
  socket.on('vote_skip', guard(socket, 'vote_skip', RATE_LIMITS.vote, voteSkip));
  socket.on(
    'game:skip_round',
    guard(socket, 'game:skip_round', RATE_LIMITS.vote, skipCurrentRound),
  );
  socket.on('game:return_to_lobby', requireAuth(socket, returnToLobby));
  socket.on('game:cancel', requireAuth(socket, cancelGame));
  socket.on('get_game_state', requireAuth(socket, getGameState));
  socket.on('get_my_watched', requireAuth(socket, getMyWatched));
  socket.on('get_watched_count', requireAuth(socket, getWatchedCount));
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
