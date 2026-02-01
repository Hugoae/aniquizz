import { Server } from 'socket.io';
import { customAlphabet } from 'nanoid';
import { logger } from '../../utils/logger';
import { GameCore } from './classes/GameCore';
import { StandardGame } from './classes/StandardGame';

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

    // Factory pattern pour les modes de jeu
    if (settings.gameType === 'battle-royale') {
        logger.warn("Mode BR non implémenté, fallback Standard");
        game = new StandardGame(roomId, this.io, hostId, settings);
    } else {
        game = new StandardGame(roomId, this.io, hostId, settings);
    }
    
    // On force un avatar par défaut si non fourni
    game.settings.hostAvatar = settings.hostAvatar || 'player1';

    this.games.set(roomId, game);
    logger.info(`Nouvelle partie créée : ${roomId}`, 'GameManager');
    
    return game;
  }

  getGame(roomId: string): GameCore | undefined {
    return this.games.get(roomId);
  }

  removeGame(roomId: string) {
    if (this.games.has(roomId)) {
      this.games.delete(roomId);
    }
  }

  getGameList() {
    return Array.from(this.games.values())
      // Optionnel : Filtrer pour ne montrer que les parties en 'waiting'
      // .filter(game => game.status === 'waiting') 
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
        // ✅ AJOUT : On envoie les settings complets pour l'affichage des badges
        settings: game.settings 
      }));
  }
}