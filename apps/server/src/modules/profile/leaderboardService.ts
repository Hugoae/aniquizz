import { Prisma, prisma } from '@aniquizz/database';
import {
  accuracyPercent,
  clampLeaderboardPageSize,
  isAccuracyEligible,
  LEADERBOARD_ACCURACY_MIN_ROUNDS,
  LEADERBOARD_PODIUM_SAMPLE,
  pageForRow,
  winRatePercent,
  type LeaderboardBrowseParams,
  type LeaderboardEntry,
  type LeaderboardMetric,
  type LeaderboardPodiumGroup,
  type LeaderboardResponse,
  type LeaderboardViewer,
} from '@aniquizz/shared';
import { logger } from '../../utils/logger';
import { getLibraryMeta } from '../catalogue/libraryMeta';
import { rankedCteSql } from './leaderboardQuery';
import {
  getLeaderboardSnapshot,
  leaderboardCacheKey,
  setLeaderboardSnapshot,
  type LeaderboardPublicSnapshot,
} from './leaderboardCache';

interface RankedRow {
  bucket: string;
  id: string;
  username: string;
  avatar: string;
  level: number;
  xp: number;
  gamesWon: number;
  gamesPlayed: number;
  correctGuesses: number;
  totalGuesses: number;
  discoveries: number;
  rank: number;
  row_num: number;
  total_items: number;
  group_count: number | null;
}

const toInt = (value: unknown): number => Number(value ?? 0);

const mapRow = (row: RankedRow): RankedRow => ({
  ...row,
  level: toInt(row.level),
  xp: toInt(row.xp),
  gamesWon: toInt(row.gamesWon),
  gamesPlayed: toInt(row.gamesPlayed),
  correctGuesses: toInt(row.correctGuesses),
  totalGuesses: toInt(row.totalGuesses),
  discoveries: toInt(row.discoveries),
  rank: toInt(row.rank),
  row_num: toInt(row.row_num),
  total_items: toInt(row.total_items),
  group_count: row.group_count == null ? null : toInt(row.group_count),
});

const toEntry = (metric: LeaderboardMetric, row: RankedRow): LeaderboardEntry => {
  const base = {
    rank: row.rank,
    id: row.id,
    username: row.username,
    avatar: row.avatar,
    level: row.level,
  };
  switch (metric) {
    case 'xp':
      return { ...base, metric, xp: row.xp };
    case 'victories':
      return {
        ...base,
        metric,
        gamesWon: row.gamesWon,
        gamesPlayed: row.gamesPlayed,
        winRate: winRatePercent(row.gamesWon, row.gamesPlayed),
      };
    case 'games':
      return { ...base, metric, gamesPlayed: row.gamesPlayed };
    case 'discoveries':
      return {
        ...base,
        metric,
        discoveries: row.discoveries,
      };
    case 'accuracy':
      return {
        ...base,
        metric,
        accuracy: accuracyPercent(row.correctGuesses, row.totalGuesses),
        correctGuesses: row.correctGuesses,
        totalGuesses: row.totalGuesses,
      };
    default:
      throw new Error(`Unsupported leaderboard metric: ${metric}`);
  }
};

const browseSql = (
  metric: LeaderboardMetric,
  offset: number,
  pageSize: number,
): Prisma.Sql => {
  const ranked = rankedCteSql(metric);

  return Prisma.sql`
    WITH ranked AS (
      ${ranked}
    ),
    podium_rows AS (
      SELECT
        r.*,
        ROW_NUMBER() OVER (PARTITION BY r.rank ORDER BY r.row_num) AS in_group,
        COUNT(*) OVER (PARTITION BY r.rank)::int AS group_count
      FROM ranked r
      WHERE r.rank <= 3
    )
    SELECT
      'page'::text AS bucket,
      p.id, p.username, p.avatar, p.level, p.xp, p."gamesWon", p."gamesPlayed",
      p."correctGuesses", p."totalGuesses", p.discoveries,
      p.rank, p.row_num, p.total_items, NULL::int AS group_count
    FROM ranked p
    WHERE p.row_num > ${offset} AND p.row_num <= ${offset + pageSize}
    UNION ALL
    SELECT
      'podium'::text AS bucket,
      pr.id, pr.username, pr.avatar, pr.level, pr.xp, pr."gamesWon", pr."gamesPlayed",
      pr."correctGuesses", pr."totalGuesses", pr.discoveries,
      pr.rank, pr.row_num, pr.total_items, pr.group_count
    FROM podium_rows pr
    WHERE pr.in_group <= ${LEADERBOARD_PODIUM_SAMPLE}
    ORDER BY bucket, row_num
  `;
};

const viewerSql = (metric: LeaderboardMetric, viewerId: string): Prisma.Sql => {
  const ranked = rankedCteSql(metric);
  return Prisma.sql`
    WITH ranked AS (
      ${ranked}
    )
    SELECT
      'viewer'::text AS bucket,
      v.id, v.username, v.avatar, v.level, v.xp, v."gamesWon", v."gamesPlayed",
      v."correctGuesses", v."totalGuesses", v.discoveries,
      v.rank, v.row_num, v.total_items, NULL::int AS group_count
    FROM ranked v
    WHERE v.id = ${viewerId}
  `;
};

