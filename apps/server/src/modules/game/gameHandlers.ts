import type { TypedServer, TypedSocket } from '../../core/socketTypes';
import type { GameManager } from './gameManager';
import { getAllAnimeNames } from './gameService';
import { getUserAnimeIds } from '../anilist/anilistService';
import { logger } from '../../utils/logger';
import { captureError } from '../../utils/errorReporter';
import { guard, requireAuth, RATE_LIMITS } from '../../core/guards';

export const registerGameHandlers = (
  io: TypedServer,
  socket: TypedSocket,
  gameManager: GameManager,
) => {
  // requireAuth/guard guarantee a non-null userId before these run.
  const uid = (): string => socket.data.userId as string;

  const startGame = ({ roomId }: { roomId: string }) => {
    const room = gameManager.getRoom(roomId);
    if (!room) return;
    const check = room.canStartMatch(uid());
    if (!check.ok) {
      socket.emit('error', { message: check.reason ?? 'Impossible de lancer la partie.' });
      return;
    }
    void room.startMatch();
  };

  const submitAnswer = ({
    roomId,
    answer,
    answerType,
  }: {
    roomId: string;
    answer: string;
    answerType: 'typing' | 'qcm' | 'duo';
  }) => {
    gameManager.getRoom(roomId)?.handleAnswer(uid(), answer, answerType);
  };

  const votePause = ({ roomId }: { roomId: string }) => {
    gameManager.getRoom(roomId)?.votePause(uid());
  };

  const voteSkip = ({ roomId }: { roomId: string }) => {
    gameManager.getRoom(roomId)?.voteSkip(uid());
  };

  const skipCurrentRound = ({ roomId }: { roomId: string }) => {
    gameManager.getRoom(roomId)?.forceEndRound();
  };

  const returnToLobby = ({ roomId }: { roomId: string }) => {
    gameManager.getRoom(roomId)?.playerReturnToLobby(uid());
  };

  const cancelGame = ({ roomId }: { roomId: string }) => {
    gameManager.getRoom(roomId)?.cancelMatch(uid());
  };

  const playerWatchedIds = ({ roomId, ids }: { roomId: string; ids: number[] }) => {
    gameManager.getRoom(roomId)?.setWatchedIds(uid(), ids);
  };

  const getGameState = ({ roomId }: { roomId: string }) => {
    const room = gameManager.getRoom(roomId);
    if (room) socket.emit('game_state_sync', room.getSyncState());
  };

  const getMyWatched = async ({ username }: { username: string }) => {
    if (!username) return;
    try {
      const ids = await getUserAnimeIds(username);
      socket.emit('my_watched_list', ids);
    } catch (e) {
      logger.error('Failed to fetch watched list', 'Anilist', e);
      socket.emit('my_watched_list', []);
    }
  };

  const getAnimeList = async () => {
    try {
      socket.emit('anime_list', await getAllAnimeNames());
    } catch (error) {
      captureError(error, { context: 'Game', source: 'get_anime_list' });
    }
  };

  socket.on('start_game', requireAuth(socket, startGame));
  socket.on('game:answer', guard(socket, 'game:answer', RATE_LIMITS.answer, submitAnswer));
  socket.on('vote_pause', requireAuth(socket, votePause));
  socket.on('vote_skip', requireAuth(socket, voteSkip));
  socket.on('game:skip_round', requireAuth(socket, skipCurrentRound));
  socket.on('game:return_to_lobby', requireAuth(socket, returnToLobby));
  socket.on('game:cancel', requireAuth(socket, cancelGame));
  socket.on('player_watched_ids', requireAuth(socket, playerWatchedIds));
  socket.on('get_game_state', getGameState);
  socket.on('get_my_watched', getMyWatched);
  socket.on('get_anime_list', getAnimeList);
};
