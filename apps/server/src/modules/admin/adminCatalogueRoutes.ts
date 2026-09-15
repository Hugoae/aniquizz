import { z } from 'zod';
import type { Difficulty, DownloadStatus } from '@aniquizz/database';
import type { Router } from 'express';
import { logger } from '../../utils/logger';
import { handlePrismaError } from './prismaHttpError';
import * as adminService from './adminService';
import {
  ADMIN_ERRORS,
  DIFFICULTIES,
  DOWNLOAD_STATUSES,
  numId,
  SONG_TYPES,
  staff,
  wrap,
} from './adminHttp';

export function registerAdminCatalogueRoutes(router: Router): void {
  router.get(
    '/catalogue/songs',
    ...staff('MODERATOR'),
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

  router.get(
    '/catalogue/repair',
    ...staff('MODERATOR'),
    wrap(async (_req, res) => {
      res.json(await adminService.listCatalogueRepair());
    }),
  );

  router.get(
    '/catalogue/tree',
    ...staff('MODERATOR'),
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
      const songIdRaw = req.query.songId ? Number(req.query.songId) : undefined;
      const songId = songIdRaw && Number.isFinite(songIdRaw) ? songIdRaw : undefined;
      res.json(
        await adminService.catalogueTree({
          query,
          status,
          difficulty,
          locked,
          page,
          pageSize,
          songId,
        }),
      );
    }),
  );

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
    ...staff('ADMIN'),
    wrap(async (req, res) => {
      const id = numId(req, res);
      if (id === null) return;
      const parsed = songWriteSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: ADMIN_ERRORS.invalidPayload });
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
    ...staff('ADMIN'),
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
        res.status(400).json({ error: ADMIN_ERRORS.invalidPayload });
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
    ...staff('ADMIN'),
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
    ...staff('ADMIN'),
    wrap(async (req, res) => {
      const parsed = z
        .object({
          ids: z.array(z.coerce.number().int()).min(1).max(200),
          data: z.object({
            difficulty: z.enum(DIFFICULTIES).optional(),
            downloadStatus: z.enum(DOWNLOAD_STATUSES).optional(),
            isLocked: z.boolean().optional(),
          }),
        })
        .safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: ADMIN_ERRORS.invalidPayload });
        return;
      }
      const result = await adminService.bulkUpdateSongs(parsed.data.ids, parsed.data.data);
      logger.info(`Admin ${req.actor!.username} bulk-updated ${result.count} songs`, 'Catalogue');
      res.json({ count: result.count });
    }),
  );

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
    ...staff('ADMIN'),
    wrap(async (req, res) => {
      const id = numId(req, res);
      if (id === null) return;
      const parsed = animeWriteSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: ADMIN_ERRORS.invalidPayload });
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
    ...staff('ADMIN'),
    wrap(async (req, res) => {
      const parsed = animeWriteSchema.extend({ name: z.string().min(1) }).safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: ADMIN_ERRORS.invalidPayload });
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
    ...staff('ADMIN'),
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

  const franchiseWriteSchema = z.object({
    name: z.string().min(1).optional(),
    genres: z.array(z.string()).optional(),
    isLocked: z.boolean().optional(),
  });

  router.patch(
    '/catalogue/franchises/:id',
    ...staff('ADMIN'),
    wrap(async (req, res) => {
      const id = numId(req, res);
      if (id === null) return;
      const parsed = franchiseWriteSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: ADMIN_ERRORS.invalidPayload });
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
    ...staff('ADMIN'),
    wrap(async (req, res) => {
      const parsed = franchiseWriteSchema.extend({ name: z.string().min(1) }).safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: ADMIN_ERRORS.invalidPayload });
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
    ...staff('ADMIN'),
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
}
