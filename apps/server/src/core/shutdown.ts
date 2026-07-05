import type { Server as HttpServer } from 'http';
import type { Server as IoServer } from 'socket.io';
import { prisma } from '@aniquizz/database';
import { logger } from '../utils/logger';
import { captureError } from '../utils/errorReporter';

/** Force-exit deadline: if graceful cleanup hangs, kill the process anyway. */
const FORCE_EXIT_TIMEOUT_MS = 8_000;

let shuttingDown = false;

type ShutdownDeps = {
  httpServer: HttpServer;
  io: IoServer;
};

async function closeGracefully(deps: ShutdownDeps, signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  const shutdownLogger = logger.child({ context: 'Server' });
  shutdownLogger.info(`Received ${signal}, shutting down gracefully...`);

  // Hard deadline so a stuck connection never blocks process exit.
  const forceExit = setTimeout(() => {
    shutdownLogger.warn('Graceful shutdown timed out, forcing exit.');
    process.exit(1);
  }, FORCE_EXIT_TIMEOUT_MS);
  forceExit.unref();

  try {
    // Drop live socket connections so io/http can close without lingering clients.
    deps.io.disconnectSockets(true);

    // io.close() also closes the underlying HTTP server it was attached to.
    await new Promise<void>((resolve, reject) => {
      deps.io.close((err) => (err ? reject(err) : resolve()));
    });

    await prisma.$disconnect();

    shutdownLogger.info('Shutdown complete.');
    clearTimeout(forceExit);
    process.exit(0);
  } catch (error) {
    captureError(error, { context: 'Server', source: 'shutdown' });
    clearTimeout(forceExit);
    process.exit(1);
  }
}

/**
 * Registers SIGINT/SIGTERM handlers for clean shutdown of Socket.io, the HTTP
 * server, and the Prisma connection. Needed for local Ctrl+C and Render restarts.
 */
export function registerShutdownHandlers(deps: ShutdownDeps): void {
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      void closeGracefully(deps, signal);
    });
  }
}
