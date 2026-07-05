import { Server } from 'socket.io';
import { customAlphabet } from 'nanoid';
import { logger } from '../../utils/logger';
import { GameCore } from './classes/GameCore';
import { StandardGame } from './classes/StandardGame';
import { ChallengerGame } from './classes/ChallengerGame'; 
import { TimeTrialGame } from './classes/TimeTrialGame'; 

export class GameManager {
  private games: Map<string, GameCore>; 
  private io: Server;
  private generateId = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);

  constructor(io: Server) {
    this.io = io;
    this.games = new Map();
  }

  createGame(hostId: string, settings: any): GameCore {
    const roomId = this.generateId();
    let game: GameCore;

    // Factory pattern
    if (settings.gameType === 'challenger') {
        game = new ChallengerGame(roomId, this.io, hostId, settings);
        logger.info(`[GameManager] Nouvelle partie Challenger instanciée : ${roomId}`, 'GameManager');
    } else if (settings.gameType === 'time-trial') { 
        game = new TimeTrialGame(roomId, this.io, hostId, settings);
        logger.info(`[GameManager] Nouvelle partie Time Trial instanciée : ${roomId}`, 'GameManager');
    } else {
        // Par défaut Standard
        game = new StandardGame(roomId, this.io, hostId, settings);
        logger.info(`[GameManager] Nouvelle partie Standard instanciée : ${roomId}`, 'GameManager');
    }
    
    game.settings.hostAvatar = settings.hostAvatar || 'player1';

    this.games.set(roomId, game);
    
    return game;
  }

  getGame(roomId: string): GameCore | undefined {
    return this.games.get(roomId);
  }

  removeGame(roomId: string) {
    if (this.games.has(roomId)) {
      this.games.delete(roomId);
      logger.debug(`[GameManager] Instance de jeu ${roomId} supprimée de la mémoire.`, 'GameManager');
    }
  }

  getGameList() {
    return Array.from(this.games.values())
      .map(game => ({
        id: game.id,
        name: game.settings.name,
        host: game.settings.hostName,
        hostAvatar: game.settings.hostAvatar,
        mode: game.settings.gameType,
        players: game.players.size,
        maxPlayers: game.settings.maxPlayers,
        isPrivate: game.settings.isPrivate,
        status: game.status,
        settings: game.settings 
      }));
  }

  getStats() {
    const games = Array.from(this.games.values());
    return {
      activeRooms: games.length,
      activeMatches: games.filter((g) => g.status === 'playing').length,
      playersInRooms: games.reduce((sum, g) => sum + g.players.size, 0),
    };
  }
}