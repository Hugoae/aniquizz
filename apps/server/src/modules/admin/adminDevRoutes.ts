import { z } from 'zod';
import type { Router } from 'express';
import { prisma, isBotId, BOT_PROFILES } from '@aniquizz/database';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import type { AuthedRequest } from '../../core/httpAuth';
import { resolveIdentityFromToken } from '../../core/authMiddleware';
import type { GameManager } from '../game/gameManager';
import type { BotConfig } from '../game/engine/types';
import { normalizePrecision } from '@aniquizz/shared';
import { ADMIN_ERRORS, pid, staff, wrap } from './adminHttp';

const DEFAULT_BOT_CONFIG: BotConfig = { accuracy: 0.7, minDelayMs: 2_000, maxDelayMs: 8_000 };

const botConfigSchema = z
  .object({
    accuracy: z.coerce.number().min(0).max(1).optional(),
    minDelayMs: z.coerce.number().int().min(0).max(120_000).optional(),
    maxDelayMs: z.coerce.number().int().min(0).max(120_000).optional(),
  })
  .optional();

const resolveBotConfig = (input: z.infer<typeof botConfigSchema>): BotConfig => ({
  accuracy: input?.accuracy ?? DEFAULT_BOT_CONFIG.accuracy,
  minDelayMs: input?.minDelayMs ?? DEFAULT_BOT_CONFIG.minDelayMs,
  maxDelayMs: input?.maxDelayMs ?? DEFAULT_BOT_CONFIG.maxDelayMs,
});

const isDevEnv = (): boolean => env.NODE_ENV !== 'production';

const claimAdminEnabled = (): boolean => isDevEnv() && env.ALLOW_DEV_CLAIM_ADMIN;

export function registerAdminDevRoutes(router: Router, gameManager: GameManager): void {
  router.post('/dev/rooms/:id/bots', ...staff('ADMIN'), (req: AuthedRequest, res) => {
    if (!isDevEnv()) {
      res.status(403).json({ error: ADMIN_ERRORS.devDisabled });
      return;
    }
    const parsed = z
      .object({
        count: z.coerce.number().int().min(1).max(BOT_PROFILES.length),
        config: botConfigSchema,
      })
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: ADMIN_ERRORS.invalidPayload });
      return;
    }
    const added = gameManager.addBotsToRoom(
      pid(req),
      parsed.data.count,
      resolveBotConfig(parsed.data.config),
    );
    logger.info(`Admin ${req.actor!.username} added ${added} bots to ${pid(req)}`, 'Dev');
    res.json({ added });
  });

  router.post(
    '/dev/scenario',
    ...staff('ADMIN'),
    wrap(async (req, res) => {
      if (!isDevEnv()) {
        res.status(403).json({ error: ADMIN_ERRORS.devDisabled });
        return;
      }
      const parsed = z
        .object({
          botCount: z.coerce.number().int().min(1).max(BOT_PROFILES.length),
          autoStart: z.boolean().default(true),
          join: z.boolean().default(false),
          soundCount: z.coerce.number().int().min(1).max(50).optional(),
          responseType: z.enum(['typing', 'qcm', 'mix']).optional(),
          difficulty: z.array(z.string()).optional(),
          soundTypes: z.array(z.string()).min(1).optional(),
          guessDuration: z.coerce.number().int().min(5).max(120).optional(),
          precision: z.preprocess(
            (val) => (val === undefined ? undefined : normalizePrecision(val)),
            z.enum(['anime', 'franchise', 'artist']).optional(),
          ),
          soundSelection: z.enum(['random', 'mix', 'watched', 'playlist']).optional(),
          config: botConfigSchema,
        })
        .safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: ADMIN_ERRORS.invalidPayload });
        return;
      }
      const d = parsed.data;
      const result = await gameManager.createBotScenario({
        botCount: d.botCount,
        autoStart: d.autoStart,
        host: d.join ? { userId: req.actor!.userId, username: req.actor!.username } : undefined,
        settings: {
          soundCount: d.soundCount,
          responseType: d.responseType,
          difficulty: d.difficulty,
          soundTypes: d.soundTypes,
          guessDuration: d.guessDuration,
          precision: d.precision,
          soundSelection: d.soundSelection,
        },
        config: resolveBotConfig(d.config),
      });
      logger.info(
        `Admin ${req.actor!.username} ran bot scenario (${result.botsAdded} bots, join=${d.join})`,
        'Dev',
      );
      res.json(result);
    }),
  );

  router.post('/dev/rooms/:id/remove-bots', ...staff('ADMIN'), (req: AuthedRequest, res) => {
    if (!isDevEnv()) {
      res.status(403).json({ error: ADMIN_ERRORS.devDisabled });
      return;
    }
    const parsed = z
      .object({ count: z.coerce.number().int().min(1).max(BOT_PROFILES.length).optional() })
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: ADMIN_ERRORS.invalidPayload });
      return;
    }
    const removed = gameManager.removeBotsFromRoom(pid(req), parsed.data.count);
    logger.info(`Admin ${req.actor!.username} removed ${removed} bots from ${pid(req)}`, 'Dev');
    res.json({ removed });
  });

  router.get('/dev/info', ...staff('ADMIN'), (_req, res) => {
    res.json({
      devEnabled: isDevEnv(),
      botRosterSize: BOT_PROFILES.length,
      isBotId: isBotId('bot-0001'),
    });
  });

  /**
   * DEV-only bootstrap: claim ADMIN when no admin exists yet.
   * Requires ALLOW_DEV_CLAIM_ADMIN=true and NODE_ENV !== production.
   */
  router.post(
    '/dev/claim-admin',
    wrap(async (req, res) => {
      if (!claimAdminEnabled()) {
        res.status(403).json({ error: ADMIN_ERRORS.claimDisabled });
        return;
      }
      const header = req.headers.authorization ?? '';
      const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
      const identity = token ? await resolveIdentityFromToken(token) : null;
      if (!identity) {
        res.status(401).json({ error: ADMIN_ERRORS.invalidToken });
        return;
      }

      const caller = await prisma.profile.findUnique({
        where: { id: identity.userId },
        select: { role: true },
      });
      if (!caller) {
        res.status(403).json({ error: ADMIN_ERRORS.noProfile });
        return;
      }
      if (caller.role !== 'ADMIN') {
        const existingAdmin = await prisma.profile.findFirst({
          where: { role: 'ADMIN' },
          select: { id: true },
        });
        if (existingAdmin) {
          res.status(403).json({ error: ADMIN_ERRORS.adminExists });
          return;
        }
      }
      await prisma.profile.update({ where: { id: identity.userId }, data: { role: 'ADMIN' } });
      logger.info(`Dev claim-admin granted to ${identity.username} (${identity.userId})`, 'Dev');
      res.json({ role: 'ADMIN' });
    }),
  );
}
