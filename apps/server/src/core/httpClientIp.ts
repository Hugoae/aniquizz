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

/**
 * Socket.io handshake IP. Trusts `X-Forwarded-For` first hop only in production
 * (same rule as Express `trust proxy` 1).
 */
export const handshakeClientIp = (
  handshake: {
    address?: string;
    headers?: Record<string, string | string[] | undefined>;
  },
  nodeEnv: string,
): string => {
  const remote = handshake.address?.trim() || 'unknown';
  if (nodeEnv === 'production') {
    const forwarded = handshake.headers?.['x-forwarded-for'];
    const header = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const firstHop = header?.split(',')[0]?.trim();
    if (firstHop) return firstHop.replace(IPV4_MAPPED_PREFIX, '');
  }
  return remote.replace(IPV4_MAPPED_PREFIX, '');
};
