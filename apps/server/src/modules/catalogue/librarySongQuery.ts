import { prisma, type Prisma } from '@aniquizz/database';
import type {
  LibraryBrowseParams,
  LibraryDifficulty,
  LibraryFranchiseGroup,
  LibrarySong,
  LibrarySongType,
  LibrarySort,
} from '@aniquizz/shared';
import { resolveMatchingAnimeIdsForQuery } from './librarySearch';
import { resolveLikedIds } from './songLikeService';

export const MAX_PAGE_SIZE = 48;

/** Playable = same rule as gameService and profile stats: COMPLETED videos only. */
export const buildLibrarySongWhere = (
  opts: LibraryBrowseParams,
  matchingAnimeIds?: number[],
  userId?: string | null,
): Prisma.SongWhereInput => {
  const q = opts.q?.trim();
  const andClauses: Prisma.SongWhereInput[] = [];

  const base: Prisma.SongWhereInput = {
    downloadStatus: 'COMPLETED',
    ...(opts.animeId !== undefined ? { animeId: opts.animeId } : {}),
    ...(opts.franchiseId !== undefined
      ? { anime: { franchiseId: opts.franchiseId } }
      : {}),
    ...(opts.songType?.length ? { songType: { in: opts.songType } } : {}),
    ...(opts.difficulty?.length ? { difficulty: { in: opts.difficulty } } : {}),
  };

  if (opts.discovered === 'heard' && userId) {
    andClauses.push({ history: { some: { profileId: userId } } });
  } else if (opts.discovered === 'unheard' && userId) {
    andClauses.push({ history: { none: { profileId: userId } } });
  }

  if (opts.liked === 'liked' && userId) {
    andClauses.push({ likes: { some: { profileId: userId } } });
  } else if (opts.liked === 'unliked' && userId) {
    andClauses.push({ likes: { none: { profileId: userId } } });
  }

  if (q) {
    const textOr: Prisma.SongWhereInput[] = [
      { title: { contains: q, mode: 'insensitive' } },
      { artist: { contains: q, mode: 'insensitive' } },
      { anime: { name: { contains: q, mode: 'insensitive' } } },
      { anime: { franchise: { name: { contains: q, mode: 'insensitive' } } } },
    ];
    if (matchingAnimeIds?.length) {
      textOr.push({ animeId: { in: matchingAnimeIds } });
    }
    andClauses.push({ OR: textOr });
  }

  if (!andClauses.length) return base;
  return { ...base, AND: andClauses };
};

/** Song filter with alt-name search expansion resolved (used by every browse entry point). */
export const buildSongFilter = async (
  opts: LibraryBrowseParams,
  userId?: string | null,
): Promise<Prisma.SongWhereInput> => {
  const matchingAnimeIds = opts.q?.trim()
    ? await resolveMatchingAnimeIdsForQuery(opts.q)
    : undefined;
  return buildLibrarySongWhere(opts, matchingAnimeIds, userId);
};

export const orderByForSort = (sort: LibrarySort): Prisma.SongOrderByWithRelationInput[] => {
  switch (sort) {
    case 'anime':
      return [{ anime: { name: 'asc' } }, { songType: 'asc' }, { sequence: 'asc' }];
    case 'title':
      return [{ title: 'asc' }];
    case 'popularity':
      return [{ anime: { popularity: 'desc' } }, { songType: 'asc' }, { sequence: 'asc' }];
    case 'likes':
      return [{ likeCount: 'desc' }, { title: 'asc' }];
    case 'liked_recent':
      // Handled by browseSongsByLikedRecent — fallback if mis-routed.
      return [{ likeCount: 'desc' }, { title: 'asc' }];
    case 'franchise_desc':
      return [
        { anime: { franchise: { name: 'desc' } } },
        { anime: { name: 'asc' } },
        { songType: 'asc' },
        { sequence: 'asc' },
      ];
    case 'franchise':
    default:
      return [
        { anime: { franchise: { name: 'asc' } } },
        { anime: { name: 'asc' } },
        { songType: 'asc' },
        { sequence: 'asc' },
      ];
  }
};

