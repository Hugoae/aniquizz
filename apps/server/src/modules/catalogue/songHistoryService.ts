import { prisma, type Prisma } from '@aniquizz/database';
import { logger } from '../../utils/logger';

export type HeardSong = { songId: number; correct: boolean };

/** Prisma client or interactive transaction — both expose `songHistory`. */
type HistoryClient = typeof prisma | Prisma.TransactionClient;

/**
 * Upsert one SongHistory row per catalogue id. `playCount` = heard;
 * `correctCount` increments only on a hit. Missing songs must not fail the caller.
 */
export async function recordHeardSongs(
  db: HistoryClient,
  profileId: string,
  songs: HeardSong[],
  now = new Date(),
): Promise<void> {
  if (!songs.length) return;
  await Promise.all(
    songs.map((song) =>
      db.songHistory
        .upsert({
          where: { profileId_songId: { profileId, songId: song.songId } },
          create: {
            profileId,
            songId: song.songId,
            playCount: 1,
            correctCount: song.correct ? 1 : 0,
            lastPlayedAt: now,
          },
          update: {
            playCount: { increment: 1 },
            correctCount: song.correct ? { increment: 1 } : undefined,
            lastPlayedAt: now,
          },
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          logger.warn(`[SongHistory] upsert failed (${song.songId}): ${message}`, 'Scoring');
        }),
    ),
  );
}

/** Reverse one `recordHeardSongs` pass (admin reset of today's daily). */
export async function rewindHeardSongs(
  db: HistoryClient,
  profileId: string,
  songs: HeardSong[],
): Promise<void> {
  for (const song of songs) {
    try {
      const row = await db.songHistory.findUnique({
        where: { profileId_songId: { profileId, songId: song.songId } },
      });
      if (!row) continue;
      const playCount = row.playCount - 1;
      const correctCount = song.correct ? Math.max(0, row.correctCount - 1) : row.correctCount;
      if (playCount <= 0) {
        await db.songHistory.delete({ where: { id: row.id } });
      } else {
        await db.songHistory.update({
          where: { id: row.id },
          data: { playCount, correctCount },
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(`[SongHistory] rewind failed (${song.songId}): ${message}`, 'Scoring');
    }
  }
}
