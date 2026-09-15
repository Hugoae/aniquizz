import {
  prisma,
  Prisma,
  type Difficulty,
  type DownloadStatus,
  type SongType,
} from '@aniquizz/database';
import { invalidateChoiceCandidates } from '../game/gameService';
import {
  catalogueRepairSortRank,
  collectCatalogueRepairReasons,
  type CatalogueRepairReason,
} from './catalogueRepair';

/**
 * Admin catalogue reads and mutations.
 */

const clampLimit = (limit: number | undefined, fallback = 50, max = 200): number => {
  if (!limit || Number.isNaN(limit)) return fallback;
  return Math.min(Math.max(1, Math.floor(limit)), max);
};

export const listSongs = async (opts: {
  query?: string;
  status?: DownloadStatus;
  limit?: number;
}) => {
  const where: Prisma.SongWhereInput = {};
  if (opts.status) where.downloadStatus = opts.status;
  if (opts.query) {
    where.OR = [
      { title: { contains: opts.query, mode: 'insensitive' } },
      { artist: { contains: opts.query, mode: 'insensitive' } },
      { anime: { name: { contains: opts.query, mode: 'insensitive' } } },
    ];
  }

  return prisma.song.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: clampLimit(opts.limit),
    select: {
      id: true,
      title: true,
      artist: true,
      songType: true,
      sequence: true,
      difficulty: true,
      downloadStatus: true,
      isLocked: true,
      errorLog: true,
      videoKey: true,
      updatedAt: true,
      anime: { select: { id: true, name: true } },
    },
  });
};

// --- CATALOGUE TREE (Franchise -> Anime -> Song) ----------------------------

const CATALOGUE_PAGE_SIZE = 20;

const songSelect = {
  id: true,
  title: true,
  artist: true,
  songType: true,
  sequence: true,
  videoKey: true,
  sourceUrl: true,
  duration: true,
  difficulty: true,
  episodeRange: true,
  tags: true,
  isLocked: true,
  downloadStatus: true,
  errorLog: true,
  animeId: true,
  updatedAt: true,
} satisfies Prisma.SongSelect;

const animeSelect = {
  id: true,
  name: true,
  altNames: true,
  siteUrl: true,
  studio: true,
  coverImage: true,
  popularity: true,
  tags: true,
  format: true,
  status: true,
  seasonYear: true,
  franchiseId: true,
  isLocked: true,
} satisfies Prisma.AnimeSelect;

type CatalogueSongRow = Prisma.SongGetPayload<{ select: typeof songSelect }>;
type CatalogueAnimeRow = Prisma.AnimeGetPayload<{ select: typeof animeSelect }> & {
  songs: CatalogueSongRow[];
};

export interface CatalogueTreeOpts {
  query?: string;
  page?: number;
  pageSize?: number;
  status?: DownloadStatus;
  difficulty?: Difficulty;
  /** Filter franchises by lock state. Undefined = no filter. */
  locked?: boolean;
  /** Jump the tree to the franchise/anime that owns this song (repair-queue click). */
  songId?: number;
}

const escapeIlike = (raw: string): string => raw.replace(/[%_\\]/g, '\\$&');

/** Prisma has no case-insensitive `contains` on String[]; use unnest + ILIKE. */
const animeIdsMatchingAltNames = async (q: string): Promise<number[]> => {
  const pattern = `%${escapeIlike(q)}%`;
  const rows = await prisma.$queryRaw<{ id: number }[]>`
    SELECT DISTINCT a.id
    FROM "Anime" a
    WHERE EXISTS (
      SELECT 1 FROM unnest(a."altNames") AS t(alt)
      WHERE t.alt ILIKE ${pattern}
    )
  `;
  return rows.map((r) => r.id);
};

const songTextMatch = (q: string): Prisma.SongWhereInput => ({
  OR: [
    { title: { contains: q, mode: 'insensitive' } },
    { artist: { contains: q, mode: 'insensitive' } },
  ],
});

/** Anime matches search by own name, franchise, altNames, or owned song title/artist. */
const buildAnimeTextFilter = (q: string, altNameIds: number[]): Prisma.AnimeWhereInput => {
  const or: Prisma.AnimeWhereInput[] = [
    { name: { contains: q, mode: 'insensitive' } },
    { franchise: { name: { contains: q, mode: 'insensitive' } } },
    { songs: { some: songTextMatch(q) } },
  ];
  if (altNameIds.length) or.push({ id: { in: altNameIds } });
  return { OR: or };
};

/**
 * Songs shown under a matched anime:
 * - identity hit (name / franchise / altNames) → all songs (status/difficulty filters only)
 * - song-title/artist hit only → only matching songs
 */
