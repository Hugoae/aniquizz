import { prisma, Prisma } from '@aniquizz/database';
import {
  DAILY_GUESS_MS,
  DAILY_LEADERBOARD_SIZE,
  assignDailyRanks,
  dailyCalendarDate,
  isLeaderboardHiddenUsername,
  type DailyAttemptState,
  type DailyLeaderboardResponse,
  type DailyResultDto,
  type DailyStreakDto,
  type DailyTodayResponse,
} from '@aniquizz/shared';
import { DailyHttpError } from './dailyErrors';
import { ensureTodayChallenge, loadChallengeByDate } from './dailyGenerator';
import { publicToday, statusFromAttempt, toResultDto, type DailyRoundRow } from './dailyPayloads';
import {
  TERMINAL,
  attemptInclude,
  finishAttempt,
  loadAttempt,
  playableRounds,
  type AttemptRecord,
} from './dailyAttemptLifecycle';
import { runDailyPlayer } from './dailyPlayerGate';

const asState = (state: AttemptRecord['state']): DailyAttemptState =>
  state.toLowerCase() as DailyAttemptState;

const streakDto = async (profileId: string): Promise<DailyStreakDto> => {
  const row = await prisma.dailyPlayerStats.findUnique({ where: { profileId } });
  return {
    current: row?.currentStreak ?? 0,
    longest: row?.longestStreak ?? 0,
    completions: row?.completions ?? 0,
    perfectDays: row?.perfectDays ?? 0,
  };
};

const resultFor = async (
  attempt: AttemptRecord,
  streak?: DailyStreakDto,
): Promise<DailyResultDto> => {
  const resolved = streak ?? (await streakDto(attempt.profileId));
  return toResultDto({
    rounds: attempt.challenge.rounds as DailyRoundRow[],
    answers: attempt.answers,
    xpAwarded: attempt.xpAwarded,
    completedAt: attempt.completedAt ?? new Date(),
    streak: resolved.current,
  });
};

export interface DailyClosedAnswer {
  roundId: string;
  selectedLabel: string | null;
  isCorrect: boolean;
  responseMs: number;
  answeredAt: Date;
}

/**
 * Write the in-memory grades once, then grant XP / streak / rank. A second
 * close of the same attempt returns the stored result and does not pay again.
 * `currentRound` null keeps the row's value (crash recovery).
 */
