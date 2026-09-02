import { prisma, type Prisma } from '@aniquizz/database';
import type {
  LibraryAnimeGroup,
  LibraryBrowseParams,
  LibraryFranchiseGroup,
  LibrarySong,
  LibrarySort,
  LibraryTreeResponse,
} from '@aniquizz/shared';
import { logger } from '../../utils/logger';
import { browseSongsByLikedRecent } from './libraryBrowse';
import {
  MAX_PAGE_SIZE,
  animeOrderBy,
  applyDiscoveredToGroups,
  applyLikedToGroups,
  buildSongFilter,
  mapLibrarySong,
  mapRowsWithUserFlags,
  orderByForSort,
  resolveUserSongFlags,
  songSelect,
} from './librarySongQuery';

const TREE_PAGE_SIZE = 20;
const SEARCH_PAGE_SIZE = 24;
const ORPHAN_FRANCHISE_LABEL = 'Sans franchise';

type FranchiseRow = { id: number; name: string; genres: string[] };

const countSongsInGroup = (group: LibraryFranchiseGroup): number =>
  group.animes.reduce((sum, a) => sum + a.songs.length, 0);

const groupSongsIntoTree = (songs: LibrarySong[]): LibraryFranchiseGroup[] => {
  const franchiseMap = new Map<string, LibraryFranchiseGroup>();

  for (const song of songs) {
    const fKey = song.franchise ? String(song.franchise.id) : 'orphan';
    let group = franchiseMap.get(fKey);
    if (!group) {
      group = {
        id: song.franchise?.id ?? null,
        name: song.franchise?.name ?? ORPHAN_FRANCHISE_LABEL,
        genres: song.franchise?.genres ?? [],
        animes: [],
        songCount: 0,
      };
      franchiseMap.set(fKey, group);
    }

    let animeGroup = group.animes.find((a) => a.id === song.anime.id);
    if (!animeGroup) {
      animeGroup = {
        id: song.anime.id,
        name: song.anime.name,
        coverImage: song.anime.coverImage,
        coverColor: song.anime.coverColor,
        seasonYear: song.anime.seasonYear,
        format: song.anime.format,
        siteUrl: song.anime.siteUrl,
        popularity: song.anime.popularity,
        songs: [],
      };
      group.animes.push(animeGroup);
    }
    animeGroup.songs.push(song);
  }

  return [...franchiseMap.values()].map((group) => {
    group.songCount = countSongsInGroup(group);
    return group;
  });
};

const browseLibrarySearchTree = async (
  opts: LibraryBrowseParams,
  userId?: string | null,
): Promise<LibraryTreeResponse> => {
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const pageSize = Math.min(
    Math.max(1, Math.floor(opts.pageSize ?? SEARCH_PAGE_SIZE)),
    MAX_PAGE_SIZE,
  );
  const sort = opts.sort ?? 'franchise';

  if (sort === 'liked_recent') {
    if (!userId) {
      return {
        groups: [],
        pagination: { page, pageSize, totalItems: 0, totalPages: 1 },
        totalSongs: 0,
        view: 'search',
      };
    }
    const flat = await browseSongsByLikedRecent(opts, userId, page, pageSize);
    return {
      groups: groupSongsIntoTree(flat.songs),
      pagination: flat.pagination,
      totalSongs: flat.pagination.totalItems,
      view: 'search',
    };
  }

  const where = await buildSongFilter(opts, userId);

  const [totalSongs, rows] = await Promise.all([
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
      logger.warn('[Library] Failed to resolve user song flags for search tree', 'Library', e);
    }
  }

  const groups = groupSongsIntoTree(mapRowsWithUserFlags(rows, discovered, liked));

  return {
    groups,
    view: 'search',
    totalSongs,
    pagination: {
      page,
      pageSize,
      totalItems: totalSongs,
      totalPages: Math.max(1, Math.ceil(totalSongs / pageSize)),
    },
  };
};

const franchiseOrderBy = (sort: LibrarySort): Prisma.FranchiseOrderByWithRelationInput => {
  if (sort === 'franchise_desc') return { name: 'desc' };
  return { name: 'asc' };
};

/** Popularity rank via SQL subquery (works before/after maxPopularity backfill). */
const countFranchisesAbovePopularity = async (
  franchiseWhere: Prisma.FranchiseWhereInput,
  songFilter: Prisma.SongWhereInput,
  minExclusive: number,
): Promise<number> => {
  const franchises = await prisma.franchise.findMany({
    where: franchiseWhere,
    select: {
      animes: {
        where: { songs: { some: songFilter } },
        select: { popularity: true },
      },
    },
  });
  return franchises.filter((f) => {
    const maxPop = f.animes.reduce((max, a) => Math.max(max, a.popularity), 0);
    return maxPop > minExclusive;
  }).length;
};

