import { Prisma, prisma } from '@aniquizz/database';
import {
  DAILY_HORIZON_DAYS,
  DAILY_SONG_LOOKBACK_DAYS,
  SONG_OF_THE_DAY_EXCERPT_SECONDS,
  addCalendarDays,
  dailyCalendarDate,
  dailyResetsAt,
  formatSongTypeLabel,
  type SongOfTheDayResponse,
} from '@aniquizz/shared';
import { toPlaybackUrl } from '../../lib/mediaPlaybackUrl';
import { recordHeardSongs } from '../catalogue/songHistoryService';
import { DailyHttpError } from './dailyErrors';
import { loadPlayablePool } from './dailyPlayablePool';
import {
  mulberry32,
  pickDailyClipStart,
  pickSongOfTheDay,
  toDailySongCandidate,
} from './dailySelection';
import {
  DAILY_SONG_SELECT,
  dateFromIsoDay,
  isoDayFromDate,
  type DailySongRow,
} from './dailySnapshot';
import { songOfTheDayChangeBlock } from './songOfTheDayRules';

const FEATURED_SEED_SALT = 0x5bd1e995;

const songOfTheDaySeed = (isoDate: string): number => {
  const date = Number(isoDate.replace(/-/g, '')) || 1;
  return (date ^ FEATURED_SEED_SALT) >>> 0;
};

const isPlayable = (
  song: { downloadStatus: string; songType: string; videoKey: string } | null,
): song is { downloadStatus: string; songType: 'OP' | 'ED'; videoKey: string } => {
  if (!song) return false;
  return (
    song.downloadStatus === 'COMPLETED' &&
    song.videoKey.length > 0 &&
    (song.songType === 'OP' || song.songType === 'ED')
  );
};

async function quizSongIds(isoDate: string): Promise<Set<number>> {
  const challenge = await prisma.dailyChallenge.findUnique({
    where: { challengeDate: dateFromIsoDay(isoDate) },
    select: { rounds: { select: { songId: true } } },
  });
  return new Set(
    (challenge?.rounds ?? []).map((round) => round.songId).filter((id): id is number => id != null),
  );
}

async function recentFeaturedSongIds(isoDate: string): Promise<Set<number>> {
  const from = addCalendarDays(isoDate, -DAILY_SONG_LOOKBACK_DAYS);
  const rows = await prisma.songOfTheDay.findMany({
    where: {
      featuredDate: { gte: dateFromIsoDay(from), lt: dateFromIsoDay(isoDate) },
    },
    select: { songId: true },
  });
  return new Set(rows.map((row) => row.songId));
}

const featuredInclude = {
  song: { select: DAILY_SONG_SELECT },
} as const;

type FeaturedRow = {
  id: string;
  songId: number;
  videoStartTime: number;
  song: DailySongRow & { downloadStatus: string };
};

async function loadFeatured(isoDate: string): Promise<FeaturedRow | null> {
  const row = await prisma.songOfTheDay.findUnique({
    where: { featuredDate: dateFromIsoDay(isoDate) },
    include: featuredInclude,
  });
  return row as FeaturedRow | null;
}

async function chooseFeatured(
  isoDate: string,
  excludeSongIds: Set<number>,
): Promise<{ songId: number; videoStartTime: number } | null> {
  const pool = await loadPlayablePool();
  const candidates = pool
    .filter((row) => row.songType === 'OP' || row.songType === 'ED')
    .map(toDailySongCandidate);
  const chosen = pickSongOfTheDay({
    pool: candidates,
    rng: mulberry32(songOfTheDaySeed(isoDate)),
    excludeSongIds,
  });
  if (!chosen) return null;
  const full = pool.find((row) => row.id === chosen.songId);
  if (!full) return null;
  const videoStartTime = pickDailyClipStart(
    full.duration,
    SONG_OF_THE_DAY_EXCERPT_SECONDS,
    0,
    mulberry32((songOfTheDaySeed(isoDate) ^ 0x9e3779b9) >>> 0),
  );
  return { songId: chosen.songId, videoStartTime };
}

/**
 * One clip per Paris day. Today's quiz songs and the last 60 featured songs
 * are skipped. A row that collides with the quiz, or whose file is gone, is replaced.
 */
