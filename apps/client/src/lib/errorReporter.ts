const IS_DEBUG =
  import.meta.env.DEV || import.meta.env.VITE_DEBUG_REPORTING === 'true';

export type ClientErrorContext = {
  source?: string;
  [key: string]: unknown;
};

/**
 * Client-side error reporter. Logs to the console when debug reporting is enabled.
 * Single hook point for Sentry (or similar) later.
 */
export function captureClientError(error: unknown, context: ClientErrorContext = {}): void {
  if (!IS_DEBUG) return;

  const normalized =
    error instanceof Error
      ? error
      : new Error(typeof error === 'string' ? error : 'Unknown client error');

  // eslint-disable-next-line no-console
  console.error('[client:error]', {
    message: normalized.message,
    stack: normalized.stack,
    ...context,
  });
}

export function isClientDebugReportingEnabled(): boolean {
  return IS_DEBUG;
}