const fetchFranchiseSliceByPopularity = async (
  franchiseWhere: Prisma.FranchiseWhereInput,
  songFilter: Prisma.SongWhereInput,
  skip: number,
  take: number,
): Promise<FranchiseRow[]> => {
  if (take <= 0) return [];

  const franchises = await prisma.franchise.findMany({
    where: franchiseWhere,
    select: {
      id: true,
      name: true,
      genres: true,
      animes: {
        where: { songs: { some: songFilter } },
        select: { popularity: true },
      },
    },
  });

  const ranked = franchises.filter((f) => f.animes.length > 0);
  ranked.sort((a, b) => {
    const maxA = Math.max(...a.animes.map((x) => x.popularity), 0);
    const maxB = Math.max(...b.animes.map((x) => x.popularity), 0);
    return maxB - maxA || a.name.localeCompare(b.name, 'fr');
  });

  return ranked.slice(skip, skip + take).map(({ id, name, genres }) => ({ id, name, genres }));
};

const computeOrphanRank = async (
  sort: LibrarySort,
  songFilter: Prisma.SongWhereInput,
  franchiseWhere: Prisma.FranchiseWhereInput,
): Promise<number> => {
  const orphanAgg = await prisma.anime.aggregate({
    where: { franchiseId: null, songs: { some: songFilter } },
    _max: { popularity: true },
  });
  const orphanMaxPop = orphanAgg._max.popularity ?? 0;

  if (sort === 'popularity') {
    return countFranchisesAbovePopularity(franchiseWhere, songFilter, orphanMaxPop);
  }
  if (sort === 'franchise_desc') {
    return prisma.franchise.count({
      where: { ...franchiseWhere, name: { gt: ORPHAN_FRANCHISE_LABEL } },
    });
  }
  return prisma.franchise.count({
    where: { ...franchiseWhere, name: { lt: ORPHAN_FRANCHISE_LABEL } },
  });
};

const fetchFranchiseSlice = async (
  franchiseWhere: Prisma.FranchiseWhereInput,
  songFilter: Prisma.SongWhereInput,
  sort: LibrarySort,
  skip: number,
  take: number,
): Promise<FranchiseRow[]> => {
  if (sort === 'popularity') {
    return fetchFranchiseSliceByPopularity(franchiseWhere, songFilter, skip, take);
  }
  if (take <= 0) return [];
  return prisma.franchise.findMany({
    where: franchiseWhere,
    orderBy: franchiseOrderBy(sort),
    skip,
    take,
    select: { id: true, name: true, genres: true },
  });
};

const buildFranchiseGroupsBatch = async (
  franchiseRows: FranchiseRow[],
  includeOrphan: boolean,
  songFilter: Prisma.SongWhereInput,
  sort: LibrarySort,
  discovered: Set<number>,
): Promise<LibraryFranchiseGroup[]> => {
  const franchiseIds = franchiseRows.map((f) => f.id);
  const animeOr: Prisma.AnimeWhereInput[] = [];
  if (franchiseIds.length) animeOr.push({ franchiseId: { in: franchiseIds } });
  if (includeOrphan) animeOr.push({ franchiseId: null });
  if (!animeOr.length) return [];

  const animes = await prisma.anime.findMany({
    where: { OR: animeOr, songs: { some: songFilter } },
    orderBy: animeOrderBy(sort),
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
    },
  });
  if (!animes.length) return [];

  const songs = await prisma.song.findMany({
    where: { animeId: { in: animes.map((a) => a.id) }, ...songFilter },
    orderBy: [{ songType: 'asc' }, { sequence: 'asc' }],
    select: songSelect,
  });

  const songsByAnime = new Map<number, LibrarySong[]>();
  for (const row of songs) {
    const mapped = mapLibrarySong(row, discovered.has(row.id));
    const list = songsByAnime.get(row.anime.id) ?? [];
    list.push(mapped);
    songsByAnime.set(row.anime.id, list);
  }

  const animesByFranchise = new Map<number | 'orphan', LibraryAnimeGroup[]>();
  for (const anime of animes) {
    const animeSongs = songsByAnime.get(anime.id) ?? [];
    if (!animeSongs.length) continue;
    const key: number | 'orphan' = anime.franchiseId ?? 'orphan';
    const group: LibraryAnimeGroup = {
      id: anime.id,
      name: anime.name,
      coverImage: anime.coverImage,
      coverColor: anime.coverColor,
      seasonYear: anime.seasonYear,
      format: anime.format,
      siteUrl: anime.siteUrl,
      popularity: anime.popularity,
      songs: animeSongs,
    };
    const list = animesByFranchise.get(key) ?? [];
    list.push(group);
    animesByFranchise.set(key, list);
  }

  const groups: LibraryFranchiseGroup[] = [];

  if (includeOrphan) {
    const orphanAnimes = animesByFranchise.get('orphan') ?? [];
    if (orphanAnimes.length) {
      const orphanGroup: LibraryFranchiseGroup = {
        id: null,
        name: ORPHAN_FRANCHISE_LABEL,
        genres: [],
        animes: orphanAnimes,
        songCount: 0,
      };
      orphanGroup.songCount = countSongsInGroup(orphanGroup);
      groups.push(orphanGroup);
    }
  }

  for (const fr of franchiseRows) {
    const frAnimes = animesByFranchise.get(fr.id) ?? [];
    if (!frAnimes.length) continue;
    const group: LibraryFranchiseGroup = {
      id: fr.id,
      name: fr.name,
      genres: fr.genres,
      animes: frAnimes,
      songCount: 0,
    };
    group.songCount = countSongsInGroup(group);
    groups.push(group);
  }

  return groups;
};

