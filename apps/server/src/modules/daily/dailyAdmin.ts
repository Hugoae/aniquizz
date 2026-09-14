import { prisma, Prisma } from '@aniquizz/database';
import {
  DAILY_HORIZON_DAYS,
  addCalendarDays,
  dailyCalendarDate,
  levelFromXp,
} from '@aniquizz/shared';
import { getChoiceCandidates } from '../game/gameService';
import { DailyHttpError } from './dailyErrors';
import {
  generateDailyChallenge,
  loadChallengeByDate,
  loadRecentExclusions,
} from './dailyGenerator';
import {
  franchiseKeyFor,
  mulberry32,
  pickDailyReplacement,
  toDailySongCandidate,
  type Rng,
} from './dailySelection';
import { loadPlayablePool } from './dailyPlayablePool';
import { recomputeChallengeResults } from './dailyResults';
import { heardSongsForDailyAttempt } from './dailyAttemptLifecycle';
import { rewindHeardSongs } from '../catalogue/songHistoryService';
import { syncChallengeRanks } from './dailyRanks';
import type { DailyAnswerRow, DailyRoundRow } from './dailyPayloads';
import {
  DAILY_SONG_SELECT,
  dateFromIsoDay,
  isoDayFromDate,
  parseDailySnapshot,
  snapshotFromSong,
  withNewDailyClipStart,
  type DailySongRow,
} from './dailySnapshot';
import { snapshotsFromJson, validateDailySnapshots } from './dailyValidation';
import { dailyAdminCanVoidRound, dailyAdminLineupLocked } from './dailyAdminLock';
import { searchDailyPlayableSongs } from './dailyAdminSearch';

export { searchDailyPlayableSongs };

const lineupLockedMessage =
  'Impossible de modifier la playlist : le défi est passé ou des joueurs ont déjà commencé.';

export async function listDailyAdmin(now = new Date()) {
  const today = dailyCalendarDate(now);
  const from = dateFromIsoDay(today);
  const to = dateFromIsoDay(addCalendarDays(today, DAILY_HORIZON_DAYS));
  await generateDailyChallenge(today, { now }).catch(() => undefined);
  const rows = await prisma.dailyChallenge.findMany({
    where: { challengeDate: { gte: from, lt: to } },
    include: {
      rounds: { orderBy: { position: 'asc' } },
      _count: { select: { attempts: true } },
    },
    orderBy: { challengeDate: 'asc' },
  });
  const recents = await Promise.all(
    rows.map((row) => loadRecentExclusions(isoDayFromDate(row.challengeDate))),
  );
  return {
    today,
    challenges: rows.map((row, index) => {
      const snapshots = snapshotsFromJson(row.rounds);
      const iso = isoDayFromDate(row.challengeDate);
      const attemptCount = row._count.attempts;
      const recent = recents[index] ?? {
        songIds: new Set<number>(),
        franchiseKeys: new Set<string>(),
      };
      return {
        id: row.id,
        challengeDate: iso,
        challengeNumber: row.challengeNumber,
        status: row.status.toLowerCase(),
        attemptCount,
        locked: dailyAdminLineupLocked(iso, today, attemptCount),
        canVoid: dailyAdminCanVoidRound(iso, today, attemptCount),
        warnings: validateDailySnapshots(snapshots, {
          challengeNumber: row.challengeNumber,
          recentSongIds: recent.songIds,
          recentFranchiseKeys: recent.franchiseKeys,
        }),
        rounds: row.rounds.map((round) => {
          const snapshot = parseDailySnapshot(round.snapshot);
          return {
            id: round.id,
            position: round.position,
            voided: round.voided,
            songId: round.songId,
            videoKey: snapshot.videoKey,
            videoStartTime: round.videoStartTime,
            choices: round.choices,
            anime: snapshot.anime,
            title: snapshot.title,
            artist: snapshot.artist,
            typeLabel: snapshot.typeLabel,
            difficulty: snapshot.difficulty,
            cover: snapshot.cover,
            franchise: snapshot.franchise,
            year: snapshot.year,
          };
        }),
      };
    }),
  };
}

const requireEditable = async (challengeId: string, now: Date) => {
  const challenge = await prisma.dailyChallenge.findUnique({
    where: { id: challengeId },
    include: {
      rounds: { orderBy: { position: 'asc' } },
      _count: { select: { attempts: true } },
    },
  });
  if (!challenge) throw new DailyHttpError(404, 'Défi introuvable.');
  const iso = isoDayFromDate(challenge.challengeDate);
  if (dailyAdminLineupLocked(iso, dailyCalendarDate(now), challenge._count.attempts)) {
    throw new DailyHttpError(409, lineupLockedMessage);
  }
  return challenge;
};

const rebuildRound = async (songId: number) => {
  const song = await prisma.song.findUnique({
    where: { id: songId },
    select: DAILY_SONG_SELECT,
  });
  if (
    !song ||
    song.downloadStatus !== 'COMPLETED' ||
    (song.songType !== 'OP' && song.songType !== 'ED')
  ) {
    throw new DailyHttpError(400, 'Ce son n’est pas jouable.');
  }
  const pool = await getChoiceCandidates('anime');
  return snapshotFromSong(song as unknown as DailySongRow, pool, mulberry32(songId + Date.now()));
};

