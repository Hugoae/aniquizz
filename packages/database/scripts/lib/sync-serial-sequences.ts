import { PrismaClient } from '@prisma/client';

/**
 * Resync a Postgres serial sequence after rows were inserted with explicit ids
 * (e.g. manual_edits import). Without this, the next autoincrement insert can
 * collide on `id` (Prisma P2002).
 */
export async function syncSerialSequence(
  prisma: PrismaClient,
  table: string,
  column = 'id',
): Promise<void> {
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"${table}"', '${column}'), (SELECT COALESCE(MAX("${column}"), 0) FROM "${table}"))`,
  );
}

/** Pipeline tables that may receive explicit ids during manual imports. */
export async function syncPipelineSerialSequences(prisma: PrismaClient): Promise<void> {
  await syncSerialSequence(prisma, 'Franchise');
  await syncSerialSequence(prisma, 'Anime');
  await syncSerialSequence(prisma, 'Song');
}
