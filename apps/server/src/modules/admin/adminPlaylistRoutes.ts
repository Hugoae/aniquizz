import type { Router } from 'express';
import { logger } from '../../utils/logger';
import * as playlistAdmin from './thematicPlaylistAdmin';
import { ADMIN_ERRORS, pid, staff, wrap } from './adminHttp';

export function registerAdminPlaylistRoutes(router: Router): void {
  router.get(
    '/playlists',
    ...staff('ADMIN'),
    wrap(async (_req, res) => {
      const playlists = await playlistAdmin.listAdminPlaylists();
      res.json({ playlists });
    }),
  );

  router.post(
    '/playlists/preview',
    ...staff('ADMIN'),
    wrap(async (req, res) => {
      const parsed = playlistAdmin.playlistRecipeSchema.safeParse(req.body?.recipe ?? req.body);
      if (!parsed.success) {
        res.status(400).json({ error: ADMIN_ERRORS.playlistRecipe });
        return;
      }
      const preview = await playlistAdmin.previewRecipe(parsed.data);
      res.json(preview);
    }),
  );

  router.post(
    '/playlists/seed',
    ...staff('ADMIN'),
    wrap(async (req, res) => {
      const publish = req.body?.publish !== false;
      const seeded = await playlistAdmin.seedStaffPlaylists(publish);
      logger.info(`Admin ${req.actor!.username} seeded ${seeded.length} staff playlists`, 'Admin');
      res.json({ seeded });
    }),
  );

  router.post(
    '/playlists',
    ...staff('ADMIN'),
    wrap(async (req, res) => {
      const parsed = playlistAdmin.playlistUpsertSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: ADMIN_ERRORS.playlistPayload });
        return;
      }
      const row = await playlistAdmin.upsertPlaylist(undefined, parsed.data);
      res.status(201).json(row);
    }),
  );

  router.patch(
    '/playlists/:id',
    ...staff('ADMIN'),
    wrap(async (req, res) => {
      const parsed = playlistAdmin.playlistUpsertSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: ADMIN_ERRORS.playlistPayload });
        return;
      }
      const row = await playlistAdmin.upsertPlaylist(pid(req), parsed.data);
      res.json(row);
    }),
  );

  router.post(
    '/playlists/:id/publish',
    ...staff('ADMIN'),
    wrap(async (req, res) => {
      const snapshotCount = await playlistAdmin.refreshPlaylistSnapshot(pid(req), true);
      res.json({ snapshotCount, isPublished: true });
    }),
  );

  router.post(
    '/playlists/:id/refresh',
    ...staff('ADMIN'),
    wrap(async (req, res) => {
      const snapshotCount = await playlistAdmin.refreshPlaylistSnapshot(pid(req), false);
      res.json({ snapshotCount });
    }),
  );

  router.delete(
    '/playlists/:id',
    ...staff('ADMIN'),
    wrap(async (req, res) => {
      await playlistAdmin.deletePlaylist(pid(req));
      res.status(204).end();
    }),
  );
}