const buildSongFilter = (
  q: string | undefined,
  status: DownloadStatus | undefined,
  difficulty: Difficulty | undefined,
  altNameIds: number[],
): Prisma.SongWhereInput => {
  const base: Prisma.SongWhereInput = {
    ...(status ? { downloadStatus: status } : {}),
    ...(difficulty ? { difficulty } : {}),
  };
  if (!q) return base;

  const or: Prisma.SongWhereInput[] = [
    { title: { contains: q, mode: 'insensitive' } },
    { artist: { contains: q, mode: 'insensitive' } },
    { anime: { name: { contains: q, mode: 'insensitive' } } },
    { anime: { franchise: { name: { contains: q, mode: 'insensitive' } } } },
  ];
  if (altNameIds.length) or.push({ animeId: { in: altNameIds } });
  return { ...base, OR: or };
};

/** One anime query + one song query for the whole page (no per-franchise N+1). */
const batchLoadAnimesWithSongs = async (
  animeWhere: Prisma.AnimeWhereInput,
  songFilter: Prisma.SongWhereInput,
): Promise<CatalogueAnimeRow[]> => {
  const animes = await prisma.anime.findMany({
    where: animeWhere,
    orderBy: { name: 'asc' },
    select: animeSelect,
  });
  if (!animes.length) return [];

  const songs = await prisma.song.findMany({
    where: { animeId: { in: animes.map((a) => a.id) }, ...songFilter },
    orderBy: [{ songType: 'asc' }, { sequence: 'asc' }],
    select: songSelect,
  });

  const byAnime = new Map<number, CatalogueSongRow[]>();
  for (const s of songs) {
    const list = byAnime.get(s.animeId) ?? [];
    list.push(s);
    byAnime.set(s.animeId, list);
  }
  return animes.map((a) => ({ ...a, songs: byAnime.get(a.id) ?? [] }));
};

const catalogueCounts = () =>
  Promise.all([
    prisma.franchise.count(),
    prisma.anime.count(),
    prisma.song.count(),
    prisma.song.count({ where: { downloadStatus: 'COMPLETED' } }),
  ]);

const catalogueTreeForSong = async (songId: number) => {
  const song = await prisma.song.findUnique({
    where: { id: songId },
    select: { animeId: true, anime: { select: { franchiseId: true } } },
  });
  const [totalFranchises, totalAnimes, totalSongs, completedSongs] = await catalogueCounts();
  const counts = {
    franchises: totalFranchises,
    animes: totalAnimes,
    songs: totalSongs,
    completedSongs,
  };
  const empty = {
    groups: [] as Array<{
      id: number | null;
      name: string;
      genres: string[];
      isLocked: boolean;
      animes: CatalogueAnimeRow[];
    }>,
    pagination: { page: 1, pageSize: 1, totalGroups: 0, totalPages: 1 },
    counts,
  };
  if (!song) return empty;

  const franchiseId = song.anime.franchiseId;
  if (franchiseId === null) {
    const animes = await batchLoadAnimesWithSongs({ id: song.animeId }, {});
    return {
      groups: [{ id: null, name: 'Sans franchise', genres: [], isLocked: false, animes }],
      pagination: { page: 1, pageSize: 1, totalGroups: 1, totalPages: 1 },
      counts,
    };
  }

  const fr = await prisma.franchise.findUnique({
    where: { id: franchiseId },
    select: { id: true, name: true, genres: true, isLocked: true },
  });
  if (!fr) return empty;
  const animes = await batchLoadAnimesWithSongs({ franchiseId }, {});
  return {
    groups: [{ id: fr.id, name: fr.name, genres: fr.genres, isLocked: fr.isLocked, animes }],
    pagination: { page: 1, pageSize: 1, totalGroups: 1, totalPages: 1 },
    counts,
  };
};

