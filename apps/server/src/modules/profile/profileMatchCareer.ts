import { prisma } from '@aniquizz/database';

export type FinishedMatchCareer = {
  multiCount: number;
  soloCount: number;
  playtimeMs: number;
};

/**
 * Multi/solo split + playtime without pulling every finished MatchPlayer row.
 */
export const queryFinishedMatchCareer = async (profileId: string): Promise<FinishedMatchCareer> => {
  const rows = await prisma.$queryRaw<
    Array<{ multiCount: number; soloCount: number; playtimeMs: bigint | number }>
  >`
    SELECT
      COUNT(*) FILTER (WHERE player_count > 1)::int AS "multiCount",
      COUNT(*) FILTER (WHERE player_count <= 1)::int AS "soloCount",
      COALESCE(SUM(playtime_ms), 0)::bigint AS "playtimeMs"
    FROM (
      SELECT
        (SELECT COUNT(*)::int FROM "MatchPlayer" other WHERE other."matchId" = m.id) AS player_count,
        CASE
          WHEN m."endedAt" IS NOT NULL
            THEN (EXTRACT(EPOCH FROM (m."endedAt" - m."startedAt")) * 1000)::bigint
          ELSE 0::bigint
        END AS playtime_ms
      FROM "MatchPlayer" mp
      INNER JOIN "Match" m ON m.id = mp."matchId"
      WHERE mp."profileId" = ${profileId}
        AND m.status = 'FINISHED'
    ) career
  `;
  const row = rows[0];
  return {
    multiCount: row?.multiCount ?? 0,
    soloCount: row?.soloCount ?? 0,
    playtimeMs: Number(row?.playtimeMs ?? 0),
  };
};
