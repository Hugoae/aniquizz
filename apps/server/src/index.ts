import 'dotenv/config';
import { httpServer, io } from './core/Server';
import { prisma } from '@aniquizz/database';
import { SocketManager } from './core/SocketManager';
import { logger } from './utils/logger';
import { GameManager } from './modules/game/gameManager';
export let gameManager: GameManager;

const PORT = process.env.PORT || 3001;

async function main() {
  try {
    // 1. Connexion BDD
    await prisma.$connect();
    logger.info('Connected to Database', 'Database');

    gameManager = new GameManager(io);
    // 2. Initialisation des Sockets
    const socketManager = new SocketManager(io);
    socketManager.initialize();
    logger.info('Socket Manager initialized', 'Server');

    // 3. Démarrage Serveur HTTP
    httpServer.listen(PORT, () => {
      logger.info(`Server running on http://localhost:${PORT}`, 'Server');
    });

  } catch (error) {
    logger.error('Failed to start server', 'Server', error);
    process.exit(1);
  }
}

main();