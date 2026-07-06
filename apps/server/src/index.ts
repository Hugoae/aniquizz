import 'dotenv/config';
import { env } from './config/env';
import { app, httpServer, io } from './core/Server';
import { prisma } from '@aniquizz/database';
import { SocketManager } from './core/SocketManager';
import { registerCrashHandlers } from './core/crashHandlers';
import { registerShutdownHandlers } from './core/shutdown';
import { registerHealthRoute } from './routes/health';
import { registerAdminRoutes } from './modules/admin/adminRoutes';
import { logger } from './utils/logger';
import { captureError } from './utils/errorReporter';
import { GameManager } from './modules/game/gameManager';

const PORT = env.PORT;

registerCrashHandlers();

async function main() {
  try {
    // 1. Connexion BDD
    await prisma.$connect();
    logger.info('Connected to Database', 'Database');

    // 2. Game manager (single owner, injected into the socket layer).
    const gameManager = new GameManager(io);
    registerHealthRoute(app, io, () => gameManager);
    registerAdminRoutes(app, io, gameManager);

    // 3. Socket manager wires all feature handlers.
    const socketManager = new SocketManager(io, gameManager);
    socketManager.initialize();
    logger.info('Socket Manager initialized', 'Server');

    // 4. Démarrage Serveur HTTP
    httpServer.listen(PORT, () => {
      logger.info(`Server running on http://localhost:${PORT}`, 'Server');
    });

    // 5. Arrêt gracieux (Ctrl+C local, restart Render)
    registerShutdownHandlers({ httpServer, io });

  } catch (error) {
    captureError(error, { context: 'Server', source: 'bootstrap' });
    process.exit(1);
  }
}

main();