/** Hierarchical browse: franchise rows paginated, animes + songs nested (batched queries). */
export const browseLibraryTree = async (
  opts: LibraryBrowseParams,
  userId?: string | null,
): Promise<LibraryTreeResponse> => {
  const q = opts.q?.trim();
  if (q) return browseLibrarySearchTree(opts, userId);

  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const pageSize = Math.min(
    Math.max(1, Math.floor(opts.pageSize ?? TREE_PAGE_SIZE)),
    MAX_PAGE_SIZE,
  );
  const sort = opts.sort ?? 'franchise';
  const songFilter = await buildSongFilter(opts, userId);

  const franchiseWhere: Prisma.FranchiseWhereInput = {
    animes: { some: { songs: { some: songFilter } } },
  };

  const orphanAnimeWhere: Prisma.AnimeWhereInput = {
    franchiseId: null,
    songs: { some: songFilter },
  };

  const [orphanCount, franchiseTotal, totalSongs, orphanRank] = await Promise.all([
    prisma.anime.count({ where: orphanAnimeWhere }),
    prisma.franchise.count({ where: franchiseWhere }),
    prisma.song.count({ where: songFilter }),
    prisma.anime.count({ where: orphanAnimeWhere }).then(async (count) =>
      count > 0 ? computeOrphanRank(sort, songFilter, franchiseWhere) : -1,
    ),
  ]);

  const hasOrphan = orphanCount > 0;
  const totalGroups = franchiseTotal + (hasOrphan ? 1 : 0);
  const totalPages = Math.max(1, Math.ceil(totalGroups / pageSize));
  const start = (page - 1) * pageSize;

  let franchiseSkip = start;
  if (hasOrphan && start > orphanRank) franchiseSkip -= 1;

  let franchiseTake = pageSize;
  let includeOrphan = false;
  if (hasOrphan && start <= orphanRank && start + pageSize > orphanRank) {
    includeOrphan = true;
    franchiseTake -= 1;
  }

  const franchises = await fetchFranchiseSlice(
    franchiseWhere,
    songFilter,
    sort,
    franchiseSkip,
    franchiseTake,
  );

  const groups = await buildFranchiseGroupsBatch(
    franchises,
    includeOrphan,
    songFilter,
    sort,
    new Set(),
  );

  if (userId && groups.length) {
    try {
      const songIds = groups.flatMap((g) => g.animes.flatMap((a) => a.songs.map((s) => s.id)));
      const flags = await resolveUserSongFlags(userId, songIds);
      applyDiscoveredToGroups(groups, flags.discovered);
      applyLikedToGroups(groups, flags.liked);
    } catch (e) {
      logger.warn('[Library] Failed to resolve user song flags for tree', 'Library', e);
    }
  }

  return {
    groups,
    view: 'tree',
    pagination: {
      page,
      pageSize,
      totalItems: totalGroups,
      totalPages,
    },
    totalSongs,
  };
};
