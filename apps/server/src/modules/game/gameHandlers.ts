import type { TypedServer, TypedSocket } from '../../core/socketTypes';
import type { GameManager } from './gameManager';
import { getAllAnimeNames, countPlayableWatchedSongs } from './gameService';
import { getUserAnimeIds } from '../anilist/anilistService';
import { prisma } from '@aniquizz/database';
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
    void room.startMatch(() => gameManager.broadcastRoomList());
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

  const getGameState = ({ roomId }: { roomId: string }) => {
    const room = gameManager.getRoom(roomId);
    if (room) socket.emit('game_state_sync', room.getSyncState());
  };

  const getMyWatched = async () => {
    const userId = socket.data.userId;
    if (!userId) return;
    try {
      const profile = await prisma.profile.findUnique({
        where: { id: userId },
        select: { anilistUsername: true },
      });
      const username = profile?.anilistUsername?.trim();
      if (!username) {
        socket.emit('my_watched_list', []);
        return;
      }
      const ids = await getUserAnimeIds(username);
      socket.emit('my_watched_list', ids);
    } catch (e) {
      logger.error('Failed to fetch watched list', 'Anilist', e);
      socket.emit('my_watched_list', []);
    }
  };

  const getWatchedCount = async () => {
    const userId = socket.data.userId;
    if (!userId) return;
    try {
      const profile = await prisma.profile.findUnique({
        where: { id: userId },
        select: { anilistUsername: true },
      });
      const username = profile?.anilistUsername?.trim();
      if (!username) {
        socket.emit('watched_count', { listSize: 0, playableSongs: 0 });
        return;
      }
      const ids = await getUserAnimeIds(username);
      const playableSongs = await countPlayableWatchedSongs(ids);
      socket.emit('watched_count', { listSize: ids.length, playableSongs });
    } catch (e) {
      logger.error('Failed to count watched songs', 'Anilist', e);
      socket.emit('watched_count', { listSize: 0, playableSongs: 0 });
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
  socket.on('get_game_state', getGameState);
  socket.on('get_my_watched', requireAuth(socket, getMyWatched));
  socket.on('get_watched_count', requireAuth(socket, getWatchedCount));
  socket.on('get_anime_list', getAnimeList);
};