export async function replaceDailyRound(
  challengeId: string,
  roundId: string,
  songId: number,
  now = new Date(),
) {
  const challenge = await requireEditable(challengeId, now);
  const round = challenge.rounds.find((row) => row.id === roundId);
  if (!round) throw new DailyHttpError(404, 'Manche introuvable.');
  if (challenge.rounds.some((row) => row.songId === songId && row.id !== roundId)) {
    throw new DailyHttpError(400, 'Ce son est déjà dans le défi.');
  }
  const snapshot = await rebuildRound(songId);
  await prisma.dailyChallengeRound.update({
    where: { id: roundId },
    data: {
      songId: snapshot.id,
      snapshot: snapshot as unknown as Prisma.InputJsonValue,
      videoStartTime: snapshot.videoStartTime,
      choices: snapshot.choices,
      voided: false,
    },
  });
  return listDailyAdmin(now);
}

export async function regenerateDailyRound(
  challengeId: string,
  roundId: string,
  now = new Date(),
  rng: Rng = { next: () => Math.random() },
) {
  const challenge = await requireEditable(challengeId, now);
  const round = challenge.rounds.find((row) => row.id === roundId);
  if (!round) throw new DailyHttpError(404, 'Manche introuvable.');
  const iso = isoDayFromDate(challenge.challengeDate);
  const [pool, recent] = await Promise.all([loadPlayablePool(), loadRecentExclusions(iso)]);
  const excludeSongIds = new Set(
    challenge.rounds.map((row) => row.songId).filter((id): id is number => id != null),
  );
  const excludeFranchiseKeys = new Set(
    challenge.rounds.map((row) => {
      const current = parseDailySnapshot(row.snapshot);
      return franchiseKeyFor(current.franchiseId, current.animeId);
    }),
  );
  const pick = pickDailyReplacement({
    pool: pool.map(toDailySongCandidate),
    rng,
    excludeSongIds,
    excludeFranchiseKeys,
    recentSongIds: recent.songIds,
    recentFranchiseKeys: recent.franchiseKeys,
  });
  if (!pick) throw new DailyHttpError(409, 'Pas de remplaçant disponible.');
  return replaceDailyRound(challengeId, roundId, pick.songId, now);
}

export async function reshuffleDailyRoundClip(
  challengeId: string,
  roundId: string,
  now = new Date(),
  rng: Rng = { next: () => Math.random() },
) {
  const challenge = await requireEditable(challengeId, now);
  const round = challenge.rounds.find((row) => row.id === roundId);
  if (!round) throw new DailyHttpError(404, 'Manche introuvable.');
  const snapshot = parseDailySnapshot(round.snapshot);
  let duration: number | null = null;
  if (round.songId) {
    const song = await prisma.song.findUnique({
      where: { id: round.songId },
      select: { duration: true },
    });
    duration = song?.duration ?? null;
  }
  const next = withNewDailyClipStart(snapshot, duration, rng);
  await prisma.dailyChallengeRound.update({
    where: { id: roundId },
    data: {
      videoStartTime: next.videoStartTime,
      snapshot: next as unknown as Prisma.InputJsonValue,
    },
  });
  return listDailyAdmin(now);
}

export async function reorderDailyRounds(
  challengeId: string,
  orderedIds: string[],
  now = new Date(),
) {
  const challenge = await requireEditable(challengeId, now);
  if (orderedIds.length !== challenge.rounds.length) {
    throw new DailyHttpError(400, 'L’ordre doit contenir toutes les manches.');
  }
  await prisma.$transaction([
    ...orderedIds.map((id, index) =>
      prisma.dailyChallengeRound.update({ where: { id }, data: { position: index + 100 } }),
    ),
    ...orderedIds.map((id, index) =>
      prisma.dailyChallengeRound.update({ where: { id }, data: { position: index + 1 } }),
    ),
  ]);
  return listDailyAdmin(now);
}

export async function setDailyChallengeStatus(
  challengeId: string,
  status: 'ready' | 'draft',
  reviewerId: string,
  now = new Date(),
) {
  const challenge = await prisma.dailyChallenge.findUnique({ where: { id: challengeId } });
  if (!challenge) throw new DailyHttpError(404, 'Défi introuvable.');
  const iso = isoDayFromDate(challenge.challengeDate);
  const attempts = await prisma.dailyAttempt.count({ where: { challengeId } });
  if (dailyAdminLineupLocked(iso, dailyCalendarDate(now), attempts)) {
    throw new DailyHttpError(409, lineupLockedMessage);
  }
  await prisma.dailyChallenge.update({
    where: { id: challengeId },
    data: {
      status: status.toUpperCase() as 'READY' | 'CANCELLED' | 'DRAFT',
      reviewedAt: now,
      reviewedById: reviewerId,
    },
  });
  return listDailyAdmin(now);
}