export const animeOrderBy = (sort: LibrarySort): Prisma.AnimeOrderByWithRelationInput[] => {
  if (sort === 'popularity') return [{ popularity: 'desc' }, { name: 'asc' }];
  return [{ name: 'asc' }];
};

export const songSelect = {
  id: true,
  title: true,
  artist: true,
  songType: true,
  sequence: true,
  videoKey: true,
  difficulty: true,
  episodeRange: true,
  duration: true,
  tags: true,
  likeCount: true,
  anime: {
    select: {
      id: true,
      name: true,
      coverImage: true,
      coverColor: true,
      seasonYear: true,
      format: true,
      siteUrl: true,
      popularity: true,
      franchiseId: true,
      franchise: { select: { id: true, name: true, genres: true } },
    },
  },
} satisfies Prisma.SongSelect;

export type RawSong = Prisma.SongGetPayload<{ select: typeof songSelect }>;

export const mapLibrarySong = (
  row: RawSong,
  discovered = false,
  liked = false,
): LibrarySong => ({
  id: row.id,
  title: row.title,
  artist: row.artist,
  songType: row.songType as LibrarySongType,
  sequence: row.sequence,
  videoKey: row.videoKey,
  difficulty: row.difficulty as LibraryDifficulty,
  episodeRange: row.episodeRange,
  duration: row.duration,
  tags: row.tags,
  likeCount: row.likeCount,
  anime: {
    id: row.anime.id,
    name: row.anime.name,
    coverImage: row.anime.coverImage,
    coverColor: row.anime.coverColor,
    seasonYear: row.anime.seasonYear,
    format: row.anime.format,
    siteUrl: row.anime.siteUrl,
    popularity: row.anime.popularity,
  },
  franchise: row.anime.franchise
    ? {
        id: row.anime.franchise.id,
        name: row.anime.franchise.name,
        genres: row.anime.franchise.genres,
      }
    : null,
  ...(discovered ? { discovered: true } : {}),
  ...(liked ? { liked: true } : {}),
});

const resolveDiscoveredIds = async (userId: string, songIds: number[]): Promise<Set<number>> => {
  if (!songIds.length) return new Set();
  const rows = await prisma.songHistory.findMany({
    where: { profileId: userId, songId: { in: songIds } },
    select: { songId: true },
  });
  return new Set(rows.map((r) => r.songId));
};

export const resolveUserSongFlags = async (
  userId: string,
  songIds: number[],
): Promise<{ discovered: Set<number>; liked: Set<number> }> => {
  if (!songIds.length) return { discovered: new Set(), liked: new Set() };
  const [discovered, liked] = await Promise.all([
    resolveDiscoveredIds(userId, songIds),
    resolveLikedIds(userId, songIds),
  ]);
  return { discovered, liked };
};

export const mapRowsWithUserFlags = (
  rows: RawSong[],
  discovered: Set<number>,
  liked: Set<number>,
): LibrarySong[] =>
  rows.map((row) => mapLibrarySong(row, discovered.has(row.id), liked.has(row.id)));

export const applyDiscoveredToGroups = (
  groups: LibraryFranchiseGroup[],
  discovered: Set<number>,
): void => {
  for (const group of groups) {
    for (const anime of group.animes) {
      anime.songs = anime.songs.map((s) =>
        discovered.has(s.id) ? { ...s, discovered: true } : s,
      );
    }
  }
};

export const applyLikedToGroups = (
  groups: LibraryFranchiseGroup[],
  liked: Set<number>,
): void => {
  for (const group of groups) {
    for (const anime of group.animes) {
      anime.songs = anime.songs.map((s) => (liked.has(s.id) ? { ...s, liked: true } : s));
    }
  }
};
