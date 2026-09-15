import { prisma, type Prisma } from '@aniquizz/database';
import {
  LIBRARY_ANIME_SONGS_PAGE_SIZE,
  libraryBrowseNeedsActor,
  MAX_NESTED_SONGS_PER_ANIME,
  parseCatalogueSearchQuery,
  resolveCatalogueSongTypes,
  type LibraryAnimesResponse,
  type LibraryBrowseParams,
  type LibraryDifficulty,
  type LibraryFranchiseGroup,
  type LibrarySong,
  type LibrarySongType,
  type LibrarySongsResponse,
  type LibrarySort,
  type LibraryTreeResponse,
} from '@aniquizz/shared';
import { resolveMatchingAnimeIdsForQuery } from './librarySearch';
import { resolveLikedIds } from './songLikeService';

export const MAX_PAGE_SIZE = LIBRARY_ANIME_SONGS_PAGE_SIZE;

export const emptyLibraryPagination = (page: number, pageSize: number) => ({
  page,
  pageSize,
  totalItems: 0,
  totalPages: 1,
});

export const emptyLibrarySongsResponse = (
  page: number,
  pageSize: number,
): LibrarySongsResponse => ({
  songs: [],
  pagination: emptyLibraryPagination(page, pageSize),
});

export const emptyLibraryAnimesResponse = (
  page: number,
  pageSize: number,
): LibraryAnimesResponse => ({
  animes: [],
  pagination: emptyLibraryPagination(page, pageSize),
  totalSongs: 0,
});

export const emptyLibraryTreeResponse = (
  page: number,
  pageSize: number,
  view: LibraryTreeResponse['view'] = 'tree',
): LibraryTreeResponse => ({
  groups: [],
  pagination: emptyLibraryPagination(page, pageSize),
  totalSongs: 0,
  view,
});

/** Personal filters without a JWT must not fall through to the public catalogue. */
export const shouldReturnEmptyPersonalBrowse = (
  opts: LibraryBrowseParams,
  userId?: string | null,
): boolean => libraryBrowseNeedsActor(opts) && !userId;

/** Playable = same rule as gameService and profile stats: COMPLETED videos only. */
export const buildLibrarySongWhere = (
  opts: LibraryBrowseParams,
  matchingAnimeIds?: number[],
  userId?: string | null,
): Prisma.SongWhereInput => {
  const parsed = parseCatalogueSearchQuery(opts.q ?? '');
  const q = parsed.text;
  const songTypes = resolveCatalogueSongTypes(opts.songType, parsed.songType);
  const andClauses: Prisma.SongWhereInput[] = [];

  const base: Prisma.SongWhereInput = {
    downloadStatus: 'COMPLETED',
    ...(opts.animeId !== undefined ? { animeId: opts.animeId } : {}),
    ...(opts.franchiseId !== undefined ? { anime: { franchiseId: opts.franchiseId } } : {}),
    ...(songTypes?.length ? { songType: { in: songTypes } } : {}),
    ...(opts.difficulty?.length ? { difficulty: { in: opts.difficulty } } : {}),
  };

  // Query token conflicts with the type chips (library OP + "bleach ED5").
  if (songTypes && songTypes.length === 0) {
    andClauses.push({ id: { in: [-1] } });
  }
  if (parsed.sequence != null) {
    andClauses.push({ sequence: parsed.sequence });
  }

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

const nestedPlayableSongs = (songFilter: Prisma.SongWhereInput) => ({
  where: songFilter,
  orderBy: [{ songType: 'asc' as const }, { sequence: 'asc' as const }],
  take: MAX_NESTED_SONGS_PER_ANIME,
  select: songSelect,
});

export const animeBrowseSelect = (songFilter: Prisma.SongWhereInput) =>
  ({
    id: true,
    name: true,
    coverImage: true,
    coverColor: true,
    seasonYear: true,
    format: true,
    siteUrl: true,
    popularity: true,
    franchiseId: true,
    songs: nestedPlayableSongs(songFilter),
  }) satisfies Prisma.AnimeSelect;

export const countSongsByAnimeId = async (
  animeIds: number[],
  songFilter: Prisma.SongWhereInput,
): Promise<Map<number, number>> => {
  if (!animeIds.length) return new Map();
  const rows = await prisma.song.groupBy({
    by: ['animeId'],
    where: { animeId: { in: animeIds }, AND: [songFilter] },
    _count: { _all: true },
  });
  return new Map(rows.map((row) => [row.animeId, row._count._all]));
};

export const mapLibrarySong = (row: RawSong, discovered = false, liked = false): LibrarySong => ({
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
      anime.songs = anime.songs.map((s) => (discovered.has(s.id) ? { ...s, discovered: true } : s));
    }
  }
};

export const applyLikedToGroups = (groups: LibraryFranchiseGroup[], liked: Set<number>): void => {
  for (const group of groups) {
    for (const anime of group.animes) {
      anime.songs = anime.songs.map((s) => (liked.has(s.id) ? { ...s, liked: true } : s));
    }
  }
};
