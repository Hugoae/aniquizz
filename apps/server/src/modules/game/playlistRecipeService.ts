import { Prisma, type SongType, type Difficulty } from '@aniquizz/database';
import { prisma } from '@aniquizz/database';
import {
  hasPlaylistSource,
  intersectPlaylistSongIds,
  playlistSourceIds,
  primaryPackStaleDropped,
  publishedPlaylistSourceError,
  type PlaylistRecipe,
  type PlaylistSongType,
} from '@aniquizz/shared';
import { playlistMembershipAnd } from './playlistQuery';

const SONG_TYPES: PlaylistSongType[] = ['OP', 'ED'];
const DIFFICULTIES: Difficulty[] = ['EASY', 'MEDIUM', 'HARD'];

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length > 0) : [];

const asIntArray = (value: unknown): number[] =>
  Array.isArray(value)
    ? value.filter((item): item is number => Number.isInteger(item) && item > 0)
    : [];

export const parsePlaylistRecipe = (raw: unknown): PlaylistRecipe => {
  if (!raw || typeof raw !== 'object') return {};
  const o = raw as Record<string, unknown>;
  const songTypes = asStringArray(o.songTypes).filter((t): t is PlaylistSongType =>
    SONG_TYPES.includes(t as PlaylistSongType),
  );
  const difficulties = asStringArray(o.difficulties).filter((d): d is Difficulty =>
    DIFFICULTIES.includes(d as Difficulty),
  );
  const recipe: PlaylistRecipe = {};
  const genres = asStringArray(o.genres);
  const tags = asStringArray(o.tags);
  const formats = asStringArray(o.formats);
  if (genres.length) recipe.genres = genres;
  if (tags.length) recipe.tags = tags;
  if (formats.length) recipe.formats = formats;
  if (songTypes.length) recipe.songTypes = songTypes;
  if (difficulties.length) recipe.difficulties = difficulties;
  if (typeof o.yearMin === 'number' && Number.isFinite(o.yearMin)) recipe.yearMin = Math.trunc(o.yearMin);
  if (typeof o.yearMax === 'number' && Number.isFinite(o.yearMax)) recipe.yearMax = Math.trunc(o.yearMax);
  const includeSongIds = asIntArray(o.includeSongIds);
  const excludeSongIds = asIntArray(o.excludeSongIds);
  if (includeSongIds.length) recipe.includeSongIds = includeSongIds;
  if (excludeSongIds.length) recipe.excludeSongIds = excludeSongIds;
  return recipe;
};

const buildDimensionFilters = (recipe: PlaylistRecipe): Prisma.SongWhereInput[] => {
  const and: Prisma.SongWhereInput[] = [];
  if (recipe.genres?.length) {
    and.push({ anime: { franchise: { genres: { hasSome: recipe.genres } } } });
  }
  if (recipe.tags?.length) {
    and.push({ tags: { hasSome: recipe.tags } });
  }
  if (recipe.yearMin != null || recipe.yearMax != null) {
    and.push({
      anime: {
        seasonYear: {
          ...(recipe.yearMin != null ? { gte: recipe.yearMin } : {}),
          ...(recipe.yearMax != null ? { lte: recipe.yearMax } : {}),
        },
      },
    });
  }
  if (recipe.formats?.length) {
    and.push({ anime: { format: { in: recipe.formats } } });
  }
  if (recipe.songTypes?.length) {
    and.push({ songType: { in: recipe.songTypes as SongType[] } });
  }
  if (recipe.difficulties?.length) {
    and.push({ difficulty: { in: recipe.difficulties as Difficulty[] } });
  }
  return and;
};

/** (dimensions OR includeSongIds) AND NOT excludeSongIds AND COMPLETED. */
export const buildPlaylistMembershipWhere = (recipe: PlaylistRecipe): Prisma.SongWhereInput => {
  const dimensions = buildDimensionFilters(recipe);
  const and: Prisma.SongWhereInput[] = [{ downloadStatus: 'COMPLETED' }];
  if (recipe.includeSongIds?.length) {
    and.push({
      OR: [
        dimensions.length ? { AND: dimensions } : {},
        { id: { in: recipe.includeSongIds } },
      ],
    });
  } else if (dimensions.length) {
    and.push(...dimensions);
  }
  if (recipe.excludeSongIds?.length) {
    and.push({ id: { notIn: recipe.excludeSongIds } });
  }
  return { AND: and };
};

