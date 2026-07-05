import { AppError } from './errors';
import { logger, type LogBindings } from './logger';

export type ErrorContext = LogBindings & {
  source?: string;
  event?: string;
  [key: string]: unknown;
};

/**
 * Single entry point for server-side error reporting.
 * Logs structured errors today; wire Sentry (or similar) here later.
 */
export function captureError(error: unknown, context: ErrorContext = {}): void {
  const normalized =
    error instanceof Error
      ? error
      : new Error(typeof error === 'string' ? error : 'Unknown error');

  const payload: Record<string, unknown> = {
    ...context,
    err: normalized,
  };

  if (normalized instanceof AppError) {
    payload.errorCode = normalized.code;
    payload.statusCode = normalized.statusCode;
  }

  const child = logger.child({
    context: (context.context as string) ?? 'ErrorReporter',
    userId: context.userId as string | undefined,
    roomId: context.roomId as string | undefined,
    matchId: context.matchId as string | undefined,
  });

  child.error(normalized.message, undefined, payload);
}
