import 'dotenv/config';
import { env } from './config/env';
import { app, httpServer, io } from './core/Server';
import { prisma } from '@aniquizz/database';
import { SocketManager } from './core/SocketManager';
import { registerCrashHandlers } from './core/crashHandlers';
import { registerShutdownHandlers } from './core/shutdown';
import { registerHealthRoute } from './routes/health';
import { registerLeaderboardRoute } from './routes/leaderboard';
import { registerLibraryRoutes } from './routes/library';
import { registerSuggestionRoutes } from './routes/suggestions';
import { registerAdminRoutes } from './modules/admin/adminRoutes';
import { logger } from './utils/logger';
import { captureError } from './utils/errorReporter';
import { GameManager } from './modules/game/gameManager';
import { warmCatalogueCaches } from './modules/game/gameService';

const PORT = env.PORT;

registerCrashHandlers();

async function main() {
  try {
    // 1. DB connection
    await prisma.$connect();
    logger.info('Connected to Database', 'Database');

    // 2. Game manager (single owner, injected into the socket layer).
    const gameManager = new GameManager(io);
    registerHealthRoute(app, io, () => gameManager);
    registerLeaderboardRoute(app);
    registerLibraryRoutes(app);
    registerSuggestionRoutes(app);
    registerAdminRoutes(app, io, gameManager);

    // 3. Socket manager wires all feature handlers.
    const socketManager = new SocketManager(io, gameManager);
    socketManager.initialize();
    logger.info('Socket Manager initialized', 'Server');

    // 4. Start HTTP server
    httpServer.listen(PORT, () => {
      logger.info(`Server running on http://localhost:${PORT}`, 'Server');
    });

    // 5. Graceful shutdown (Ctrl+C locally, Render restart)
    registerShutdownHandlers({ httpServer, io });

    // 6. Warm catalogue caches so the first match / autocomplete skips the cold scan.
    void warmCatalogueCaches().catch((error) => {
      logger.warn('Catalogue cache warm-up failed (non-fatal)', 'Server', error);
    });

  } catch (error) {
    captureError(error, { context: 'Server', source: 'bootstrap' });
    process.exit(1);
  }
}

main();