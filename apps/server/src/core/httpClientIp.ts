import type { Request } from 'express';

const IPV4_MAPPED_PREFIX = /^::ffff:/i;

/** Render (and only production) sits one hop in front of Express. */
export const configureTrustedProxy = (
  app: { set: (setting: string, val: unknown) => void },
  nodeEnv: string,
): void => {
  if (nodeEnv === 'production') {
    app.set('trust proxy', 1);
  }
};

/**
 * Client identity for HTTP rate limits.
 * Uses Express `req.ip`, which honours `X-Forwarded-For` only when `trust proxy` is set.
 */
export const clientIp = (
  req: Pick<Request, 'ip'> & { socket?: { remoteAddress?: string | null } },
): string => {
  const raw = req.ip?.trim() || req.socket?.remoteAddress?.trim() || 'unknown';
  return raw.replace(IPV4_MAPPED_PREFIX, '');
};