const resolveUnrankedViewer = async (
  metric: LeaderboardMetric,
  viewerId: string,
): Promise<LeaderboardViewer> => {
  const profile = await prisma.profile.findUnique({
    where: { id: viewerId },
    select: { totalGuesses: true },
  });
  if (!profile) return { status: 'unranked' };
  if (metric === 'accuracy' && !isAccuracyEligible(profile.totalGuesses)) {
    return {
      status: 'ineligible',
      totalGuesses: profile.totalGuesses,
      requiredGuesses: LEADERBOARD_ACCURACY_MIN_ROUNDS,
    };
  }
  return { status: 'unranked' };
};

const buildPodium = (metric: LeaderboardMetric, rows: RankedRow[]): LeaderboardPodiumGroup[] => {
  const byRank = new Map<number, LeaderboardPodiumGroup>();
  for (const row of rows) {
    const existing = byRank.get(row.rank);
    const entry = toEntry(metric, row);
    if (existing) {
      existing.entries.push(entry);
      continue;
    }
    byRank.set(row.rank, {
      rank: row.rank,
      count: row.group_count ?? 1,
      entries: [entry],
    });
  }
  return [...byRank.values()].sort((a, b) => a.rank - b.rank);
};

const loadPublicSnapshot = async (
  metric: LeaderboardMetric,
  page: number,
  pageSize: number,
  offset: number,
): Promise<LeaderboardPublicSnapshot> => {
  const [rows, meta] = await Promise.all([
    prisma.$queryRaw<RankedRow[]>(browseSql(metric, offset, pageSize)),
    getLibraryMeta(),
  ]);

  const mapped = rows.map(mapRow);
  const catalogueSize = meta.totalSongs;
  const pageRows = mapped.filter((row) => row.bucket === 'page');
  const podiumRows = mapped.filter((row) => row.bucket === 'podium');
  const totalItems = pageRows[0]?.total_items ?? podiumRows[0]?.total_items ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return {
    metric,
    entries: pageRows.map((row) => toEntry(metric, row)),
    podium: buildPodium(metric, podiumRows),
    pagination: {
      page: totalItems === 0 ? 1 : Math.min(page, totalPages),
      pageSize,
      totalItems,
      totalPages,
    },
    catalogueSize,
  };
};

const resolveViewer = async (
  metric: LeaderboardMetric,
  viewerId: string,
  snapshot: LeaderboardPublicSnapshot,
): Promise<LeaderboardViewer> => {
  const onPage = snapshot.entries.find((entry) => entry.id === viewerId);
  if (onPage) {
    return {
      status: 'ranked',
      entry: onPage,
      page: snapshot.pagination.page,
    };
  }

  const rows = await prisma.$queryRaw<RankedRow[]>(viewerSql(metric, viewerId));
  const viewerRow = rows[0] ? mapRow(rows[0]) : null;
  if (viewerRow) {
    return {
      status: 'ranked',
      entry: toEntry(metric, viewerRow),
      page: pageForRow(viewerRow.row_num, snapshot.pagination.pageSize),
    };
  }
  return resolveUnrankedViewer(metric, viewerId);
};

export const browseLeaderboard = async (
  params: LeaderboardBrowseParams,
  viewerId?: string | null,
): Promise<LeaderboardResponse> => {
  const started = Date.now();
  const metric = params.metric ?? 'xp';
  const pageSize = clampLeaderboardPageSize(params.pageSize);
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const offset = (page - 1) * pageSize;
  const actorId = viewerId ?? null;
  const cacheKey = leaderboardCacheKey(metric, page, pageSize);

  let cacheHit = true;
  let snapshot = getLeaderboardSnapshot(cacheKey);
  if (!snapshot) {
    cacheHit = false;
    snapshot = await loadPublicSnapshot(metric, page, pageSize, offset);
    setLeaderboardSnapshot(cacheKey, snapshot);
  }

  const viewer = actorId ? await resolveViewer(metric, actorId, snapshot) : null;
  logger.info('Leaderboard snapshot served', 'Leaderboard', {
    metric,
    page,
    pageSize,
    cacheHit,
    durationMs: Date.now() - started,
    totalItems: snapshot.pagination.totalItems,
    viewer: viewer?.status ?? 'anonymous',
  });

  return { ...snapshot, viewer };
};

export const explainLeaderboardQuery = async (metric: LeaderboardMetric): Promise<string> => {
  const rows = await prisma.$queryRaw<Array<{ 'QUERY PLAN': unknown }>>`
    EXPLAIN ${browseSql(metric, 0, 25)}
  `;
  return rows
    .map((row) => {
      const plan = row['QUERY PLAN'];
      return typeof plan === 'string' ? plan : JSON.stringify(plan);
    })
    .join('\n');
};
