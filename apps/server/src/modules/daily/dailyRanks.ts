import { prisma, Prisma } from '@aniquizz/database';
import { assignDailyRanks } from '@aniquizz/shared';

const TERMINAL_STATES = ['COMPLETED', 'FORFEITED', 'EXPIRED'] as const;

/**
 * Rewrite `DailyAttempt.rank` for every finisher of a challenge.
 * Call inside a transaction that already holds the attempt write, or in its
 * own transaction — always take the advisory lock so two simultaneous
 * finishes cannot clobber each other's standings.
 */
export async function syncChallengeRanks(
  tx: Prisma.TransactionClient,
  challengeId: string,
): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${challengeId}))`;
  const rows = await tx.dailyAttempt.findMany({
    where: { challengeId, state: { in: [...TERMINAL_STATES] } },
    select: {
      id: true,
      correctCount: true,
      totalResponseMs: true,
      completedAt: true,
      startedAt: true,
    },
  });
  if (rows.length === 0) return;

  const ranks = assignDailyRanks(
    rows.map((row) => ({
      id: row.id,
      correctCount: row.correctCount,
      totalResponseMs: row.totalResponseMs,
      completedAtMs: (row.completedAt ?? row.startedAt).getTime(),
    })),
  );

  // One statement instead of N Prisma updates. Ids are TEXT (Prisma String uuid),
  // not Postgres uuid — do not cast to uuid.
  const tuples = rows.map((row) =>
    Prisma.sql`(CAST(${row.id} AS text), CAST(${ranks.get(row.id) ?? null} AS integer))`,
  );

  await tx.$executeRaw`
    UPDATE "DailyAttempt" AS a
    SET "rank" = v.new_rank
    FROM (VALUES ${Prisma.join(tuples)}) AS v(id, new_rank)
    WHERE a.id = v.id
      AND a."rank" IS DISTINCT FROM v.new_rank
  `;
}

export async function syncChallengeRanksNow(challengeId: string): Promise<void> {
  await prisma.$transaction((tx) => syncChallengeRanks(tx, challengeId));
}
