import { Server, Socket } from 'socket.io';
import { gameManager } from '../../index';
import { getAllAnimeNames } from './gameService';
import { getUserAnimeIds } from '../anilist/anilistService';

export const registerGameHandlers = (io: Server, socket: Socket) => {

  const startGame = ({ roomId }: { roomId: string }) => {
    gameManager.getGame(roomId)?.startGame();
  };

  const submitAnswer = (payload: any) => {
    gameManager
      .getGame(payload.roomId)
      ?.handleAnswer(socket.id, payload.answer, payload.mode);
  };

  const votePause = ({ roomId }: { roomId: string }) => {
    const game = gameManager.getGame(roomId);
    if (game) game.togglePause(socket.id);
  };

  const voteSkip = ({ roomId }: { roomId: string }) => {
    const game = gameManager.getGame(roomId);
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

  // ✅ NOUVEAU HANDLER : Pour que le client récupère sa liste 'watched'
  const getMyWatched = async ({ username }: { username: string }) => {
      if (!username) return;
      try {
          const ids = await getUserAnimeIds(username);
          socket.emit('my_watched_list', ids);
      } catch (e) {
          console.error("Erreur fetch watched", e);
          socket.emit('my_watched_list', []);
      }
  };

  socket.on('start_game', startGame);
  socket.on('get_game_state', getGameState);
  socket.on('game:answer', submitAnswer);
  socket.on('vote_pause', votePause);
  socket.on('vote_skip', voteSkip);
  socket.on('game:skip_round', skipCurrentRound);
  socket.on('game:return_to_lobby', returnToLobby);
  socket.on('game:cancel', cancelGame);
  socket.on('player_watched_ids', playerWatchedIds);
  socket.on('get_my_watched', getMyWatched); // <-- Ajouté ici

  socket.on('get_anime_list', async () => {
    try {
      const list = await getAllAnimeNames();
      socket.emit('anime_list', list);
    } catch (error) {
      console.error('Erreur fetching anime list:', error);
    }
  });
};