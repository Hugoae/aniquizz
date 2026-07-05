import { Server, Socket } from 'socket.io';
import { gameManager } from '../../index';
import { getAllAnimeNames } from './gameService';
import { getUserAnimeIds } from '../anilist/anilistService';
import { logger } from '../../utils/logger';
import { guard, requireAuth, RATE_LIMITS } from '../../core/guards';

export const registerGameHandlers = (io: Server, socket: Socket) => {

  const startGame = ({ roomId }: { roomId: string }) => {
    gameManager.getGame(roomId)?.startGame();
  };

  const submitAnswer = (payload: any) => {
    try {
        gameManager
          .getGame(payload.roomId)
          ?.handleAnswer(socket.id, payload.answer, payload.mode);
    } catch (e) {
        logger.error(`Erreur submitAnswer`, 'Socket', e);
    }
  };

  const votePause = ({ roomId }: { roomId: string }) => {
    const game = gameManager.getGame(roomId);
    if (game) game.togglePause(socket.id);
  };

  const voteSkip = ({ roomId }: { roomId: string }) => {
    const game = gameManager.getGame(roomId);
    // Dans TimeTrialGame, ceci déclenche le skip avec pénalité
    if (game) game.voteSkip(socket.id);
  };

  const skipCurrentRound = ({ roomId }: { roomId: string }) => {
    const game = gameManager.getGame(roomId);
    if (game) game.forceEndRound();
  };

  const returnToLobby = ({ roomId }: { roomId: string }) => {
    const game = gameManager.getGame(roomId);
    if (game) {
        game.playerReturnToLobby(socket.id);
    }
  };

  const cancelGame = ({ roomId }: { roomId: string }) => {
    const game = gameManager.getGame(roomId);
    if (game && String(game.hostId) === String(socket.id)) {
        game.cancelGame();
    }
  };

  const playerWatchedIds = (payload: { roomId: string; ids: number[] }) => {
    const game = gameManager.getGame(payload.roomId);
    if (!game) return;
    const player = game.players.get(socket.id) as any;
    if (player) player.watchedIds = payload.ids;
  };

  const getGameState = ({ roomId }: { roomId: string }) => {
      const game = gameManager.getGame(roomId);
      if (!game) return;
      const state = game.getSyncState();
      socket.emit('game_state_sync', state);
  };

  const getMyWatched = async ({ username }: { username: string }) => {
      if (!username) return;
      try {
          const start = Date.now();
          const ids = await getUserAnimeIds(username);
          const duration = Date.now() - start;
          if (duration > 2000) logger.warn(`[Anilist] Fetch lent pour ${username}: ${duration}ms`, 'Anilist');
          
          socket.emit('my_watched_list', ids);
      } catch (e) {
          logger.error("Erreur fetch watched", 'Anilist', e);
          socket.emit('my_watched_list', []);
      }
  };

  socket.on('start_game', requireAuth(socket, startGame));
  socket.on('get_game_state', getGameState);
  socket.on('game:answer', guard(socket, 'game:answer', RATE_LIMITS.answer, submitAnswer));
  socket.on('vote_pause', requireAuth(socket, votePause));
  socket.on('vote_skip', requireAuth(socket, voteSkip));
  socket.on('game:skip_round', requireAuth(socket, skipCurrentRound));
  socket.on('game:return_to_lobby', requireAuth(socket, returnToLobby));
  socket.on('game:cancel', requireAuth(socket, cancelGame));
  socket.on('player_watched_ids', requireAuth(socket, playerWatchedIds));
  socket.on('get_my_watched', getMyWatched);

  socket.on('get_anime_list', async () => {
    try {
      const list = await getAllAnimeNames();
      socket.emit('anime_list', list);
    } catch (error) {
      console.error('Erreur fetching anime list:', error);
    }
  });
};