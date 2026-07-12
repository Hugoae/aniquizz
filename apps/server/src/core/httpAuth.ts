import type { NextFunction, Request, Response } from 'express';
import { prisma } from '@aniquizz/database';
import { hasRole, type UserRole } from '@aniquizz/shared';
import { logger } from '../utils/logger';
import { resolveIdentityFromToken } from './authMiddleware';

/** Identity resolved for an authenticated HTTP request. */
export interface RequestActor {
  userId: string;
  username: string;
  role: UserRole;
}

export interface AuthedRequest extends Request {
  actor?: RequestActor;
}

const extractBearer = (req: Request): string | null => {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim();
};

/**
 * Optional auth: attaches `req.actor` when a valid token is present; never rejects.
 * Used for public routes that enrich the payload for signed-in users (e.g. library).
 */
export const optionalAuth = async (
  req: AuthedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  const token = extractBearer(req);
  if (!token) {
    next();
    return;
  }

  const identity = await resolveIdentityFromToken(token);
  if (!identity) {
    next();
    return;
  }

  try {
    const row = await prisma.profile.findUnique({
      where: { id: identity.userId },
      select: { role: true, bannedUntil: true },
    });
    if (!row) {
      next();
      return;
    }
    if (row.bannedUntil && row.bannedUntil.getTime() > Date.now()) {
      next();
      return;
    }
    req.actor = {
      userId: identity.userId,
      username: identity.username,
      role: row.role as UserRole,
    };
  } catch (e) {
    logger.warn('Optional auth: profile lookup failed', 'Auth', e);
  }
  next();
};

export { extractBearer };

/**
 * Express middleware factory: authenticates the request via the Supabase access
 * token and enforces a minimum role — read from the database, never from the
 * client. Attaches `req.actor` on success.
 */
export const requireRole = (minimum: UserRole) => {
  return async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
    const token = extractBearer(req);
    if (!token) {
      res.status(401).json({ error: 'Missing bearer token.' });
      return;
    }

    const identity = await resolveIdentityFromToken(token);
    if (!identity) {
      res.status(401).json({ error: 'Invalid token.' });
      return;
    }

    let profile: { role: UserRole; bannedUntil: Date | null } | null = null;
    try {
      const row = await prisma.profile.findUnique({
        where: { id: identity.userId },
        select: { role: true, bannedUntil: true },
      });
      if (row) profile = { role: row.role as UserRole, bannedUntil: row.bannedUntil };
    } catch (e) {
      logger.error('Admin auth: failed to load profile', 'Admin', e);
      res.status(500).json({ error: 'Auth lookup failed.' });
      return;
    }

    if (!profile) {
      res.status(403).json({ error: 'No profile.' });
      return;
    }

    if (profile.bannedUntil && profile.bannedUntil.getTime() > Date.now()) {
      res.status(403).json({ error: 'Account banned.' });
      return;
    }

    if (!hasRole(profile.role, minimum)) {
      res.status(403).json({ error: 'Insufficient privileges.' });
      return;
    }

    req.actor = { userId: identity.userId, username: identity.username, role: profile.role };
    next();
  };
};