export const resolvePlaylistRecipeSongIds = async (recipe: PlaylistRecipe): Promise<number[]> => {
  const matched = await prisma.song.findMany({
    where: buildPlaylistMembershipWhere(recipe),
    select: { id: true },
  });
  return matched.map((row) => row.id);
};

export interface PlaylistRecipePreview {
  songCount: number;
  yearBreakdown: Array<{ year: number; count: number }>;
  typeBreakdown: { OP: number; ED: number };
}

export const previewPlaylistRecipe = async (recipe: PlaylistRecipe): Promise<PlaylistRecipePreview> => {
  const songs = await prisma.song.findMany({
    where: buildPlaylistMembershipWhere(recipe),
    select: {
      songType: true,
      anime: { select: { seasonYear: true } },
    },
  });
  if (!songs.length) {
    return { songCount: 0, yearBreakdown: [], typeBreakdown: { OP: 0, ED: 0 } };
  }

  const years = new Map<number, number>();
  const typeBreakdown = { OP: 0, ED: 0 };
  for (const song of songs) {
    if (song.songType === 'OP') typeBreakdown.OP += 1;
    if (song.songType === 'ED') typeBreakdown.ED += 1;
    const year = song.anime.seasonYear;
    if (year != null) years.set(year, (years.get(year) ?? 0) + 1);
  }

  return {
    songCount: songs.length,
    yearBreakdown: [...years.entries()]
      .sort(([a], [b]) => a - b)
      .map(([year, count]) => ({ year, count })),
    typeBreakdown,
  };
};

export const refreshPlaylistSnapshot = async (playlistId: string, publish: boolean): Promise<number> => {
  const pack = await prisma.thematicPlaylist.findUniqueOrThrow({ where: { id: playlistId } });
  const recipe = parsePlaylistRecipe(pack.recipe);
  const songIds = await resolvePlaylistRecipeSongIds(recipe);

  await prisma.$transaction([
    prisma.thematicPlaylistSong.deleteMany({ where: { playlistId } }),
    ...(songIds.length
      ? [
          prisma.thematicPlaylistSong.createMany({
            data: songIds.map((songId) => ({ playlistId, songId })),
            skipDuplicates: true,
          }),
        ]
      : []),
    prisma.thematicPlaylist.update({
      where: { id: playlistId },
      data: {
        snapshotAt: new Date(),
        snapshotCount: songIds.length,
        ...(publish ? { isPublished: true } : {}),
      },
    }),
  ]);

  invalidatePlaylistSnapshotCache(playlistId);
  return songIds.length;
};

interface CachedPackMeta {
  snapshotAtMs: number;
  isPublished: boolean;
  snapshotCount: number;
  liveCompleted: number;
  fetchedAt: number;
}

const PACK_META_TTL_MS = 30_000;
const packMetaCache = new Map<string, CachedPackMeta>();

export const invalidatePlaylistSnapshotCache = (playlistId?: string): void => {
  if (!playlistId) packMetaCache.clear();
  else packMetaCache.delete(playlistId);
};

const loadPackMeta = async (playlistId: string): Promise<CachedPackMeta | null> => {
  const cached = packMetaCache.get(playlistId);
  const now = Date.now();

  const loaded = await prisma.$transaction(async (tx) => {
    const pack = await tx.thematicPlaylist.findUnique({
      where: { id: playlistId },
      select: { isPublished: true, snapshotCount: true, snapshotAt: true },
    });
    if (!pack) return null;
    const snapshotAtMs = pack.snapshotAt?.getTime() ?? 0;
    if (
      cached &&
      cached.snapshotAtMs === snapshotAtMs &&
      cached.isPublished === pack.isPublished &&
      cached.snapshotCount === pack.snapshotCount &&
      now - cached.fetchedAt < PACK_META_TTL_MS
    ) {
      return cached;
    }
    const liveCompleted = await tx.thematicPlaylistSong.count({
      where: { playlistId, song: { downloadStatus: 'COMPLETED' } },
    });
    return {
      snapshotAtMs,
      isPublished: pack.isPublished,
      snapshotCount: pack.snapshotCount,
      liveCompleted,
      fetchedAt: now,
    } satisfies CachedPackMeta;
  });

  if (!loaded) {
    packMetaCache.delete(playlistId);
    return null;
  }
  packMetaCache.set(playlistId, loaded);
  return loaded;
};

/** Published pack ids + counts without materializing snapshot song ids. */
export interface PlaylistPoolScope {
  playlistIds: string[];
  snapshotCount: number;
  liveCount: number;
  staleDropped: number;
  isPublished: true;
}

