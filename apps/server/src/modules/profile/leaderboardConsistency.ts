import { prisma, BOT_ID_PREFIX } from '@aniquizz/database';

export interface LeaderboardDriftRow {
  profileId: string;
  username: string;
  field: 'gamesPlayed' | 'gamesWon' | 'correctGuesses';
  stored: number;
  computed: number;
}

export interface LeaderboardConsistencyReport {
  sampled: number;
  drifted: LeaderboardDriftRow[];
}

/**
 * Read-only check: Profile counters vs recomputable MatchPlayer totals.
 * Does not write or "fix" legacy drift.
 */
export const reportLeaderboardAggregateDrift = async (
  limit = 500,
): Promise<LeaderboardConsistencyReport> => {
  const rows = await prisma.$queryRaw<
    Array<{
      profileId: string;
      username: string;
      gamesPlayed: number;
      gamesWon: number;
      correctGuesses: number;
      computedPlayed: number;
      computedWon: number;
      computedCorrect: number;
    }>
  >`
    SELECT
      p.id AS "profileId",
      p.username,
      p."gamesPlayed",
      p."gamesWon",
      p."correctGuesses",
      COALESCE(m.played, 0)::int AS "computedPlayed",
      COALESCE(m.won, 0)::int AS "computedWon",
      COALESCE(m.correct, 0)::int AS "computedCorrect"
    FROM "Profile" p
    LEFT JOIN (
      SELECT
        mp."profileId",
        COUNT(*)::int AS played,
        COUNT(*) FILTER (WHERE mp."isWinner")::int AS won,
        COALESCE(SUM(mp."correctCount"), 0)::int AS correct
      FROM "MatchPlayer" mp
      INNER JOIN "Match" m ON m.id = mp."matchId"
      WHERE m.status = 'FINISHED'
      GROUP BY mp."profileId"
    ) m ON m."profileId" = p.id
    WHERE p.id NOT LIKE ${`${BOT_ID_PREFIX}%`}
      AND (p."gamesPlayed" > 0 OR COALESCE(m.played, 0) > 0)
    ORDER BY ABS(p."gamesPlayed" - COALESCE(m.played, 0)) DESC
    LIMIT ${limit}
  `;

  const drifted: LeaderboardDriftRow[] = [];
  for (const row of rows) {
    const checks = [
      ['gamesPlayed', row.gamesPlayed, row.computedPlayed],
      ['gamesWon', row.gamesWon, row.computedWon],
      ['correctGuesses', row.correctGuesses, row.computedCorrect],
    ] as const;
    for (const [field, stored, computed] of checks) {
      if (stored !== computed) {
        drifted.push({
          profileId: row.profileId,
          username: row.username,
          field,
          stored,
          computed,
        });
      }
    }
  }

  return { sampled: rows.length, drifted };
};
