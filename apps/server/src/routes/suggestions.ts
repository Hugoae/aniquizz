import type { Application, Response } from 'express';
import { z } from 'zod';
import {
  SUGGESTION_ADMIN_REPLY_MAX,
  SUGGESTION_BODY_MAX,
  SUGGESTION_PROPOSED_VALUE_MAX,
  SUGGESTION_SONG_OPTIONS_MAX_PAGE_SIZE,
  SUGGESTION_TITLE_MAX,
} from '@aniquizz/shared';
import { optionalAuth, requireRole, type AuthedRequest } from '../core/httpAuth';
import {
  clientIp,
  enforceHttpRateLimit,
  HTTP_RATE_LIMITS,
} from '../core/httpRateLimit';
import {
  browseSuggestions,
  createSuggestion,
  deleteOwnSuggestion,
  deleteSuggestionByStaff,
  getSuggestion,
  SuggestionError,
  unvoteSuggestion,
  updateSuggestionByStaff,
  voteSuggestion,
} from '../modules/feedback/suggestionService';
import { searchSuggestionSongOptions } from '../modules/feedback/suggestionSongOptions';
import { logger } from '../utils/logger';

const categories = ['IMPROVEMENT', 'SONG_REQUEST', 'CORRECTION', 'OTHER'] as const;
const statuses = ['OPEN', 'PLANNED', 'DONE', 'REJECTED'] as const;
const correctionFields = ['TITLE', 'ARTIST', 'DIFFICULTY', 'OTHER'] as const;

const browseSchema = z.object({
  q: z.string().trim().max(100).optional(),
  sort: z.enum(['top', 'recent']).optional(),
  category: z.enum(categories).optional(),
  status: z.enum(statuses).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional(),
});

const songOptionsSchema = z.object({
  q: z.string().trim().min(2).max(120),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().min(1).max(SUGGESTION_SONG_OPTIONS_MAX_PAGE_SIZE).optional(),
});

const createSchema = z
  .object({
    category: z.enum(categories),
    title: z.string().trim().min(4).max(SUGGESTION_TITLE_MAX),
    body: z.string().trim().min(10).max(SUGGESTION_BODY_MAX),
    songId: z.number().int().positive().optional(),
    correctionField: z.enum(correctionFields).optional(),
    proposedValue: z.string().trim().min(1).max(SUGGESTION_PROPOSED_VALUE_MAX).optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.category === 'CORRECTION' &&
      (!value.songId || !value.correctionField || !value.proposedValue)
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Une correction doit préciser le son, le champ et la valeur.',
      });
    }
    if (
      value.category === 'CORRECTION' &&
      value.correctionField === 'DIFFICULTY' &&
      value.proposedValue &&
      !['EASY', 'MEDIUM', 'HARD'].includes(value.proposedValue)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['proposedValue'],
        message: 'La difficulté proposée est invalide.',
      });
    }
  });

const adminUpdateSchema = z
  .object({
    status: z.enum(statuses).optional(),
    adminReply: z.string().trim().max(SUGGESTION_ADMIN_REPLY_MAX).nullable().optional(),
  })
  .refine((value) => value.status !== undefined || value.adminReply !== undefined);

const handleSuggestionError = (res: Response, error: unknown): boolean => {
  if (!(error instanceof SuggestionError)) return false;
  const status =
    error.code === 'NOT_FOUND'
      ? 404
      : error.code === 'FORBIDDEN'
        ? 403
        : error.code === 'LIMIT'
          ? 429
          : error.code === 'CLOSED'
            ? 409
            : 400;
  res.status(status).json({ error: error.message });
  return true;
};

const wrap =
  (fn: (req: AuthedRequest, res: Response) => Promise<void>) =>
  (req: AuthedRequest, res: Response): void => {
    fn(req, res).catch((error) => {
      if (handleSuggestionError(res, error)) return;
      logger.error('Suggestion route failed', 'Suggestions', error);
      if (!res.headersSent) res.status(500).json({ error: 'Impossible de traiter la suggestion.' });
    });
  };

const suggestionId = (req: AuthedRequest): string => String(req.params.id);

const limitPublicRead = (req: AuthedRequest, res: Response): Promise<boolean> =>
  enforceHttpRateLimit(req, res, {
    scope: 'suggestions:read',
    identity: clientIp(req),
    ...HTTP_RATE_LIMITS.publicRead,
  });

const limitUserMutation = (req: AuthedRequest, res: Response, userId: string): Promise<boolean> =>
  enforceHttpRateLimit(req, res, {
    scope: 'suggestions:mutate',
    identity: userId,
    ...HTTP_RATE_LIMITS.userMutation,
  });

export function registerSuggestionRoutes(app: Application): void {
  app.get(
    '/suggestions',
    optionalAuth,
    wrap(async (req, res) => {
      if (!(await limitPublicRead(req, res))) return;
      const parsed = browseSchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({ error: 'Filtres de suggestions invalides.' });
        return;
      }
      res.json(await browseSuggestions(parsed.data, req.actor?.userId));
    }),
  );

  app.get(
    '/suggestions/song-options',
    requireRole('USER'),
    wrap(async (req, res) => {
      if (!req.actor) return;
      if (!(await limitUserMutation(req, res, req.actor.userId))) return;
      const parsed = songOptionsSchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({ error: 'Recherche de son invalide.' });
        return;
      }
      res.json(await searchSuggestionSongOptions(parsed.data));
    }),
  );

  app.get(
    '/suggestions/:id',
    optionalAuth,
    wrap(async (req, res) => {
      if (!(await limitPublicRead(req, res))) return;
      res.json(await getSuggestion(suggestionId(req), req.actor?.userId));
    }),
  );

  app.post(
    '/suggestions',
    requireRole('USER'),
    wrap(async (req, res) => {
      if (!req.actor) return;
      if (!(await limitUserMutation(req, res, req.actor.userId))) return;
      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Suggestion invalide.' });
        return;
      }
      res.status(201).json(await createSuggestion(req.actor.userId, parsed.data));
    }),
  );

  app.put(
    '/suggestions/:id/vote',
    requireRole('USER'),
    wrap(async (req, res) => {
      if (!req.actor) return;
      if (!(await limitUserMutation(req, res, req.actor.userId))) return;
      res.json(await voteSuggestion(req.actor.userId, suggestionId(req)));
    }),
  );

  app.delete(
    '/suggestions/:id/vote',
    requireRole('USER'),
    wrap(async (req, res) => {
      if (!req.actor) return;
      if (!(await limitUserMutation(req, res, req.actor.userId))) return;
      res.json(await unvoteSuggestion(req.actor.userId, suggestionId(req)));
    }),
  );

  app.delete(
    '/suggestions/:id',
    requireRole('USER'),
    wrap(async (req, res) => {
      if (!req.actor) return;
      if (!(await limitUserMutation(req, res, req.actor.userId))) return;
      await deleteOwnSuggestion(req.actor.userId, suggestionId(req));
      res.status(204).end();
    }),
  );

  app.patch(
    '/admin/suggestions/:id',
    requireRole('MODERATOR'),
    wrap(async (req, res) => {
      const parsed = adminUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Mise à jour invalide.' });
        return;
      }
      res.json(await updateSuggestionByStaff(suggestionId(req), parsed.data));
    }),
  );

  app.delete(
    '/admin/suggestions/:id',
    requireRole('ADMIN'),
    wrap(async (req, res) => {
      await deleteSuggestionByStaff(suggestionId(req));
      res.status(204).end();
    }),
  );
}