export const loadPlaylistPoolScope = async (ids: string[]): Promise<PlaylistPoolScope | null> => {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return null;
  const metas = await Promise.all(unique.map((id) => loadPackMeta(id)));
  if (metas.some((meta) => !meta || !meta.isPublished)) return null;

  const liveCount =
    unique.length === 1
      ? metas[0]!.liveCompleted
      : await prisma.song.count({
          where: {
            downloadStatus: 'COMPLETED',
            AND: playlistMembershipAnd(unique),
          },
        });

  return {
    playlistIds: unique,
    snapshotCount: unique.length === 1 ? metas[0]!.snapshotCount : liveCount,
    liveCount,
    staleDropped: primaryPackStaleDropped(
      metas.map((meta) => ({
        snapshotCount: meta!.snapshotCount,
        liveCompleted: meta!.liveCompleted,
      })),
    ),
    isPublished: true,
  };
};

export interface PlaylistSnapshot {
  playlistId: string;
  songIds: number[];
  animeIds: number[];
  songs: { songId: number; animeId: number }[];
  snapshotCount: number;
  staleDropped: number;
  isPublished: boolean;
}

export const loadPublishedPlaylistSnapshot = async (
  playlistId: string,
): Promise<PlaylistSnapshot | null> => {
  return prisma.$transaction(async (tx) => {
    const pack = await tx.thematicPlaylist.findUnique({
      where: { id: playlistId },
      select: { id: true, isPublished: true, snapshotCount: true },
    });
    if (!pack) return null;

    const rows = await tx.thematicPlaylistSong.findMany({
      where: { playlistId, song: { downloadStatus: 'COMPLETED' } },
      select: { songId: true, song: { select: { animeId: true } } },
    });

    const songs = rows.map((row) => ({ songId: row.songId, animeId: row.song.animeId }));
    const songIds = songs.map((row) => row.songId);
    return {
      playlistId: pack.id,
      songIds,
      animeIds: [...new Set(songs.map((row) => row.animeId))],
      songs,
      snapshotCount: pack.snapshotCount,
      staleDropped: Math.max(0, pack.snapshotCount - songIds.length),
      isPublished: pack.isPublished,
    };
  });
};

export const combinePlaylistSnapshots = (snaps: PlaylistSnapshot[]): PlaylistSnapshot | null => {
  if (!snaps.length || snaps.some((snap) => !snap.isPublished)) return null;
  const primary = snaps[0];
  if (!primary) return null;
  const songIds = intersectPlaylistSongIds(snaps.map((snap) => snap.songIds));
  const keep = new Set(songIds);
  const songs = primary.songs.filter((row) => keep.has(row.songId));
  return {
    playlistId: primary.playlistId,
    songIds,
    animeIds: [...new Set(songs.map((row) => row.animeId))],
    songs,
    snapshotCount: songIds.length,
    staleDropped: primary.staleDropped,
    isPublished: true,
  };
};

export const loadCombinedPlaylistSnapshot = async (
  ids: string[],
): Promise<PlaylistSnapshot | null> => {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return null;
  const snaps = await Promise.all(unique.map((id) => loadPublishedPlaylistSnapshot(id)));
  if (snaps.some((snap) => !snap)) return null;
  return combinePlaylistSnapshots(snaps as PlaylistSnapshot[]);
};

export const listPublishedPlaylists = async () =>
  prisma.thematicPlaylist.findMany({
    where: { isPublished: true, snapshotCount: { gt: 0 } },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      category: true,
      recipe: true,
      snapshotCount: true,
      snapshotAt: true,
      sortOrder: true,
    },
  });

export const assertPublishedPlaylistSource = async (settings: {
  soundSelection?: string;
  playlistId?: string | null;
  decadePlaylistId?: string | null;
}): Promise<{ ok: true } | { ok: false; reason: string }> => {
  if (settings.soundSelection !== 'playlist') return { ok: true };
  const ids = playlistSourceIds(settings);
  if (!ids.length || !hasPlaylistSource(settings)) {
    return { ok: false, reason: 'Choisissez une playlist pour lancer la partie.' };
  }
  const packs = await prisma.thematicPlaylist.findMany({
    where: { id: { in: ids } },
    select: { id: true, isPublished: true, snapshotCount: true },
  });
  const reason = publishedPlaylistSourceError(ids, packs);
  if (reason) return { ok: false, reason };
  return { ok: true };
};

