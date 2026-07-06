import { Router, type Application, type Response } from 'express';
// Express param values are typed `string | string[]`; normalize to a plain id.

import { z } from 'zod';
import { prisma, isBotId, Prisma } from '@aniquizz/database';
import type { Difficulty, DownloadStatus, UserRole } from '@aniquizz/database';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { requireRole, type AuthedRequest } from '../../core/httpAuth';
import { resolveIdentityFromToken } from '../../core/authMiddleware';
import type { TypedServer, TypedSocket } from '../../core/socketTypes';
import { collectHealthStats } from '../../routes/health';
import type { GameManager } from '../game/gameManager';
import type { BotConfig } from '../game/engine/types';
import * as adminService from './adminService';

const ROLES = ['USER', 'MODERATOR', 'ADMIN'] as const;
const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const;
const DOWNLOAD_STATUSES = ['PENDING', 'PROCESSING', 'COMPLETED', 'ERROR', 'SKIPPED'] as const;
const SONG_TYPES = ['OP', 'ED', 'INSERT'] as const;

/** Map common Prisma write errors to friendly HTTP responses. Returns handled. */
const handlePrismaError = (e: unknown, res: Response): boolean => {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === 'P2002') {
      res.status(409).json({ error: 'Valeur déjà utilisée (videoKey ou nom unique).' });
      return true;
    }
    if (e.code === 'P2025') {
      res.status(404).json({ error: 'Élément introuvable.' });
      return true;
    }
    if (e.code === 'P2003') {
      res.status(400).json({ error: 'Référence invalide (animeId / franchiseId).' });
      return true;
    }
  }
  return false;
};

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

/** Normalize an Express route param (typed `string | string[]`) to a string. */
const pid = (req: AuthedRequest): string => String(req.params.id);

/** Small helper: run an async handler and forward failures as a 500. */
const wrap =
  (fn: (req: AuthedRequest, res: Response) => Promise<void>) =>
  (req: AuthedRequest, res: Response): void => {
    fn(req, res).catch((e) => {
      logger.error('Admin route failed', 'Admin', e);
      if (!res.headersSent) res.status(500).json({ error: 'Internal error.' });
    });
  };