export async function ensureSongOfTheDay(isoDate: string): Promise<FeaturedRow | null> {
  const quizIds = await quizSongIds(isoDate);
  const current = await loadFeatured(isoDate);
  if (current && isPlayable(current.song) && !quizIds.has(current.songId)) return current;

  const exclude = await recentFeaturedSongIds(isoDate);
  for (const id of quizIds) exclude.add(id);
  if (current) exclude.add(current.songId);
  const picked = await chooseFeatured(isoDate, exclude);
  if (!picked) return null;

  if (current) {
    const updated = await prisma.songOfTheDay.update({
      where: { id: current.id },
      data: picked,
      include: featuredInclude,
    });
    return updated as FeaturedRow;
  }

  try {
    const created = await prisma.songOfTheDay.create({
      data: { featuredDate: dateFromIsoDay(isoDate), ...picked },
      include: featuredInclude,
    });
    return created as FeaturedRow;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return loadFeatured(isoDate);
    }
    throw error;
  }
}

/** Read-only id for the quiz editor. Does not create a row. */
export async function songOfTheDaySongId(isoDate: string): Promise<number | null> {
  const row = await prisma.songOfTheDay.findUnique({
    where: { featuredDate: dateFromIsoDay(isoDate) },
    select: { songId: true },
  });
  return row?.songId ?? null;
}

const toResponse = async (
  isoDate: string,
  row: FeaturedRow,
  userId: string | null,
  now: Date,
): Promise<SongOfTheDayResponse> => {
  const song = row.song;
  let heard: boolean | null = null;
  if (userId) {
    const history = await prisma.songHistory.findUnique({
      where: { profileId_songId: { profileId: userId, songId: row.songId } },
      select: { id: true },
    });
    heard = Boolean(history);
  }
  const songType = song.songType === 'ED' ? 'ED' : 'OP';
  return {
    challengeDate: isoDate,
    resetsAt: dailyResetsAt(now).toISOString(),
    excerptSeconds: SONG_OF_THE_DAY_EXCERPT_SECONDS,
    heard,
    playbackUrl: toPlaybackUrl(song.videoKey),
    videoStartTime: row.videoStartTime,
    song: {
      id: song.id,
      title: song.title,
      artist: song.artist,
      songType,
      sequence: song.sequence,
      typeLabel: formatSongTypeLabel(songType, song.sequence),
      difficulty: song.difficulty,
      animeId: song.anime.id,
      animeTitle: song.anime.name,
      seasonYear: song.anime.seasonYear,
      season: song.anime.season,
      format: song.anime.format,
      episodeRange: song.episodeRange,
      coverImage: song.anime.coverImage,
      coverColor: song.anime.coverColor,
      siteUrl: song.anime.siteUrl,
      franchise: song.anime.franchise?.name ?? null,
    },
  };
};

export async function getSongOfTheDay(
  userId: string | null,
  now = new Date(),
): Promise<SongOfTheDayResponse | null> {
  const isoDate = dailyCalendarDate(now);
  const row = await ensureSongOfTheDay(isoDate);
  if (!row || !isPlayable(row.song)) return null;
  return toResponse(isoDate, row, userId, now);
}

/** One collection mark per player. Replays do not raise the heard count. */
export async function markSongOfTheDayHeard(
  userId: string,
  now = new Date(),
): Promise<SongOfTheDayResponse> {
  const isoDate = dailyCalendarDate(now);
  const row = await ensureSongOfTheDay(isoDate);
  if (!row || !isPlayable(row.song)) {
    throw new DailyHttpError(404, 'Pas de son du jour pour le moment.');
  }
  const existing = await prisma.songHistory.findUnique({
    where: { profileId_songId: { profileId: userId, songId: row.songId } },
    select: { id: true },
  });
  if (!existing) {
    await recordHeardSongs(prisma, userId, [{ songId: row.songId, correct: false }], now);
    const written = await prisma.songHistory.findUnique({
      where: { profileId_songId: { profileId: userId, songId: row.songId } },
      select: { id: true },
    });
    if (!written) {
      throw new DailyHttpError(500, "Impossible d'enregistrer l'écoute.");
    }
  }
  const payload = await toResponse(isoDate, row, userId, now);
  return { ...payload, heard: true };
}

export interface SongOfTheDayAdminRow {
  songId: number;
  title: string;
  artist: string;
  anime: string;
  typeLabel: string;
  cover: string | null;
  videoStartTime: number;
}

