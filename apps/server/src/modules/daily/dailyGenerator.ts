import { randomUUID } from 'crypto';
import { prisma, Prisma } from '@aniquizz/database';
import {
  DAILY_FRANCHISE_LOOKBACK_DAYS,
  DAILY_HORIZON_DAYS,
  DAILY_RULES_VERSION,
  DAILY_SONG_LOOKBACK_DAYS,
  addCalendarDays,
  dailyCalendarDate,
  type DailyRoundSnapshot,
} from '@aniquizz/shared';
import { logger } from '../../utils/logger';
import { getChoiceCandidates } from '../game/gameService';
import {
  franchiseKeyFor,
  mulberry32,
  selectDailySongs,
  toDailySongCandidate,
  type Rng,
} from './dailySelection';
import { loadPlayablePool, invalidateDailyPlayablePool } from './dailyPlayablePool';
import {
  dateFromIsoDay,
  isoDayFromDate,
  parseDailySnapshot,
  snapshotFromSong,
  type DailySongRow,
} from './dailySnapshot';
import { validateDailySnapshots, type DailyValidationWarning } from './dailyValidation';

const HORIZON_MS = 6 * 60 * 60 * 1000;

export interface GeneratedChallenge {
  id: string;
  challengeDate: string;
  challengeNumber: number;
  status: 'draft' | 'ready' | 'cancelled';
  warnings: DailyValidationWarning[];
  created: boolean;
}

export async function loadRecentExclusions(
  beforeDate: string,
): Promise<{ songIds: Set<number>; franchiseKeys: Set<string> }> {
  const songFrom = addCalendarDays(beforeDate, -DAILY_SONG_LOOKBACK_DAYS);
  const franchiseFrom = addCalendarDays(beforeDate, -DAILY_FRANCHISE_LOOKBACK_DAYS);
  const rounds = await prisma.dailyChallengeRound.findMany({
    where: {
      challenge: {
        status: { not: 'CANCELLED' },
        challengeDate: { gte: dateFromIsoDay(songFrom), lt: dateFromIsoDay(beforeDate) },
      },
    },
    select: {
      songId: true,
      snapshot: true,
      challenge: { select: { challengeDate: true } },
    },
  });

  const songIds = new Set<number>();
  const franchiseKeys = new Set<string>();
  for (const round of rounds) {
    if (round.songId) songIds.add(round.songId);
    const day = isoDayFromDate(round.challenge.challengeDate);
    if (day < franchiseFrom) continue;
    try {
      const snap = parseDailySnapshot(round.snapshot);
      franchiseKeys.add(franchiseKeyFor(snap.franchiseId, snap.animeId));
    } catch {
      /* ignore malformed historical snapshots */
    }
  }
  return { songIds, franchiseKeys };
}

const nextChallengeNumber = async (tx: Prisma.TransactionClient): Promise<number> => {
  const last = await tx.dailyChallenge.findFirst({
    orderBy: { challengeNumber: 'desc' },
    select: { challengeNumber: true },
  });
  return (last?.challengeNumber ?? 0) + 1;
};

const buildSnapshots = async (
  songs: DailySongRow[],
  rng: Rng,
): Promise<DailyRoundSnapshot[]> => {
  const choicePool = await getChoiceCandidates('anime');
  return songs.map((song) => snapshotFromSong(song, choicePool, rng));
};

