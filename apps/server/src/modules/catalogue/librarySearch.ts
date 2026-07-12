import { prisma } from '@aniquizz/database';
import { animeMatchesLibrarySearch } from '@aniquizz/shared';

const PLAYABLE_SEARCH_TTL_MS = 10 * 60 * 1000;

interface PlayableAnimeSearchRow {
  id: number;
  name: string;
  franchise: string | null;
  altNames: string[];
}

let playableSearchCache: { at: number; rows: PlayableAnimeSearchRow[] } | null = null;

const escapeIlike = (raw: string): string => raw.replace(/[%_\\]/g, '\\$&');

async function getPlayableAnimeSearchRows(): Promise<PlayableAnimeSearchRow[]> {
  const now = Date.now();
  if (playableSearchCache && now - playableSearchCache.at < PLAYABLE_SEARCH_TTL_MS) {
    return playableSearchCache.rows;
  }

  const rows = await prisma.anime.findMany({
    where: { songs: { some: { downloadStatus: 'COMPLETED' } } },
    select: {
      id: true,
      name: true,
      altNames: true,
      franchise: { select: { name: true } },
    },
  });

  const mapped = rows.map((row) => ({
    id: row.id,
    name: row.name,
    franchise: row.franchise?.name ?? null,
    altNames: row.altNames,
  }));

  playableSearchCache = { at: now, rows: mapped };
  return mapped;
}

/** Test hook — clears the playable search cache between cases. */
export const clearLibrarySearchCache = (): void => {
  playableSearchCache = null;
};

/**
 * Resolve anime IDs matching a library text query.
 * SQL ILIKE on name / franchise / altNames, plus acronym/fuzzy on playable rows only.
 */
export async function resolveMatchingAnimeIdsForQuery(q: string): Promise<number[]> {
  const trimmed = q.trim();
  if (!trimmed) return [];

  const pattern = `%${escapeIlike(trimmed)}%`;
  const sqlMatches = await prisma.$queryRaw<{ id: number }[]>`
    SELECT DISTINCT a.id
    FROM "Anime" a
    LEFT JOIN "Franchise" f ON f.id = a."franchiseId"
    WHERE a.name ILIKE ${pattern}
       OR f.name ILIKE ${pattern}
       OR EXISTS (
         SELECT 1 FROM unnest(a."altNames") AS t(alt)
         WHERE t.alt ILIKE ${pattern}
       )
  `;

  const ids = new Set(sqlMatches.map((row) => row.id));

  if (trimmed.length <= 6) {
    const playableRows = await getPlayableAnimeSearchRows();
    for (const row of playableRows) {
      if (animeMatchesLibrarySearch(row, trimmed)) ids.add(row.id);
    }
  }

  return [...ids];
}
