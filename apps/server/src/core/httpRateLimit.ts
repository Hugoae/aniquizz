import { createHash } from 'node:crypto';
import type { Response } from 'express';
import { prisma } from '@aniquizz/database';
import type { AuthedRequest } from './httpAuth';
import { logger } from '../utils/logger';

const CLEANUP_EVERY = 32;
let consumeCount = 0;

export const HTTP_RATE_LIMITS = {
  publicRead: { max: 90, windowMs: 60_000 },
  userMutation: { max: 30, windowMs: 60_000 },
  suggestionCreate: { max: 5, windowMs: 24 * 60 * 60 * 1000 },
} as const;

export { clientIp } from './httpClientIp';

export const hashRateLimitKey = (scope: string, identity: string): string =>
  createHash('sha256').update(`${scope}:${identity}`).digest('hex');

export interface RateLimitDecision {
  allowed: boolean;
  count: number;
  retryAfterSec: number;
}

const scheduleCleanup = (): void => {
  consumeCount += 1;
  if (consumeCount % CLEANUP_EVERY !== 0) return;
  void prisma.httpRateLimitBucket
    .deleteMany({ where: { expiresAt: { lt: new Date() } } })
    .catch((error) => {
      logger.warn('HTTP rate-limit bucket cleanup failed', 'RateLimit', error);
    });
};

export const consumeRateLimitBucket = async (
  scope: string,
  identity: string,
  max: number,
  windowMs: number,
): Promise<RateLimitDecision> => {
  const key = hashRateLimitKey(scope, identity);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowMs);
  scheduleCleanup();

  const rows = await prisma.$queryRaw<Array<{ count: number; expiresAt: Date }>>`
    INSERT INTO "HttpRateLimitBucket" ("key", "count", "windowStart", "expiresAt", "updatedAt")
    VALUES (${key}, 1, ${now}, ${expiresAt}, NOW())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "HttpRateLimitBucket"."expiresAt" <= NOW() THEN 1
        ELSE LEAST("HttpRateLimitBucket"."count" + 1, ${max} + 1)
      END,
      "windowStart" = CASE
        WHEN "HttpRateLimitBucket"."expiresAt" <= NOW() THEN EXCLUDED."windowStart"
        ELSE "HttpRateLimitBucket"."windowStart"
      END,
      "expiresAt" = CASE
        WHEN "HttpRateLimitBucket"."expiresAt" <= NOW() THEN EXCLUDED."expiresAt"
        ELSE "HttpRateLimitBucket"."expiresAt"
      END,
      "updatedAt" = NOW()
    RETURNING "count", "expiresAt"
  `;

  const row = rows[0];
  if (!row) {
    return { allowed: false, count: max, retryAfterSec: Math.ceil(windowMs / 1000) };
  }

  const retryAfterSec = Math.max(1, Math.ceil((row.expiresAt.getTime() - Date.now()) / 1000));
  return {
    allowed: row.count <= max,
    count: row.count,
    retryAfterSec,
  };
};

const applyRateLimitHeaders = (
  res: Response,
  max: number,
  decision: RateLimitDecision,
): void => {
  const remaining = Math.max(0, max - decision.count);
  res.setHeader('RateLimit-Limit', String(max));
  res.setHeader('RateLimit-Remaining', String(remaining));
  res.setHeader('RateLimit-Reset', String(decision.retryAfterSec));
  if (!decision.allowed) {
    res.setHeader('Retry-After', String(decision.retryAfterSec));
  }
};

export const enforceHttpRateLimit = async (
  req: AuthedRequest,
  res: Response,
  opts: { scope: string; identity: string; max: number; windowMs: number },
): Promise<boolean> => {
  try {
    const decision = await consumeRateLimitBucket(
      opts.scope,
      opts.identity,
      opts.max,
      opts.windowMs,
    );
    applyRateLimitHeaders(res, opts.max, decision);
    if (decision.allowed) return true;
    res.status(429).json({ error: 'Trop de requêtes. Réessayez dans un instant.' });
    return false;
  } catch (error) {
    logger.error('HTTP rate-limit bucket failed', 'RateLimit', error);
    res.status(503).json({ error: 'Service momentanément indisponible.' });
    return false;
  }
};
