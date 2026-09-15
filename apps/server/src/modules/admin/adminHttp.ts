import type { NextFunction, Response } from 'express';
import { z } from 'zod';
import { logger } from '../../utils/logger';
import { requireRole, type AuthedRequest } from '../../core/httpAuth';
import { enforceHttpRateLimit, HTTP_RATE_LIMITS } from '../../core/httpRateLimit';
import type { UserRole } from '@aniquizz/shared';
import { assertModerationAllowed } from '../../config/protectedAccounts';
import { handlePrismaError } from './prismaHttpError';

export const ADMIN_ERRORS = {
  unauthorized: 'Non autorisé.',
  internal: 'Une erreur interne est survenue.',
  invalidRole: 'Rôle invalide.',
  selfRole: 'Vous ne pouvez pas modifier votre propre rôle.',
  selfModeration: 'Vous ne pouvez pas appliquer cette action à votre propre compte.',
  invalidDuration: 'Durée invalide.',
  invalidId: 'Identifiant invalide.',
  invalidPayload: 'Requête invalide.',
  userNotFound: 'Utilisateur introuvable.',
  roomNotFound: 'Salon introuvable.',
  missingUserId: 'Identifiant utilisateur manquant.',
  devDisabled: 'Outils de développement désactivés en production.',
  claimDisabled: "L'élévation admin n'est pas activée sur ce serveur.",
  invalidToken: 'Jeton invalide.',
  noProfile: 'Profil introuvable.',
  adminExists: 'Un administrateur existe déjà ; demandez-lui de vous accorder l’accès.',
  playlistRecipe: 'Recette de playlist invalide.',
  playlistPayload: 'Données de playlist invalides.',
} as const;

export const ROLES = ['USER', 'MODERATOR', 'ADMIN'] as const;
export const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const;
export const DOWNLOAD_STATUSES = [
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'ERROR',
  'SKIPPED',
] as const;
export const SONG_TYPES = ['OP', 'ED', 'INSERT'] as const;

export const durationSchema = z.object({
  minutes: z.union([z.coerce.number().int().min(1).max(52_560_000), z.null()]),
});

/** Normalize an Express route param (typed `string | string[]`) to a string. */
export const pid = (req: AuthedRequest): string => String(req.params.id);

export const numId = (req: AuthedRequest, res: Response): number | null => {
  const id = Number(pid(req));
  if (Number.isNaN(id)) {
    res.status(400).json({ error: ADMIN_ERRORS.invalidId });
    return null;
  }
  return id;
};

export const wrap =
  (fn: (req: AuthedRequest, res: Response) => Promise<void>) =>
  (req: AuthedRequest, res: Response): void => {
    fn(req, res).catch((e) => {
      if (handlePrismaError(e, res)) return;
      logger.error('Admin route failed', 'Admin', e);
      if (!res.headersSent) res.status(500).json({ error: ADMIN_ERRORS.internal });
    });
  };

export const guardProtectedTarget = async (
  req: AuthedRequest,
  res: Response,
  targetUserId: string,
  options?: { allowSelf?: boolean },
): Promise<boolean> => {
  const actorId = req.actor?.userId;
  if (!actorId) {
    res.status(401).json({ error: ADMIN_ERRORS.unauthorized });
    return false;
  }
  const check = await assertModerationAllowed(targetUserId, actorId, options);
  if (!check.ok) {
    res.status(403).json({ error: check.message });
    return false;
  }
  return true;
};

/** Mute / ban / disconnect must not target the caller. */
export const rejectSelfTarget = (req: AuthedRequest, res: Response, targetId: string): boolean => {
  if (targetId === req.actor?.userId) {
    res.status(400).json({ error: ADMIN_ERRORS.selfModeration });
    return true;
  }
  return false;
};

export const rateLimitAdminStaff = (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): void => {
  const userId = req.actor?.userId;
  if (!userId) {
    next();
    return;
  }
  void enforceHttpRateLimit(req, res, {
    scope: 'admin:staff',
    identity: userId,
    ...HTTP_RATE_LIMITS.adminStaff,
  }).then((ok) => {
    if (ok) next();
  });
};

export const staff = (minimum: UserRole) => [requireRole(minimum), rateLimitAdminStaff] as const;