export const catalogueTree = async (opts: CatalogueTreeOpts) => {
  if (opts.songId && Number.isFinite(opts.songId) && opts.songId > 0) {
    return catalogueTreeForSong(opts.songId);
  }
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const pageSize = Math.min(Math.max(1, Math.floor(opts.pageSize ?? CATALOGUE_PAGE_SIZE)), 100);
  const q = opts.query?.trim() || undefined;
  const altNameIds = q ? await animeIdsMatchingAltNames(q) : [];

  const animeTextFilter = q ? buildAnimeTextFilter(q, altNameIds) : undefined;
  const songFilter = buildSongFilter(q, opts.status, opts.difficulty, altNameIds);

  const franchiseWhere: Prisma.FranchiseWhereInput = {
    animes: { some: animeTextFilter ?? {} },
    ...(opts.locked !== undefined ? { isLocked: opts.locked } : {}),
  };
  const orphanAnimeWhere: Prisma.AnimeWhereInput = {
    franchiseId: null,
    ...(animeTextFilter ?? {}),
  };

  const [orphanCountRaw, franchiseTotal] = await Promise.all([
    prisma.anime.count({ where: orphanAnimeWhere }),
    prisma.franchise.count({ where: franchiseWhere }),
  ]);
  // The "Sans franchise" bucket has no lock state, so hide it when filtering by lock.
  const orphanCount = opts.locked !== undefined ? 0 : orphanCountRaw;
  const hasOrphan = orphanCount > 0;
  const orphanOffset = hasOrphan ? 1 : 0;
  const totalGroups = franchiseTotal + orphanOffset;
  const totalPages = Math.max(1, Math.ceil(totalGroups / pageSize));

  const start = (page - 1) * pageSize;
  const groups: Array<{
    id: number | null;
    name: string;
    genres: string[];
    isLocked: boolean;
    animes: CatalogueAnimeRow[];
  }> = [];

  let franchiseSkip = start;
  let franchiseTake = pageSize;
  let includeOrphan = false;

  if (hasOrphan) {
    if (start === 0) {
      includeOrphan = true;
      franchiseSkip = 0;
      franchiseTake = pageSize - 1;
    } else {
      franchiseSkip = start - 1;
    }
  }

  const franchises =
    franchiseTake > 0
      ? await prisma.franchise.findMany({
          where: franchiseWhere,
          orderBy: { name: 'asc' },
          skip: franchiseSkip,
          take: franchiseTake,
          select: { id: true, name: true, genres: true, isLocked: true },
        })
      : [];

  const franchiseIds = franchises.map((f) => f.id);
  const animeClauses: Prisma.AnimeWhereInput[] = [];
  if (includeOrphan) animeClauses.push(orphanAnimeWhere);
  if (franchiseIds.length) {
    animeClauses.push({ franchiseId: { in: franchiseIds }, ...(animeTextFilter ?? {}) });
  }

  const animesByFranchise = new Map<number | null, CatalogueAnimeRow[]>();
  if (animeClauses.length) {
    const loaded = await batchLoadAnimesWithSongs({ OR: animeClauses }, songFilter);
    for (const anime of loaded) {
      const key = anime.franchiseId;
      const list = animesByFranchise.get(key) ?? [];
      list.push(anime);
      animesByFranchise.set(key, list);
    }
  }

  if (includeOrphan) {
    groups.push({
      id: null,
      name: 'Sans franchise',
      genres: [],
      isLocked: false,
      animes: animesByFranchise.get(null) ?? [],
    });
  }
  for (const fr of franchises) {
    groups.push({
      id: fr.id,
      name: fr.name,
      genres: fr.genres,
      isLocked: fr.isLocked,
      animes: animesByFranchise.get(fr.id) ?? [],
    });
  }

  const [totalFranchises, totalAnimes, totalSongs, completedSongs] = await catalogueCounts();

  return {
    groups,
    pagination: { page, pageSize, totalGroups, totalPages },
    counts: {
      franchises: totalFranchises,
      animes: totalAnimes,
      songs: totalSongs,
      completedSongs,
    },
  };
};

const REPAIR_FETCH_CAP = 400;
const REPAIR_RETURN_CAP = 80;

export interface CatalogueRepairSong {
  id: number;
  title: string;
  artist: string;
  songType: string;
  sequence: number;
  downloadStatus: DownloadStatus;
  isLocked: boolean;
  errorLog: string | null;
  videoKey: string;
  updatedAt: Date;
  reasons: CatalogueRepairReason[];
  anime: { id: number; name: string; isLocked: boolean };
  franchise: { id: number; name: string; isLocked: boolean } | null;
}

export const listCatalogueRepair = async (): Promise<{
  songs: CatalogueRepairSong[];
  truncated: boolean;
}> => {
  const rows = await prisma.song.findMany({
    where: {
      OR: [
        { downloadStatus: 'ERROR' },
        { downloadStatus: { in: ['PENDING', 'PROCESSING', 'SKIPPED'] } },
        {
          isLocked: false,
          OR: [{ anime: { isLocked: true } }, { anime: { franchise: { isLocked: true } } }],
        },
      ],
    },
    take: REPAIR_FETCH_CAP,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      artist: true,
      songType: true,
      sequence: true,
      downloadStatus: true,
      isLocked: true,
      errorLog: true,
      videoKey: true,
      updatedAt: true,
      anime: {
        select: {
          id: true,
          name: true,
          isLocked: true,
          franchise: { select: { id: true, name: true, isLocked: true } },
        },
      },
    },
  });

  const songs = rows
    .map((row) => {
      const reasons = collectCatalogueRepairReasons({
        downloadStatus: row.downloadStatus,
        isLocked: row.isLocked,
        animeLocked: row.anime.isLocked,
        franchiseLocked: row.anime.franchise?.isLocked ?? false,
      });
      return { row, reasons };
    })
    .filter((item) => item.reasons.length > 0)
    .sort((a, b) => {
      const rank = catalogueRepairSortRank(a.reasons) - catalogueRepairSortRank(b.reasons);
      if (rank !== 0) return rank;
      return b.row.updatedAt.getTime() - a.row.updatedAt.getTime();
    })
    .slice(0, REPAIR_RETURN_CAP)
    .map(({ row, reasons }) => ({
      id: row.id,
      title: row.title,
      artist: row.artist,
      songType: row.songType,
      sequence: row.sequence,
      downloadStatus: row.downloadStatus,
      isLocked: row.isLocked,
      errorLog: row.errorLog,
      videoKey: row.videoKey,
      updatedAt: row.updatedAt,
      reasons,
      anime: { id: row.anime.id, name: row.anime.name, isLocked: row.anime.isLocked },
      franchise: row.anime.franchise,
    }));

  return { songs, truncated: rows.length >= REPAIR_FETCH_CAP };
};

