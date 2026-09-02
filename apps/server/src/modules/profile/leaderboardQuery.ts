import { Prisma } from '@aniquizz/database';
import {
  LEADERBOARD_ACCURACY_MIN_ROUNDS,
  type LeaderboardMetric,
} from '@aniquizz/shared';

export const BOT_ID_PATTERN = 'bot-%';

const eligibleBase = Prisma.sql`
  p.id NOT LIKE ${BOT_ID_PATTERN}
  AND (p."bannedUntil" IS NULL OR p."bannedUntil" <= NOW())
`;

interface MetricSpec {
  extraJoin: Prisma.Sql;
  extraSelect: Prisma.Sql;
  eligible: Prisma.Sql;
  rankOrder: Prisma.Sql;
  orderExpr: Prisma.Sql;
}

export const metricSpec = (metric: LeaderboardMetric): MetricSpec => {
  switch (metric) {
    case 'xp':
      return {
        extraJoin: Prisma.empty,
        extraSelect: Prisma.sql`0::int AS discoveries`,
        eligible: Prisma.sql`p.xp > 0`,
        rankOrder: Prisma.sql`p.xp DESC`,
        orderExpr: Prisma.sql`p.xp DESC, p.level DESC, p.username ASC, p.id ASC`,
      };
    case 'victories': {
      const winRate = Prisma.sql`(p."gamesWon"::numeric / NULLIF(p."gamesPlayed", 0))`;
      return {
        extraJoin: Prisma.empty,
        extraSelect: Prisma.sql`0::int AS discoveries`,
        eligible: Prisma.sql`p."gamesWon" > 0`,
        rankOrder: Prisma.sql`p."gamesWon" DESC, ${winRate} DESC`,
        orderExpr: Prisma.sql`p."gamesWon" DESC, ${winRate} DESC, p."gamesPlayed" DESC, p.username ASC, p.id ASC`,
      };
    }
    case 'games':
      return {
        extraJoin: Prisma.empty,
        extraSelect: Prisma.sql`0::int AS discoveries`,
        eligible: Prisma.sql`p."gamesPlayed" > 0`,
        rankOrder: Prisma.sql`p."gamesPlayed" DESC`,
        orderExpr: Prisma.sql`p."gamesPlayed" DESC, p."gamesWon" DESC, p.username ASC, p.id ASC`,
      };
    case 'discoveries':
      return {
        extraJoin: Prisma.sql`
          INNER JOIN (
            SELECT "profileId", COUNT(*)::int AS discoveries
            FROM "SongHistory"
            GROUP BY "profileId"
          ) d ON d."profileId" = p.id
        `,
        extraSelect: Prisma.sql`d.discoveries`,
        eligible: Prisma.sql`d.discoveries > 0`,
        rankOrder: Prisma.sql`d.discoveries DESC`,
        orderExpr: Prisma.sql`d.discoveries DESC, p."gamesPlayed" DESC, p.username ASC, p.id ASC`,
      };
    case 'accuracy':
      return {
        extraJoin: Prisma.empty,
        extraSelect: Prisma.sql`0::int AS discoveries`,
        eligible: Prisma.sql`p."totalGuesses" >= ${LEADERBOARD_ACCURACY_MIN_ROUNDS}`,
        rankOrder: Prisma.sql`(p."correctGuesses"::numeric / p."totalGuesses") DESC`,
        orderExpr: Prisma.sql`(p."correctGuesses"::numeric / p."totalGuesses") DESC, p."totalGuesses" DESC, p.username ASC, p.id ASC`,
      };
    default:
      throw new Error(`Unsupported leaderboard metric: ${metric}`);
  }
};

export const rankedCteSql = (metric: LeaderboardMetric): Prisma.Sql => {
  const spec = metricSpec(metric);
  return Prisma.sql`
    SELECT
      p.id,
      p.username,
      p.avatar,
      p.level,
      p.xp,
      p."gamesWon",
      p."gamesPlayed",
      p."correctGuesses",
      p."totalGuesses",
      ${spec.extraSelect},
      RANK() OVER (ORDER BY ${spec.rankOrder})::int AS rank,
      ROW_NUMBER() OVER (ORDER BY ${spec.orderExpr})::int AS row_num,
      COUNT(*) OVER ()::int AS total_items
    FROM "Profile" p
    ${spec.extraJoin}
    WHERE ${eligibleBase}
      AND ${spec.eligible}
  `;
};