export function registerAdminRoutes(
  app: Application,
  io: TypedServer,
  gameManager: GameManager,
): void {
  const router = Router();

  /** Push a sanction to the target's live sockets so it applies immediately. */
  const forEachUserSocket = (userId: string, fn: (s: TypedSocket) => void) => {
    for (const s of io.sockets.sockets.values()) {
      if (s.data.userId === userId) fn(s as unknown as TypedSocket);
    }
  };

  // Identity/role probe used by the client to gate the /admin UI.
  router.get(
    '/me',
    requireRole('MODERATOR'),
    (req: AuthedRequest, res: Response) => {
      res.json({ userId: req.actor!.userId, username: req.actor!.username, role: req.actor!.role });
    },
  );

  // --- USERS ----------------------------------------------------------------

  router.get(
    '/users',
    requireRole('MODERATOR'),
    wrap(async (req, res) => {
      const query = typeof req.query.query === 'string' ? req.query.query : undefined;
      const page = req.query.page ? Number(req.query.page) : 1;
      const filter = typeof req.query.filter === 'string' ? req.query.filter : 'all';
      const sort = typeof req.query.sort === 'string' ? req.query.sort : 'username';
      const sortDir = req.query.sortDir === 'desc' ? 'desc' : 'asc';

      const connected = new Set<string>();
      for (const s of io.sockets.sockets.values()) {
        if (typeof s.data.userId === 'string') connected.add(s.data.userId);
      }
      const inGame = gameManager.getInGameUserIds();
      const roomMap = gameManager.getUserRoomMap();

      const onlineIds = [...connected].filter((id) => !inGame.has(id));
      const inGameIds = [...inGame];

      const allowedFilters = new Set([
        'all', 'players', 'bots', 'moderators', 'admins', 'muted', 'banned', 'online', 'in_game',
      ]);
      const allowedSorts = new Set(['username', 'xp', 'games', 'created', 'seen']);

      const result = await adminService.listUsers({
        query,
        page: Number.isFinite(page) ? page : 1,
        filter: allowedFilters.has(filter) ? (filter as adminService.UserListFilter) : 'all',
        sort: allowedSorts.has(sort) ? (sort as adminService.UserListSort) : 'username',
        sortDir,
        onlineIds,
        inGameIds,
      });

      const withPresence = result.users.map((u) => ({
        ...u,
        presence: inGame.has(u.id) ? 'in_game' : connected.has(u.id) ? 'online' : 'offline',
        currentRoom: roomMap.get(u.id) ?? null,
      }));

      let onlineCount = 0;
      for (const id of connected) {
        if (!inGame.has(id)) onlineCount += 1;
      }

      res.json({
        users: withPresence,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
        counts: {
          online: onlineCount,
          inGame: inGame.size,
          banned: await adminService.getBannedUserCount(),
        },
      });
    }),
  );

  router.get(
    '/users/:id/profile',
    requireRole('MODERATOR'),
    wrap(async (req, res) => {
      const profile = await adminService.getUserProfile(pid(req));
      if (!profile) {
        res.status(404).json({ error: 'Utilisateur introuvable.' });
        return;
      }
      res.json(profile);
    }),
  );

  router.patch(
    '/users/:id/role',
    requireRole('ADMIN'),
    wrap(async (req, res) => {
      const parsed = z.object({ role: z.enum(ROLES) }).safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid role.' });
        return;
      }
      if (pid(req) === req.actor!.userId) {
        res.status(400).json({ error: 'You cannot change your own role.' });
        return;
      }
      const result = await adminService.setUserRole(pid(req), parsed.data.role as UserRole);
      logger.info(`Admin ${req.actor!.username} set role ${parsed.data.role} on ${pid(req)}`, 'Admin');
      res.json(result);
    }),
  );

  const durationSchema = z.object({
    // minutes until expiry; null = lift the sanction.
    // Upper bound ~100 years so the UI can offer a "permanent" option.
    minutes: z.union([z.coerce.number().int().min(1).max(52_560_000), z.null()]),
  });

  router.post(
    '/users/:id/ban',
    requireRole('MODERATOR'),
    wrap(async (req, res) => {
      const parsed = durationSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid duration.' });
        return;
      }
      const result = await adminService.setUserBan(pid(req), parsed.data.minutes);
      // A live ban takes effect now: drop the target's sockets (the handshake
      // rejects any reconnection while the ban is active).
      if (parsed.data.minutes !== null) {
        forEachUserSocket(pid(req), (s) => {
          s.emit('error', { message: 'Vous avez été banni par la modération.' });
          s.disconnect(true);
        });
      }
      logger.info(`Admin ${req.actor!.username} ban(${parsed.data.minutes}) on ${pid(req)}`, 'Admin');
      res.json(result);
    }),
  );

  router.post(
    '/users/:id/mute',
    requireRole('MODERATOR'),
    wrap(async (req, res) => {
      const parsed = durationSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid duration.' });
        return;
      }
      const result = await adminService.setUserMute(pid(req), parsed.data.minutes);
      // Reflect the new mute state on live sockets so chat is blocked/unblocked
      // without waiting for a reconnect.
      const mutedUntilIso = result.mutedUntil ? result.mutedUntil.toISOString() : null;
      forEachUserSocket(pid(req), (s) => {
        s.data.mutedUntil = mutedUntilIso;
      });
      logger.info(`Admin ${req.actor!.username} mute(${parsed.data.minutes}) on ${pid(req)}`, 'Admin');
      res.json(result);
    }),
  );

  router.post(
    '/users/:id/reset-stats',
    requireRole('ADMIN'),
    wrap(async (req, res) => {
      const result = await adminService.resetUserStats(pid(req));
      logger.info(`Admin ${req.actor!.username} reset stats on ${pid(req)}`, 'Admin');
      res.json(result);
    }),
  );

  // Force the target to sign out (kick without any lasting sanction). The client
  // clears its Supabase session on `force_logout`, which also drops the socket.
  router.post(
    '/users/:id/disconnect',
    requireRole('MODERATOR'),
    (req: AuthedRequest, res: Response) => {
      let count = 0;
      forEachUserSocket(pid(req), (s) => {
        s.emit('force_logout', { reason: 'Vous avez été déconnecté par la modération.' });
        count += 1;
      });
      logger.info(`Admin ${req.actor!.username} forced logout of ${pid(req)} (${count} socket(s))`, 'Admin');
      res.json({ disconnected: count });
    },
  );

  // --- LIVE ROOMS / MATCHES -------------------------------------------------

  router.get('/rooms', requireRole('MODERATOR'), (_req, res) => {
    res.json({ rooms: gameManager.getRoomDetails() });
  });

  router.post('/rooms/:id/end', requireRole('MODERATOR'), (req: AuthedRequest, res) => {
    const ok = gameManager.forceEndMatch(pid(req));
    if (!ok) {
      res.status(404).json({ error: 'Room not found.' });
      return;
    }
    logger.info(`Admin ${req.actor!.username} force-ended match ${pid(req)}`, 'Admin');
    res.json({ ok: true });
  });

  router.post('/rooms/:id/close', requireRole('MODERATOR'), (req: AuthedRequest, res) => {
    const ok = gameManager.closeRoom(pid(req));
    if (!ok) {
      res.status(404).json({ error: 'Room not found.' });
      return;
    }
    logger.info(`Admin ${req.actor!.username} closed room ${pid(req)}`, 'Admin');
    res.json({ ok: true });
  });

  router.post('/rooms/:id/kick', requireRole('MODERATOR'), (req: AuthedRequest, res) => {
    const parsed = z.object({ userId: z.string().min(1) }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Missing userId.' });
      return;
    }
    const ok = gameManager.kickPlayer(pid(req), parsed.data.userId);
    if (!ok) {
      res.status(404).json({ error: 'Room not found.' });
      return;
    }
    logger.info(`Admin ${req.actor!.username} kicked ${parsed.data.userId} from ${pid(req)}`, 'Admin');
    res.json({ ok: true });
  });

  // --- CATALOGUE ------------------------------------------------------------

  const numId = (req: AuthedRequest, res: Response): number | null => {
    const id = Number(pid(req));
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid id.' });
      return null;
    }
    return id;
  };

  // Legacy flat list (kept for backward compatibility / quick lookups).
  router.get(
    '/catalogue/songs',
    requireRole('MODERATOR'),
    wrap(async (req, res) => {
      const query = typeof req.query.query === 'string' ? req.query.query : undefined;
      const statusRaw = typeof req.query.status === 'string' ? req.query.status : undefined;
      const status =
        statusRaw && (DOWNLOAD_STATUSES as readonly string[]).includes(statusRaw)
          ? (statusRaw as DownloadStatus)
          : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      res.json({ songs: await adminService.listSongs({ query, status, limit }) });
    }),
  );

  // Hierarchical tree: Franchise -> Anime -> Song, paginated by franchise.
  router.get(
    '/catalogue/tree',
    requireRole('MODERATOR'),
    wrap(async (req, res) => {
      const query = typeof req.query.query === 'string' ? req.query.query : undefined;
      const statusRaw = typeof req.query.status === 'string' ? req.query.status : undefined;
      const status = (DOWNLOAD_STATUSES as readonly string[]).includes(statusRaw ?? '')
        ? (statusRaw as DownloadStatus)
        : undefined;
      const diffRaw = typeof req.query.difficulty === 'string' ? req.query.difficulty : undefined;
      const difficulty = (DIFFICULTIES as readonly string[]).includes(diffRaw ?? '')
        ? (diffRaw as Difficulty)
        : undefined;
      const lockedRaw = typeof req.query.locked === 'string' ? req.query.locked : undefined;
      const locked = lockedRaw === 'true' ? true : lockedRaw === 'false' ? false : undefined;
      const page = req.query.page ? Number(req.query.page) : undefined;
      const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;
      res.json(
        await adminService.catalogueTree({ query, status, difficulty, locked, page, pageSize }),
      );
    }),
  );

  // --- Song mutations ---
  const songWriteSchema = z.object({
    title: z.string().min(1).optional(),
    artist: z.string().optional(),
    songType: z.enum(SONG_TYPES).optional(),
    sequence: z.coerce.number().int().min(1).optional(),
    videoKey: z.string().min(1).optional(),
    sourceUrl: z.string().nullable().optional(),
    duration: z.coerce.number().int().min(0).nullable().optional(),
    difficulty: z.enum(DIFFICULTIES).optional(),
    downloadStatus: z.enum(DOWNLOAD_STATUSES).optional(),
    isLocked: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    episodeRange: z.string().nullable().optional(),
    animeId: z.coerce.number().int().optional(),
  });

  router.patch(
    '/catalogue/songs/:id',
    requireRole('MODERATOR'),
    wrap(async (req, res) => {
      const id = numId(req, res);
      if (id === null) return;
      const parsed = songWriteSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid payload.' });
        return;
      }
      try {
        res.json(await adminService.updateSong(id, parsed.data));
      } catch (e) {
        if (!handlePrismaError(e, res)) throw e;
      }
    }),
  );

  router.post(
    '/catalogue/songs',
    requireRole('ADMIN'),
    wrap(async (req, res) => {
      const parsed = songWriteSchema
        .extend({
          title: z.string().min(1),
          artist: z.string(),
          songType: z.enum(SONG_TYPES),
          videoKey: z.string().min(1),
          animeId: z.coerce.number().int(),
        })
        .safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid payload.' });
        return;
      }
      try {
        const song = await adminService.createSong(parsed.data);
        logger.info(`Admin ${req.actor!.username} created song ${song.id}`, 'Catalogue');
        res.status(201).json(song);
      } catch (e) {
        if (!handlePrismaError(e, res)) throw e;
      }
    }),
  );

  router.delete(
    '/catalogue/songs/:id',
    requireRole('ADMIN'),
    wrap(async (req, res) => {
      const id = numId(req, res);
      if (id === null) return;
      try {
        await adminService.deleteSong(id);
        logger.info(`Admin ${req.actor!.username} deleted song ${id}`, 'Catalogue');
        res.json({ ok: true });
      } catch (e) {
        if (!handlePrismaError(e, res)) throw e;
      }
    }),
  );

  router.post(
    '/catalogue/songs/bulk',
    requireRole('MODERATOR'),
    wrap(async (req, res) => {
      const parsed = z
        .object({
          ids: z.array(z.coerce.number().int()).min(1),
          data: z.object({
            difficulty: z.enum(DIFFICULTIES).optional(),
            downloadStatus: z.enum(DOWNLOAD_STATUSES).optional(),
            isLocked: z.boolean().optional(),
          }),
        })
        .safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid payload.' });
        return;
      }
      const result = await adminService.bulkUpdateSongs(parsed.data.ids, parsed.data.data);
      logger.info(
        `Admin ${req.actor!.username} bulk-updated ${result.count} songs`,
        'Catalogue',
      );
      res.json({ count: result.count });
    }),
  );

  // --- Anime mutations ---
  const animeWriteSchema = z.object({
    name: z.string().min(1).optional(),
    altNames: z.array(z.string()).optional(),
    siteUrl: z.string().nullable().optional(),
    studio: z.string().nullable().optional(),
    coverImage: z.string().nullable().optional(),
    popularity: z.coerce.number().int().min(0).optional(),
    tags: z.array(z.string()).optional(),
    format: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    seasonYear: z.coerce.number().int().nullable().optional(),
    franchiseId: z.coerce.number().int().nullable().optional(),
    isLocked: z.boolean().optional(),
  });

  router.patch(
    '/catalogue/animes/:id',
    requireRole('MODERATOR'),
    wrap(async (req, res) => {
      const id = numId(req, res);
      if (id === null) return;
      const parsed = animeWriteSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid payload.' });
        return;
      }
      try {
        res.json(await adminService.updateAnime(id, parsed.data));
      } catch (e) {
        if (!handlePrismaError(e, res)) throw e;
      }
    }),
  );

  router.post(
    '/catalogue/animes',
    requireRole('ADMIN'),
    wrap(async (req, res) => {
      const parsed = animeWriteSchema.extend({ name: z.string().min(1) }).safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid payload.' });
        return;
      }
      try {
        const anime = await adminService.createAnime(parsed.data);
        logger.info(`Admin ${req.actor!.username} created anime ${anime.id}`, 'Catalogue');
        res.status(201).json(anime);
      } catch (e) {
        if (!handlePrismaError(e, res)) throw e;
      }
    }),
  );

  router.delete(
    '/catalogue/animes/:id',
    requireRole('ADMIN'),
    wrap(async (req, res) => {
      const id = numId(req, res);
      if (id === null) return;
      try {
        await adminService.deleteAnime(id);
        logger.info(`Admin ${req.actor!.username} deleted anime ${id}`, 'Catalogue');
        res.json({ ok: true });
      } catch (e) {
        if (!handlePrismaError(e, res)) throw e;
      }
    }),
  );

  // --- Franchise mutations ---
  const franchiseWriteSchema = z.object({
    name: z.string().min(1).optional(),
    genres: z.array(z.string()).optional(),
    isLocked: z.boolean().optional(),
  });

  router.patch(
    '/catalogue/franchises/:id',
    requireRole('MODERATOR'),
    wrap(async (req, res) => {
      const id = numId(req, res);
      if (id === null) return;
      const parsed = franchiseWriteSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid payload.' });
        return;
      }
      try {
        res.json(await adminService.updateFranchise(id, parsed.data));
      } catch (e) {
        if (!handlePrismaError(e, res)) throw e;
      }
    }),
  );

  router.post(
    '/catalogue/franchises',
    requireRole('ADMIN'),
    wrap(async (req, res) => {
      const parsed = franchiseWriteSchema.extend({ name: z.string().min(1) }).safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid payload.' });
        return;
      }
      try {
        const franchise = await adminService.createFranchise(parsed.data);
        logger.info(`Admin ${req.actor!.username} created franchise ${franchise.id}`, 'Catalogue');
        res.status(201).json(franchise);
      } catch (e) {
        if (!handlePrismaError(e, res)) throw e;
      }
    }),
  );

  router.delete(
    '/catalogue/franchises/:id',
    requireRole('ADMIN'),
    wrap(async (req, res) => {
      const id = numId(req, res);
      if (id === null) return;
      try {
        await adminService.deleteFranchise(id);
        logger.info(`Admin ${req.actor!.username} deleted franchise ${id}`, 'Catalogue');
        res.json({ ok: true });
      } catch (e) {
        if (!handlePrismaError(e, res)) throw e;
      }
    }),
  );

  // --- STATS ----------------------------------------------------------------

  router.get('/stats', requireRole('MODERATOR'), (_req, res) => {
    res.json(collectHealthStats(io, gameManager));
  });

  const parsePeriodDays = (raw: unknown): number | null => {
    switch (String(raw)) {
      case '24h':
        return 1;
      case '30d':
        return 30;
      case 'all':
        return null;
      case '7d':
      default:
        return 7;
    }
  };

  router.get(
    '/stats/overview',
    requireRole('MODERATOR'),
    wrap(async (req, res) => {
      const periodDays = parsePeriodDays(req.query.period);
      const base = collectHealthStats(io, gameManager);
      const roomStats = gameManager.getLiveRoomStats();

      const onlineUsers = new Set<string>();
      for (const s of io.sockets.sockets.values()) {
        const uid = s.data.userId;
        if (uid) onlineUsers.add(uid);
      }

      const overview = await adminService.getStatsOverview(periodDays);

      res.json({
        live: {
          uptimeSeconds: base.uptimeSeconds,
          connectedSockets: base.connectedSockets,
          uniqueOnline: onlineUsers.size,
          activeRooms: base.activeRooms,
          activeMatches: base.activeMatches,
          playersInRooms: base.playersInRooms,
          humansInRooms: roomStats.humansInRooms,
          botsInRooms: roomStats.botsInRooms,
          roomsPublic: roomStats.roomsPublic,
          roomsPrivate: roomStats.roomsPrivate,
          roomsWaiting: roomStats.roomsWaiting,
          roomsPlaying: roomStats.roomsPlaying,
          roomsPaused: roomStats.roomsPaused,
          memoryRssMb: Math.round(process.memoryUsage().rss / 1_048_576),
          nodeVersion: process.version,
        },
        community: overview.community,
        activity: overview.activity,
      });
    }),
  );

  // Destructive: wipes all match history + song discovery (admin-only).
  router.post(
    '/stats/reset-activity',
    requireRole('ADMIN'),
    wrap(async (req, res) => {
      const result = await adminService.resetActivityStats();
      logger.warn(
        `Admin ${req.actor!.username} reset game-activity stats (${result.matches} matches, ${result.songHistory} history rows).`,
        'Admin',
      );
      res.json(result);
    }),
  );

  // --- DEV TOOLING (bots / scenarios) — DEV ONLY ----------------------------

  router.post('/dev/rooms/:id/bots', requireRole('MODERATOR'), (req: AuthedRequest, res) => {
    if (!isDevEnv()) {
      res.status(403).json({ error: 'Dev tooling disabled in production.' });
      return;
    }
    const parsed = z
      .object({ count: z.coerce.number().int().min(1).max(8), config: botConfigSchema })
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid payload.' });
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
    requireRole('MODERATOR'),
    wrap(async (req, res) => {
      if (!isDevEnv()) {
        res.status(403).json({ error: 'Dev tooling disabled in production.' });
        return;
      }
      const parsed = z
        .object({
          botCount: z.coerce.number().int().min(1).max(8),
          autoStart: z.boolean().default(true),
          // When true, the room is hosted by the caller so they can join & watch.
          join: z.boolean().default(false),
          soundCount: z.coerce.number().int().min(1).max(50).optional(),
          responseType: z.enum(['typing', 'qcm', 'mix']).optional(),
          difficulty: z.array(z.string()).optional(),
          soundTypes: z.array(z.string()).min(1).optional(),
          guessDuration: z.coerce.number().int().min(5).max(120).optional(),
          precision: z.enum(['exact', 'franchise']).optional(),
          soundSelection: z.enum(['random', 'mix', 'watched', 'playlist']).optional(),
          config: botConfigSchema,
        })
        .safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid payload.' });
        return;
      }
      const d = parsed.data;
      const result = await gameManager.createBotScenario({
        botCount: d.botCount,
        autoStart: d.autoStart,
        host: d.join
          ? { userId: req.actor!.userId, username: req.actor!.username }
          : undefined,
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

  router.post('/dev/rooms/:id/remove-bots', requireRole('MODERATOR'), (req: AuthedRequest, res) => {
    if (!isDevEnv()) {
      res.status(403).json({ error: 'Dev tooling disabled in production.' });
      return;
    }
    const parsed = z
      .object({ count: z.coerce.number().int().min(1).max(8).optional() })
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid payload.' });
      return;
    }
    const removed = gameManager.removeBotsFromRoom(pid(req), parsed.data.count);
    logger.info(`Admin ${req.actor!.username} removed ${removed} bots from ${pid(req)}`, 'Dev');
    res.json({ removed });
  });

  router.get('/dev/info', requireRole('MODERATOR'), (_req, res) => {
    res.json({ devEnabled: isDevEnv(), botRosterSize: 8, isBotId: isBotId('bot-0001') });
  });

  /**
   * DEV-only bootstrap: let the authenticated caller claim the ADMIN role when no
   * admin exists yet (or if they already are one). Safe self-service first-admin
   * so the panel becomes reachable without manual DB edits.
   */
  router.post(
    '/dev/claim-admin',
    wrap(async (req, res) => {
      if (!isDevEnv()) {
        res.status(403).json({ error: 'Disabled in production.' });
        return;
      }
      const header = req.headers.authorization ?? '';
      const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
      const identity = token ? await resolveIdentityFromToken(token) : null;
      if (!identity) {
        res.status(401).json({ error: 'Invalid token.' });
        return;
      }

      const caller = await prisma.profile.findUnique({
        where: { id: identity.userId },
        select: { role: true },
      });
      if (!caller) {
        res.status(403).json({ error: 'No profile.' });
        return;
      }
      if (caller.role !== 'ADMIN') {
        const existingAdmin = await prisma.profile.findFirst({
          where: { role: 'ADMIN' },
          select: { id: true },
        });
        if (existingAdmin) {
          res.status(403).json({ error: 'An admin already exists; ask them to grant you access.' });
          return;
        }
      }
      await prisma.profile.update({ where: { id: identity.userId }, data: { role: 'ADMIN' } });
      logger.info(`Dev claim-admin granted to ${identity.username} (${identity.userId})`, 'Dev');
      res.json({ role: 'ADMIN' });
    }),
  );

  app.use('/admin', router);
  logger.info('Admin routes registered at /admin', 'Admin');
}