// --- CATALOGUE MUTATIONS ----------------------------------------------------

export interface SongWriteInput {
  title?: string;
  artist?: string;
  songType?: SongType;
  sequence?: number;
  videoKey?: string;
  sourceUrl?: string | null;
  duration?: number | null;
  difficulty?: Difficulty;
  downloadStatus?: DownloadStatus;
  isLocked?: boolean;
  tags?: string[];
  episodeRange?: string | null;
  animeId?: number;
}

export const updateSong = (id: number, data: SongWriteInput) =>
  prisma.song.update({ where: { id }, data, select: songSelect });

export const createSong = (
  data: SongWriteInput & {
    title: string;
    artist: string;
    songType: SongType;
    videoKey: string;
    animeId: number;
  },
) =>
  prisma.song.create({
    data: {
      title: data.title,
      artist: data.artist,
      songType: data.songType,
      sequence: data.sequence ?? 1,
      videoKey: data.videoKey,
      sourceUrl: data.sourceUrl ?? null,
      duration: data.duration ?? null,
      difficulty: data.difficulty ?? 'MEDIUM',
      downloadStatus: data.downloadStatus ?? 'PENDING',
      isLocked: data.isLocked ?? false,
      tags: data.tags ?? [],
      episodeRange: data.episodeRange ?? null,
      animeId: data.animeId,
    },
    select: songSelect,
  });

export const deleteSong = (id: number) => prisma.song.delete({ where: { id } });

export const bulkUpdateSongs = (
  ids: number[],
  data: { difficulty?: Difficulty; downloadStatus?: DownloadStatus; isLocked?: boolean },
) => prisma.song.updateMany({ where: { id: { in: ids } }, data });

export interface AnimeWriteInput {
  name?: string;
  altNames?: string[];
  siteUrl?: string | null;
  studio?: string | null;
  coverImage?: string | null;
  popularity?: number;
  tags?: string[];
  format?: string | null;
  status?: string | null;
  seasonYear?: number | null;
  franchiseId?: number | null;
  isLocked?: boolean;
}

export const updateAnime = async (id: number, data: AnimeWriteInput) => {
  const res = await prisma.anime.update({ where: { id }, data, select: animeSelect });
  invalidateChoiceCandidates();
  return res;
};

export const createAnime = async (data: AnimeWriteInput & { name: string }) => {
  const res = await prisma.anime.create({
    data: {
      name: data.name,
      altNames: data.altNames ?? [],
      siteUrl: data.siteUrl ?? null,
      studio: data.studio ?? null,
      coverImage: data.coverImage ?? null,
      popularity: data.popularity ?? 0,
      tags: data.tags ?? [],
      format: data.format ?? null,
      status: data.status ?? null,
      seasonYear: data.seasonYear ?? null,
      franchiseId: data.franchiseId ?? null,
      isLocked: data.isLocked ?? false,
    },
    select: animeSelect,
  });
  invalidateChoiceCandidates();
  return res;
};

export const deleteAnime = async (id: number) => {
  const res = await prisma.anime.delete({ where: { id } });
  invalidateChoiceCandidates();
  return res;
};

export interface FranchiseWriteInput {
  name?: string;
  genres?: string[];
  isLocked?: boolean;
}

export const updateFranchise = async (id: number, data: FranchiseWriteInput) => {
  const res = await prisma.franchise.update({
    where: { id },
    data,
    select: { id: true, name: true, genres: true, isLocked: true },
  });
  invalidateChoiceCandidates();
  return res;
};

export const createFranchise = async (data: FranchiseWriteInput & { name: string }) => {
  const res = await prisma.franchise.create({
    data: { name: data.name, genres: data.genres ?? [], isLocked: data.isLocked ?? false },
    select: { id: true, name: true, genres: true, isLocked: true },
  });
  invalidateChoiceCandidates();
  return res;
};

export const deleteFranchise = async (id: number) => {
  const res = await prisma.franchise.delete({ where: { id } });
  invalidateChoiceCandidates();
  return res;
};