export async function closeDailyAttempt(input: {
  profileId: string;
  attemptId: string;
  currentRound: number | null;
  answers: DailyClosedAnswer[];
  state: 'COMPLETED' | 'FORFEITED';
  now?: Date;
}): Promise<{ result: DailyResultDto }> {
  const now = input.now ?? new Date();
  const loaded = await loadAttempt(input.attemptId, input.profileId);
  if (!loaded) throw new DailyHttpError(404, 'Tentative introuvable.');
  if (TERMINAL.has(loaded.state)) return { result: await resultFor(loaded) };

  const provided = new Map(input.answers.map((answer) => [answer.roundId, answer]));
  for (const existing of loaded.answers) {
    if (provided.has(existing.roundId)) continue;
    provided.set(existing.roundId, {
      roundId: existing.roundId,
      selectedLabel: existing.selectedLabel,
      isCorrect: existing.isCorrect,
      responseMs: existing.responseMs,
      answeredAt: existing.answeredAt,
    });
  }
  for (const round of playableRounds(loaded.challenge.rounds as DailyRoundRow[])) {
    if (provided.has(round.id)) continue;
    provided.set(round.id, {
      roundId: round.id,
      selectedLabel: null,
      isCorrect: false,
      responseMs: DAILY_GUESS_MS,
      answeredAt: now,
    });
  }
  const toInsert = [...provided.values()].filter(
    (answer) => !loaded.answers.some((existing) => existing.roundId === answer.roundId),
  );
  for (const answer of toInsert) {
    try {
      await prisma.dailyAttemptAnswer.create({
        data: {
          attemptId: input.attemptId,
          roundId: answer.roundId,
          selectedLabel: answer.selectedLabel,
          isCorrect: answer.isCorrect,
          responseMs: answer.responseMs,
          answeredAt: answer.answeredAt,
        },
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002')
        throw error;
    }
  }
  await prisma.dailyAttempt.update({
    where: { id: input.attemptId },
    data: {
      currentRound: input.currentRound ?? loaded.currentRound,
      revealUntil: null,
    },
  });
  const fresh = await loadAttempt(input.attemptId, input.profileId);
  if (!fresh) throw new DailyHttpError(500, 'Tentative introuvable après clôture.');
  const finished = await finishAttempt(fresh, input.state, now);
  return { result: await resultFor(finished) };
}

export async function openDailyAttempt(
  profileId: string,
  now = new Date(),
): Promise<{ attempt: AttemptRecord; result: null } | { attempt: null; result: DailyResultDto }> {
  const challenge = await ensureTodayChallenge(now);
  if (!challenge || challenge.status !== 'READY') {
    throw new DailyHttpError(404, "Le quiz du jour n'est pas disponible.");
  }

  let created = false;
  let attempt = await prisma.dailyAttempt.findUnique({
    where: { challengeId_profileId: { challengeId: challenge.id, profileId } },
    include: attemptInclude,
  });
  if (!attempt) {
    const first = playableRounds(challenge.rounds as DailyRoundRow[])[0];
    if (!first) throw new DailyHttpError(409, 'Aucune manche jouable aujourd’hui.');
    try {
      attempt = await prisma.dailyAttempt.create({
        data: {
          challengeId: challenge.id,
          profileId,
          // Leftover NOT NULL column. The play clock is per round, in memory.
          expiresAt: now,
          currentRound: first.position,
          currentRoundStartedAt: now,
        },
        include: attemptInclude,
      });
      created = true;
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002')
        throw error;
      attempt = await prisma.dailyAttempt.findUniqueOrThrow({
        where: { challengeId_profileId: { challengeId: challenge.id, profileId } },
        include: attemptInclude,
      });
    }
  }

  if (TERMINAL.has(attempt.state)) {
    return { attempt: null, result: await resultFor(attempt) };
  }
  // A second open with no live run is an abandoned day. The 10s window only
  // covers two creates racing on the unique key.
  if (!created) {
    const startedAt = attempt.currentRoundStartedAt?.getTime() ?? 0;
    const freshEmpty =
      attempt.answers.length === 0 && !attempt.revealUntil && now.getTime() - startedAt < 10_000;
    if (!freshEmpty) {
      const forfeited = await closeDailyAttempt({
        profileId,
        attemptId: attempt.id,
        currentRound: attempt.currentRound,
        answers: [],
        state: 'FORFEITED',
        now,
      });
      return { attempt: null, result: forfeited.result };
    }
  }
  return { attempt, result: null };
}

async function getDailyTodayNow(
  profileId: string | null,
  now = new Date(),
): Promise<DailyTodayResponse> {
  const challengeDate = dailyCalendarDate(now);
  const [challenge, streak] = await Promise.all([
    ensureTodayChallenge(now),
    profileId ? streakDto(profileId) : Promise.resolve(null),
  ]);
  const available = Boolean(challenge && challenge.status === 'READY');
  const base = publicToday({
    challengeId: challenge?.id ?? null,
    challengeDate,
    challengeNumber: challenge?.challengeNumber ?? null,
    now,
    available,
  });
  if (!profileId) return base;
  if (!challenge || !available) {
    return { ...base, status: 'unavailable', streak };
  }

  const existing = await prisma.dailyAttempt.findUnique({
    where: { challengeId_profileId: { challengeId: challenge.id, profileId } },
    include: { answers: true },
  });
  if (!existing) {
    return { ...base, status: 'available', streak };
  }

  if (TERMINAL.has(existing.state)) {
    const record = { ...existing, challenge } as AttemptRecord;
    return {
      ...base,
      status: statusFromAttempt(asState(existing.state), true),
      streak: streak!,
      result: await resultFor(record, streak!),
      openAttemptId: null,
    };
  }

  // A live or abandoned run stays in progress here. Reopening /daily forfeits
  // through the socket; this read must not time out the current guess.
  return {
    ...base,
    status: 'in_progress',
    streak: streak!,
    result: null,
    openAttemptId: existing.id,
  };
}

export function getDailyToday(profileId: string | null, now = new Date()) {
  if (!profileId) return getDailyTodayNow(null, now);
  return runDailyPlayer(profileId, () => getDailyTodayNow(profileId, now));
}

export async function getDailyLeaderboard(
  _profileId: string | null,
  now = new Date(),
): Promise<DailyLeaderboardResponse> {
  const today = dailyCalendarDate(now);
  const challenge = await loadChallengeByDate(today);
  if (!challenge) {
    return { challengeDate: today, participantCount: 0, entries: [] };
  }
  const rows = await prisma.dailyAttempt.findMany({
    where: { challengeId: challenge.id, state: { in: ['COMPLETED', 'FORFEITED', 'EXPIRED'] } },
    include: { profile: { select: { id: true, username: true, avatar: true } } },
  });
  const publicRows = rows.filter((row) => !isLeaderboardHiddenUsername(row.profile.username));
  const participantCount = publicRows.length;
  const ranked = publicRows.map((row) => ({
    id: row.profileId,
    correctCount: row.correctCount,
    totalResponseMs: row.totalResponseMs,
    completedAtMs: row.completedAt?.getTime() ?? row.startedAt.getTime(),
    username: row.profile.username,
    avatar: row.profile.avatar,
  }));
  const ranks = assignDailyRanks(ranked);
  const ordered = [...ranked].sort(
    (a, b) => (ranks.get(a.id) ?? 99) - (ranks.get(b.id) ?? 99) || a.id.localeCompare(b.id),
  );
  return {
    challengeDate: today,
    participantCount,
    entries: ordered.slice(0, DAILY_LEADERBOARD_SIZE).map((row) => ({
      rank: ranks.get(row.id) ?? 0,
      profileId: row.id,
      username: row.username,
      avatar: row.avatar,
      correctCount: row.correctCount,
      totalResponseMs: row.totalResponseMs,
      completedAt: new Date(row.completedAtMs).toISOString(),
    })),
  };
}