const BLOCK_MESSAGE = {
  past: 'Ce jour est passé. Le son du jour ne se change plus.',
  'in-quiz': 'Ce son est déjà dans le quiz de ce jour.',
  'other-day': 'Ce son est déjà le son d’un autre jour affiché.',
} as const;

const clipStartFor = (isoDate: string, songId: number, duration: number | null): number =>
  pickDailyClipStart(
    duration,
    SONG_OF_THE_DAY_EXCERPT_SECONDS,
    0,
    mulberry32((songOfTheDaySeed(isoDate) ^ songId) >>> 0),
  );

const saveFeatured = async (isoDate: string, songId: number, videoStartTime: number) => {
  const featuredDate = dateFromIsoDay(isoDate);
  await prisma.songOfTheDay.upsert({
    where: { featuredDate },
    create: { featuredDate, songId, videoStartTime },
    update: { songId, videoStartTime },
  });
};

async function otherHorizonSongIds(isoDate: string, today: string): Promise<Set<number>> {
  const rows = await prisma.songOfTheDay.findMany({
    where: {
      featuredDate: {
        gte: dateFromIsoDay(today),
        lt: dateFromIsoDay(addCalendarDays(today, DAILY_HORIZON_DAYS)),
        not: dateFromIsoDay(isoDate),
      },
    },
    select: { songId: true },
  });
  return new Set(rows.map((row) => row.songId));
}

export async function songOfTheDayAdminRows(
  isoDates: readonly string[],
): Promise<Map<string, SongOfTheDayAdminRow>> {
  if (!isoDates.length) return new Map();
  const rows = await prisma.songOfTheDay.findMany({
    where: { featuredDate: { in: isoDates.map(dateFromIsoDay) } },
    select: {
      featuredDate: true,
      videoStartTime: true,
      song: {
        select: {
          id: true,
          title: true,
          artist: true,
          songType: true,
          sequence: true,
          anime: { select: { name: true, coverImage: true } },
        },
      },
    },
  });
  const map = new Map<string, SongOfTheDayAdminRow>();
  for (const row of rows) {
    const songType = row.song.songType === 'ED' ? 'ED' : 'OP';
    map.set(isoDayFromDate(row.featuredDate), {
      songId: row.song.id,
      title: row.song.title,
      artist: row.song.artist,
      anime: row.song.anime.name,
      typeLabel: formatSongTypeLabel(songType, row.song.sequence),
      cover: row.song.anime.coverImage,
      videoStartTime: row.videoStartTime,
    });
  }
  return map;
}

/** Staff pick. Past days, quiz songs, and songs already featured on the horizon are refused. */
export async function assignSongOfTheDay(isoDate: string, songId: number, now = new Date()) {
  const today = dailyCalendarDate(now);
  const [quizIds, others] = await Promise.all([
    quizSongIds(isoDate),
    otherHorizonSongIds(isoDate, today),
  ]);
  const block = songOfTheDayChangeBlock({
    isoDate,
    today,
    songId,
    quizSongIds: quizIds,
    otherFeaturedSongIds: others,
  });
  if (block) throw new DailyHttpError(block === 'past' ? 409 : 400, BLOCK_MESSAGE[block]);

  const song = await prisma.song.findUnique({
    where: { id: songId },
    select: DAILY_SONG_SELECT,
  });
  const duration = song?.duration ?? null;
  if (!isPlayable(song)) throw new DailyHttpError(400, "Ce son n'est pas jouable.");
  await saveFeatured(isoDate, songId, clipStartFor(isoDate, songId, duration));
}

/** Staff redraw. Skips the current clip, the day's quiz, and recent featured songs. */
export async function redrawSongOfTheDay(isoDate: string, now = new Date()) {
  const today = dailyCalendarDate(now);
  if (isoDate < today) throw new DailyHttpError(409, BLOCK_MESSAGE.past);
  const [quizIds, recent, others, current] = await Promise.all([
    quizSongIds(isoDate),
    recentFeaturedSongIds(isoDate),
    otherHorizonSongIds(isoDate, today),
    loadFeatured(isoDate),
  ]);
  for (const id of quizIds) recent.add(id);
  for (const id of others) recent.add(id);
  if (current) recent.add(current.songId);
  const picked = await chooseFeatured(isoDate, recent);
  if (!picked) throw new DailyHttpError(409, 'Pas de son disponible.');
  await saveFeatured(isoDate, picked.songId, picked.videoStartTime);
}
