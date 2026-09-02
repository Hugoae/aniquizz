import { prisma, type Prisma } from '@aniquizz/database';
import type {
  LibraryAnimeGroup,
  LibraryBrowseParams,
  LibraryAnimesResponse,
  LibrarySong,
  LibrarySongsResponse,
} from '@aniquizz/shared';
import { logger } from '../../utils/logger';
import {
  MAX_PAGE_SIZE,
  animeOrderBy,
  buildSongFilter,
  mapLibrarySong,
  mapRowsWithUserFlags,
  orderByForSort,
  resolveUserSongFlags,
  songSelect,
  type RawSong,
} from './librarySongQuery';

const DEFAULT_PAGE_SIZE = 24;
const ANIME_PAGE_SIZE = 20;

export const getLibrarySongById = async (
  songId: number,
  userId?: string | null,
): Promise<LibrarySong | null> => {
  const row = await prisma.song.findFirst({
    where: { id: songId, downloadStatus: 'COMPLETED' },
    select: songSelect,
  });
  if (!row) return null;

  let discovered = false;
  let liked = false;
  if (userId) {
    try {
      const flags = await resolveUserSongFlags(userId, [songId]);
      discovered = flags.discovered.has(songId);
      liked = flags.liked.has(songId);
    } catch (e) {
      logger.warn('[Library] Failed to resolve user flags for song', 'Library', e);
    }
  }

  return mapLibrarySong(row, discovered, liked);
};

export const browseSongsByLikedRecent = async (
  opts: LibraryBrowseParams,
  userId: string,
  page: number,
  pageSize: number,
): Promise<LibrarySongsResponse> => {
  // Order by this user's likedAt; still apply catalogue filters via song relation.
  const songWhere = await buildSongFilter({ ...opts, liked: 'liked' }, userId);
  const likeWhere = { profileId: userId, song: songWhere };

  const [totalItems, likeRows] = await Promise.all([
    prisma.songLike.count({ where: likeWhere }),
    prisma.songLike.findMany({
      where: likeWhere,
      orderBy: { likedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { songId: true },
    }),
  ]);

  const orderedIds = likeRows.map((r) => r.songId);
  if (!orderedIds.length) {
    return {
      songs: [],
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
      },
    };
  }

  const rows = await prisma.song.findMany({
    where: { id: { in: orderedIds } },
    select: songSelect,
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const ordered = orderedIds.map((id) => byId.get(id)).filter((r): r is RawSong => !!r);

  let discovered = new Set<number>();
  let liked = new Set<number>();
  try {
    const flags = await resolveUserSongFlags(userId, orderedIds);
    discovered = flags.discovered;
    liked = flags.liked;
  } catch (e) {
    logger.warn('[Library] Failed to resolve user song flags', 'Library', e);
  }

  return {
    songs: mapRowsWithUserFlags(ordered, discovered, liked),
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    },
  };
};

export const browseLibrarySongs = async (
  opts: LibraryBrowseParams,
  userId?: string | null,
): Promise<LibrarySongsResponse> => {
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const pageSize = Math.min(
    Math.max(1, Math.floor(opts.pageSize ?? DEFAULT_PAGE_SIZE)),
    MAX_PAGE_SIZE,
  );
  const sort = opts.sort ?? 'franchise';

  if (sort === 'liked_recent') {
    if (!userId) {
      return {
        songs: [],
        pagination: { page, pageSize, totalItems: 0, totalPages: 1 },
      };
    }
    return browseSongsByLikedRecent(opts, userId, page, pageSize);
  }

  const where = await buildSongFilter(opts, userId);

  const [totalItems, rows] = await Promise.all([
    prisma.song.count({ where }),
    prisma.song.findMany({
      where,
      orderBy: orderByForSort(sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: songSelect,
    }),
  ]);

  let discovered = new Set<number>();
  let liked = new Set<number>();
  if (userId && rows.length) {
    try {
      const flags = await resolveUserSongFlags(
        userId,
        rows.map((r) => r.id),
      );
      discovered = flags.discovered;
      liked = flags.liked;
    } catch (e) {
      logger.warn('[Library] Failed to resolve user song flags', 'Library', e);
    }
  }

  return {
    songs: mapRowsWithUserFlags(rows, discovered, liked),
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    },
  };
};

export const browseLibraryAnimes = async (
  opts: LibraryBrowseParams,
  userId?: string | null,
): Promise<LibraryAnimesResponse> => {
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const pageSize = Math.min(
    Math.max(1, Math.floor(opts.pageSize ?? ANIME_PAGE_SIZE)),
    MAX_PAGE_SIZE,
  );
  const sort = opts.sort === 'popularity' ? 'popularity' : 'anime';
  const songFilter = await buildSongFilter(opts, userId);
  const animeWhere: Prisma.AnimeWhereInput = { songs: { some: songFilter } };

  const [totalItems, totalSongs, animes] = await Promise.all([
    prisma.anime.count({ where: animeWhere }),
    prisma.song.count({ where: songFilter }),
    prisma.anime.findMany({
      where: animeWhere,
      orderBy: animeOrderBy(sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        coverImage: true,
        coverColor: true,
        seasonYear: true,
        format: true,
        siteUrl: true,
        popularity: true,
      },
    }),
  ]);

  if (!animes.length) {
    return {
      animes: [],
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
      },
      totalSongs,
    };
  }

  const songs = await prisma.song.findMany({
    where: { animeId: { in: animes.map((a) => a.id) }, ...songFilter },
    orderBy: [{ songType: 'asc' }, { sequence: 'asc' }],
    select: songSelect,
  });

  let discovered = new Set<number>();
  let liked = new Set<number>();
  if (userId && songs.length) {
    try {
      const flags = await resolveUserSongFlags(
        userId,
        songs.map((s) => s.id),
      );
      discovered = flags.discovered;
      liked = flags.liked;
    } catch (e) {
      logger.warn('[Library] Failed to resolve user song flags', 'Library', e);
    }
  }

  const songsByAnime = new Map<number, LibrarySong[]>();
  for (const row of songs) {
    const mapped = mapLibrarySong(row, discovered.has(row.id), liked.has(row.id));
    const list = songsByAnime.get(row.anime.id) ?? [];
    list.push(mapped);
    songsByAnime.set(row.anime.id, list);
  }

  const groups: LibraryAnimeGroup[] = animes
    .map((anime) => ({
      id: anime.id,
      name: anime.name,
      coverImage: anime.coverImage,
      coverColor: anime.coverColor,
      seasonYear: anime.seasonYear,
      format: anime.format,
      siteUrl: anime.siteUrl,
      popularity: anime.popularity,
      songs: songsByAnime.get(anime.id) ?? [],
    }))
    .filter((a) => a.songs.length > 0);

  return {
    animes: groups,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    },
    totalSongs,
  };
};
