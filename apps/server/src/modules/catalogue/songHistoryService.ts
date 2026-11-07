import { Prisma } from '@prisma/client';
import { logger } from '../../utils/logger';

export type HeardSong = { songId: number; correct: boolean };

/** Prisma client or interactive transaction — both expose raw SQL. */
type HistoryClient = Pick<Prisma.TransactionClient, '$executeRaw' | '$queryRaw'>;

interface HeardDelta {
  songId: number;
  playCount: number;
  correctCount: number;
}

/**
 * Collapse repeats of the same catalogue id. One statement cannot ON CONFLICT
 * the same key twice, and a match can hear a song only once anyway.
 */
const aggregateHeardSongs = (songs: HeardSong[]): HeardDelta[] => {
  const bySong = new Map<number, HeardDelta>();
  for (const song of songs) {
    const current = bySong.get(song.songId) ?? {
      songId: song.songId,
      playCount: 0,
      correctCount: 0,
    };
    current.playCount += 1;
    if (song.correct) current.correctCount += 1;
    bySong.set(song.songId, current);
  }
  return [...bySong.values()];
};

const heardValues = (rows: HeardDelta[]) =>
  Prisma.join(
    rows.map((row) => Prisma.sql`(${row.songId}, ${row.playCount}, ${row.correctCount})`),
  );

/**
 * Upsert SongHistory for a whole match or daily attempt in one statement.
 * `playCount` is times heard; `correctCount` increments only on a hit.
 * Unknown catalogue ids are skipped so a stale id cannot fail the caller.
 */
export async function recordHeardSongs(
  db: HistoryClient,
  profileId: string,
  songs: HeardSong[],
  now = new Date(),
): Promise<void> {
  const rows = aggregateHeardSongs(songs);
  if (!rows.length) return;

  try {
    const written = await db.$queryRaw<Array<{ songId: number }>>(Prisma.sql`
      WITH incoming AS (
        SELECT song_id, play_count, correct_count
        FROM (VALUES ${heardValues(rows)}) AS v(song_id, play_count, correct_count)
      ),
      written AS (
        INSERT INTO "SongHistory" (
          "id", "profileId", "songId", "playCount", "correctCount", "lastPlayedAt"
        )
        SELECT gen_random_uuid()::text, ${profileId}, s.id, i.play_count, i.correct_count, ${now}
        FROM incoming i
        INNER JOIN "Song" s ON s.id = i.song_id
        ON CONFLICT ("profileId", "songId") DO UPDATE SET
          "playCount" = "SongHistory"."playCount" + EXCLUDED."playCount",
          "correctCount" = "SongHistory"."correctCount" + EXCLUDED."correctCount",
          "lastPlayedAt" = EXCLUDED."lastPlayedAt"
        RETURNING "songId"
      )
      SELECT "songId" FROM written
    `);
    const writtenIds = new Set(written.map((row) => row.songId));
    const missing = rows.filter((row) => !writtenIds.has(row.songId)).map((row) => row.songId);
    if (missing.length > 0) {
      logger.warn(`[SongHistory] skipped unknown songs (${missing.join(', ')})`, 'Scoring');
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(`[SongHistory] upsert failed: ${message}`, 'Scoring');
  }
}

/**
 * Reverse one `recordHeardSongs` pass (admin reset of today's daily).
 * Two statements, not one per song. A failure throws so the caller transaction rolls back.
 */
export async function rewindHeardSongs(
  db: HistoryClient,
  profileId: string,
  songs: HeardSong[],
): Promise<void> {
  const rows = aggregateHeardSongs(songs);
  if (!rows.length) return;

  await db.$executeRaw(Prisma.sql`
    UPDATE "SongHistory" AS sh
    SET
      "playCount" = sh."playCount" - i.play_delta,
      "correctCount" = GREATEST(0, sh."correctCount" - i.correct_delta)
    FROM (VALUES ${heardValues(rows)}) AS i(song_id, play_delta, correct_delta)
    WHERE sh."profileId" = ${profileId}
      AND sh."songId" = i.song_id
  `);
  await db.$executeRaw(Prisma.sql`
    DELETE FROM "SongHistory"
    WHERE "profileId" = ${profileId}
      AND "songId" IN (${Prisma.join(rows.map((row) => row.songId))})
      AND "playCount" <= 0
  `);
}