const requireVoidableRound = async (challengeId: string, roundId: string, now: Date) => {
  const challenge = await prisma.dailyChallenge.findUnique({
    where: { id: challengeId },
    include: { rounds: true, _count: { select: { attempts: true } } },
  });
  if (!challenge) throw new DailyHttpError(404, 'Défi introuvable.');
  const round = challenge.rounds.find((row) => row.id === roundId);
  if (!round) throw new DailyHttpError(404, 'Manche introuvable.');
  const iso = isoDayFromDate(challenge.challengeDate);
  if (!dailyAdminCanVoidRound(iso, dailyCalendarDate(now), challenge._count.attempts)) {
    throw new DailyHttpError(
      409,
      'On ne retire une manche que le jour J, une fois que des joueurs ont commencé. Sinon, remplacez le son.',
    );
  }
  return round;
};

export async function voidDailyRound(challengeId: string, roundId: string, now = new Date()) {
  await requireVoidableRound(challengeId, roundId, now);
  await prisma.dailyChallengeRound.update({ where: { id: roundId }, data: { voided: true } });
  await recomputeChallengeResults(challengeId);
  return listDailyAdmin(now);
}

export async function restoreDailyRound(challengeId: string, roundId: string, now = new Date()) {
  await requireVoidableRound(challengeId, roundId, now);
  await prisma.dailyChallengeRound.update({ where: { id: roundId }, data: { voided: false } });
  await recomputeChallengeResults(challengeId);
  return listDailyAdmin(now);
}

export async function regenerateDailyChallenge(isoDate: string, now = new Date()) {
  const existing = await prisma.dailyChallenge.findUnique({
    where: { challengeDate: dateFromIsoDay(isoDate) },
    include: { _count: { select: { attempts: true } } },
  });
  const attempts = existing?._count.attempts ?? 0;
  if (dailyAdminLineupLocked(isoDate, dailyCalendarDate(now), attempts)) {
    throw new DailyHttpError(409, lineupLockedMessage);
  }
  await generateDailyChallenge(isoDate, { force: true, now, rng: mulberry32(Date.now()) });
  return listDailyAdmin(now);
}

export async function previewDailyChallenge(isoDate: string) {
  return loadChallengeByDate(isoDate);
}

/** Undo today's official attempt: delete it, revert XP/level, rewind dedicated streak. */
export async function resetDailyProgress(profileId: string, now = new Date()) {
  const today = dailyCalendarDate(now);
  const challenge = await loadChallengeByDate(today);
  if (!challenge) {
    return { reset: false, xpReverted: 0 };
  }

  const attempt = await prisma.dailyAttempt.findUnique({
    where: { challengeId_profileId: { challengeId: challenge.id, profileId } },
    include: { answers: true },
  });
  if (!attempt) {
    return { reset: false, xpReverted: 0 };
  }

  const xpReverted = attempt.xpAwarded;
  const counted =
    attempt.state === 'COMPLETED' || attempt.state === 'FORFEITED' || attempt.state === 'EXPIRED';
  const heard = counted
    ? heardSongsForDailyAttempt(
        attempt.currentRound,
        challenge.rounds as DailyRoundRow[],
        attempt.answers as DailyAnswerRow[],
      )
    : [];

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${challenge.id}))`;
    if (xpReverted > 0) {
      const profile = await tx.profile.findUnique({
        where: { id: profileId },
        select: { xp: true },
      });
      if (profile) {
        const xp = Math.max(0, profile.xp - xpReverted);
        await tx.profile.update({
          where: { id: profileId },
          data: { xp, level: levelFromXp(xp) },
        });
      }
    }

    if (counted) {
      await rewindHeardSongs(tx, profileId, heard);
      const stats = await tx.dailyPlayerStats.findUnique({ where: { profileId } });
      if (stats?.lastCompletionDate && isoDayFromDate(stats.lastCompletionDate) === today) {
        const activeRounds = challenge.rounds.filter((round) => !round.voided).length;
        const perfect = activeRounds > 0 && attempt.correctCount === activeRounds;
        const currentStreak = Math.max(0, stats.currentStreak - 1);
        const longestStreak =
          stats.longestStreak === stats.currentStreak
            ? Math.max(currentStreak, stats.longestStreak - 1)
            : stats.longestStreak;
        await tx.dailyPlayerStats.update({
          where: { profileId },
          data: {
            currentStreak,
            longestStreak,
            completions: Math.max(0, stats.completions - 1),
            wins: attempt.won ? Math.max(0, stats.wins - 1) : stats.wins,
            perfectDays: perfect ? Math.max(0, stats.perfectDays - 1) : stats.perfectDays,
            lastCompletionDate:
              currentStreak === 0 ? null : dateFromIsoDay(addCalendarDays(today, -1)),
          },
        });
      }
    }

    await tx.dailyAttempt.delete({ where: { id: attempt.id } });
    await syncChallengeRanks(tx, challenge.id);
  });

  return { reset: true, xpReverted };
}
