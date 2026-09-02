import { Prisma, prisma } from '@aniquizz/database';
import type {
  LibraryDifficulty,
  LibrarySongType,
  SuggestionSongOption,
  SuggestionSongOptionsParams,
  SuggestionSongOptionsResponse,
} from '@aniquizz/shared';
import {
  SUGGESTION_SONG_OPTIONS_MAX_PAGE_SIZE,
  SUGGESTION_SONG_OPTIONS_PAGE_SIZE,
} from '@aniquizz/shared';
import { resolveMatchingAnimeIdsForQuery } from '../catalogue/librarySearch';

const MIN_QUERY_LENGTH = 2;

const escapeIlike = (raw: string): string => raw.replace(/[%_\\]/g, '\\$&');

interface SongOptionRow {
  id: number;
  title: string;
  artist: string;
  songType: string;
  sequence: number;
  difficulty: string;
  animeName: string;
  coverImage: string | null;
}

const mapRow = (row: SongOptionRow): SuggestionSongOption => ({
  id: row.id,
  title: row.title,
  artist: row.artist,
  songType: row.songType as LibrarySongType,
  sequence: row.sequence,
  difficulty: row.difficulty as LibraryDifficulty,
  animeName: row.animeName,
  coverImage: row.coverImage,
});

const emptyResponse = (page: number, pageSize: number): SuggestionSongOptionsResponse => ({
  songs: [],
  pagination: { page, pageSize, totalItems: 0, totalPages: 1 },
});

export const searchSuggestionSongOptions = async (
  opts: SuggestionSongOptionsParams,
): Promise<SuggestionSongOptionsResponse> => {
  const query = opts.q.trim();
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const pageSize = Math.min(
    Math.max(1, Math.floor(opts.pageSize ?? SUGGESTION_SONG_OPTIONS_PAGE_SIZE)),
    SUGGESTION_SONG_OPTIONS_MAX_PAGE_SIZE,
  );
  if (query.length < MIN_QUERY_LENGTH) return emptyResponse(page, pageSize);

  const matchingIds = await resolveMatchingAnimeIdsForQuery(query);
  const contains = `%${escapeIlike(query)}%`;
  const prefix = `${escapeIlike(query)}%`;
  const exact = query.toLowerCase();
  const animeIdClause =
    matchingIds.length > 0
      ? Prisma.sql`OR s."animeId" IN (${Prisma.join(matchingIds)})`
      : Prisma.empty;
  const whereSql = Prisma.sql`
    s."downloadStatus" = 'COMPLETED'
    AND (
      s.title ILIKE ${contains}
      OR s.artist ILIKE ${contains}
      OR a.name ILIKE ${contains}
      OR f.name ILIKE ${contains}
      ${animeIdClause}
    )
  `;
  const orderSql = Prisma.sql`
    CASE
      WHEN lower(s.title) = ${exact} OR lower(a.name) = ${exact} THEN 0
      WHEN s.title ILIKE ${prefix} OR a.name ILIKE ${prefix} THEN 1
      WHEN s.title ILIKE ${contains} OR a.name ILIKE ${contains} THEN 2
      WHEN lower(s.artist) = ${exact} THEN 3
      WHEN s.artist ILIKE ${prefix} THEN 3
      WHEN s.artist ILIKE ${contains} THEN 4
      WHEN lower(COALESCE(f.name, '')) = ${exact} OR f.name ILIKE ${prefix} THEN 5
      WHEN f.name ILIKE ${contains} THEN 6
      ELSE 7
    END,
    a.name ASC,
    s."songType" ASC,
    s.sequence ASC
  `;

  const offset = (page - 1) * pageSize;
  const [countRows, rows] = await Promise.all([
    prisma.$queryRaw<Array<{ total: bigint }>>`
      SELECT COUNT(*)::bigint AS total
      FROM "Song" s
      INNER JOIN "Anime" a ON a.id = s."animeId"
      LEFT JOIN "Franchise" f ON f.id = a."franchiseId"
      WHERE ${whereSql}
    `,
    prisma.$queryRaw<SongOptionRow[]>`
      SELECT
        s.id,
        s.title,
        s.artist,
        s."songType",
        s.sequence,
        s.difficulty,
        a.name AS "animeName",
        a."coverImage" AS "coverImage"
      FROM "Song" s
      INNER JOIN "Anime" a ON a.id = s."animeId"
      LEFT JOIN "Franchise" f ON f.id = a."franchiseId"
      WHERE ${whereSql}
      ORDER BY ${orderSql}
      LIMIT ${pageSize} OFFSET ${offset}
    `,
  ]);

  const totalItems = Number(countRows[0]?.total ?? 0);
  return {
    songs: rows.map(mapRow),
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    },
  };
};