export async function generateDailyChallenge(
  isoDate: string,
  options?: { rng?: Rng; force?: boolean; now?: Date },
): Promise<GeneratedChallenge> {
  const existing = await prisma.dailyChallenge.findUnique({
    where: { challengeDate: dateFromIsoDay(isoDate) },
    include: { rounds: { orderBy: { position: 'asc' } } },
  });
  if (existing && !options?.force) {
    const snapshots = existing.rounds.map((round) => parseDailySnapshot(round.snapshot));
    const recent = await loadRecentExclusions(isoDate);
    return {
      id: existing.id,
      challengeDate: isoDate,
      challengeNumber: existing.challengeNumber,
      status: existing.status.toLowerCase() as GeneratedChallenge['status'],
      warnings: validateDailySnapshots(snapshots, {
        challengeNumber: existing.challengeNumber,
        recentSongIds: recent.songIds,
        recentFranchiseKeys: recent.franchiseKeys,
      }),
      created: false,
    };
  }

  if (options?.force) invalidateDailyPlayablePool();
  const pool = await loadPlayablePool();
  const recent = await loadRecentExclusions(isoDate);
  const rng = options?.rng ?? mulberry32(Number(isoDate.replace(/-/g, '')) || 1);
  const candidates = pool
    .filter((row) => row.songType === 'OP' || row.songType === 'ED')
    .map(toDailySongCandidate);
  const pickedNumber = existing?.challengeNumber ?? (await nextChallengeNumber(prisma));
  const picked = selectDailySongs({
    pool: candidates,
    rng,
    challengeNumber: pickedNumber,
    recentSongIds: recent.songIds,
    recentFranchiseKeys: recent.franchiseKeys,
  });
  const byId = new Map(pool.map((row) => [row.id, row]));
  const fullSongs = picked.songs.map((row) => byId.get(row.songId)).filter((row): row is DailySongRow => Boolean(row));
  const snapshots = await buildSnapshots(fullSongs, rng);
  const warnings = validateDailySnapshots(snapshots, {
    challengeNumber: pickedNumber,
    recentSongIds: recent.songIds,
    recentFranchiseKeys: recent.franchiseKeys,
  });

  try {
    const created = await prisma.$transaction(async (tx) => {
      const challengeNumber = pickedNumber;
      const status = warnings.length ? 'DRAFT' : 'READY';
      if (existing && options?.force) {
        await tx.dailyChallengeRound.deleteMany({ where: { challengeId: existing.id } });
        await tx.dailyChallenge.update({
          where: { id: existing.id },
          data: { status, rulesVersion: DAILY_RULES_VERSION, generatedAt: options.now ?? new Date() },
        });
        await tx.dailyChallengeRound.createMany({
          data: snapshots.map((snapshot, index) => ({
            id: randomUUID(),
            challengeId: existing.id,
            position: index + 1,
            songId: snapshot.id,
            snapshot: snapshot as unknown as Prisma.InputJsonValue,
            videoStartTime: snapshot.videoStartTime,
            choices: snapshot.choices,
          })),
        });
        return { id: existing.id, challengeNumber, status };
      }

      const id = randomUUID();
      await tx.dailyChallenge.create({
        data: {
          id,
          challengeDate: dateFromIsoDay(isoDate),
          challengeNumber,
          status,
          rulesVersion: DAILY_RULES_VERSION,
          generatedAt: options?.now ?? new Date(),
        },
      });
      await tx.dailyChallengeRound.createMany({
        data: snapshots.map((snapshot, index) => ({
          id: randomUUID(),
          challengeId: id,
          position: index + 1,
          songId: snapshot.id,
          snapshot: snapshot as unknown as Prisma.InputJsonValue,
          videoStartTime: snapshot.videoStartTime,
          choices: snapshot.choices,
        })),
      });
      return { id, challengeNumber, status };
    });

    logger.info(
      `Daily challenge ${isoDate} #${created.challengeNumber} ${created.status} (${warnings.length} warnings)`,
      'Daily',
    );
    return {
      id: created.id,
      challengeDate: isoDate,
      challengeNumber: created.challengeNumber,
      status: created.status.toLowerCase() as GeneratedChallenge['status'],
      warnings,
      created: true,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const raced = await prisma.dailyChallenge.findUnique({
        where: { challengeDate: dateFromIsoDay(isoDate) },
      });
      if (raced) {
        return {
          id: raced.id,
          challengeDate: isoDate,
          challengeNumber: raced.challengeNumber,
          status: raced.status.toLowerCase() as GeneratedChallenge['status'],
          warnings,
          created: false,
        };
      }
    }
    throw error;
  }
}

export async function ensureDailyHorizon(now = new Date()): Promise<GeneratedChallenge[]> {
  const today = dailyCalendarDate(now);
  const results: GeneratedChallenge[] = [];
  for (let offset = 0; offset < DAILY_HORIZON_DAYS; offset += 1) {
    const iso = addCalendarDays(today, offset);
    try {
      results.push(await generateDailyChallenge(iso, { now }));
    } catch (error) {
      logger.error(`Daily horizon failed for ${iso}`, 'Daily', error);
    }
  }
  return results;
}

let horizonTimer: ReturnType<typeof setInterval> | null = null;

export function startDailyHorizonJob(): void {
  if (horizonTimer) return;
  void ensureDailyHorizon().catch((error) => {
    logger.warn('Daily horizon warmup failed (non-fatal)', 'Daily', error);
  });
  horizonTimer = setInterval(() => {
    void ensureDailyHorizon().catch((error) => {
      logger.warn('Daily horizon refresh failed (non-fatal)', 'Daily', error);
    });
  }, HORIZON_MS);
  horizonTimer.unref?.();
}

export async function loadChallengeByDate(isoDate: string) {
  return prisma.dailyChallenge.findUnique({
    where: { challengeDate: dateFromIsoDay(isoDate) },
    include: { rounds: { orderBy: { position: 'asc' } } },
  });
}

/** Load today without generating the 14-day horizon (that stays on the background job). */
export async function ensureTodayChallenge(now = new Date()) {
  const today = dailyCalendarDate(now);
  const existing = await loadChallengeByDate(today);
  if (existing) return existing;
  await generateDailyChallenge(today, { now });
  return loadChallengeByDate(today);
}
