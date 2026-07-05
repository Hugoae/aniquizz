import { captureError } from '../utils/errorReporter';

/**
 * Registers process-level crash handlers so unexpected failures are always logged
 * with full stack traces before the process exits or continues.
 */
export function registerCrashHandlers(): void {
  process.on('uncaughtException', (error) => {
    captureError(error, { source: 'uncaughtException', context: 'Process' });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    const error =
      reason instanceof Error ? reason : new Error(String(reason ?? 'Unhandled rejection'));
    captureError(error, { source: 'unhandledRejection', context: 'Process' });
  });
}
