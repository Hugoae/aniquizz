import { prisma, Prisma } from '@aniquizz/database';
import {
  DAILY_GUESS_MS,
  DAILY_GUESS_WALL_MS,
  DAILY_REVEAL_MS,
  dailyHeardSongs,
  dailyXp,
  decideDailySettle,
  isDailyVictory,
  nextDailyStreak,
  levelFromXp,
} from '@aniquizz/shared';
import { DailyHttpError } from './dailyErrors';
import { isoDayFromDate } from './dailySnapshot';
import {
  catalogueSongId,
  computeAttemptTotals,
  type DailyAnswerRow,
  type DailyRoundRow,
} from './dailyPayloads';
import { recordHeardSongs } from '../catalogue/songHistoryService';
import { syncChallengeRanks } from './dailyRanks';

export type AttemptRecord = Prisma.DailyAttemptGetPayload<{
  include: {
    answers: true;
    challenge: { include: { rounds: true } };
  };
}>;

export const TERMINAL = new Set(['COMPLETED', 'FORFEITED', 'EXPIRED']);

export const attemptInclude = {
  answers: true,
  challenge: { include: { rounds: { orderBy: { position: 'asc' as const } } } },
} as const;

export const playableRounds = (rounds: DailyRoundRow[]): DailyRoundRow[] =>
  rounds.filter((round) => !round.voided).sort((a, b) => a.position - b.position);

export const unansweredPlayable = (
  rounds: DailyRoundRow[],
  answers: DailyAnswerRow[],
): DailyRoundRow | null => {
  const answered = new Set(answers.map((answer) => answer.roundId));
  return playableRounds(rounds).find((round) => !answered.has(round.id)) ?? null;
};

export const heardSongsForDailyAttempt = (
  currentRound: number,
  rounds: DailyRoundRow[],
  answers: DailyAnswerRow[],
) =>
  dailyHeardSongs({
    currentRound,
    rounds: rounds.map((round) => ({
      id: round.id,
      position: round.position,
      voided: round.voided,
      songId: catalogueSongId(round),
    })),
    answers,
  });

export const loadAttempt = (id: string, profileId: string): Promise<AttemptRecord | null> =>
  prisma.dailyAttempt.findFirst({
    where: { id, profileId },
    include: attemptInclude,
  });

export const finishAttempt = async (
  attempt: AttemptRecord,
  state: 'COMPLETED' | 'FORFEITED' | 'EXPIRED',
  now: Date,
): Promise<AttemptRecord> => {
  const rounds = attempt.challenge.rounds as DailyRoundRow[];
  const totals = computeAttemptTotals(rounds, attempt.answers);
  const challengeDate = isoDayFromDate(attempt.challenge.challengeDate);
  let xpAwarded = attempt.xpAwarded;
  // Capture before the tx: leftover forfeit answers may already be on `attempt`,
  // but `currentRound` is still the last clip that actually started.
  const heard = heardSongsForDailyAttempt(attempt.currentRound, rounds, attempt.answers);
  let shouldRecordHistory = false;

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${attempt.challengeId}))`;
    const live = await tx.dailyAttempt.findUnique({
      where: { id: attempt.id },
      select: { state: true },
    });
    if (!live || TERMINAL.has(live.state)) return;

    shouldRecordHistory = true;
    const stats = await tx.dailyPlayerStats.findUnique({ where: { profileId: attempt.profileId } });
    const lastDate = stats?.lastCompletionDate ? isoDayFromDate(stats.lastCompletionDate) : null;
    const alreadyCounted = lastDate === challengeDate;
    const next = nextDailyStreak({
      currentStreak: stats?.currentStreak ?? 0,
      longestStreak: stats?.longestStreak ?? 0,
      lastCompletionDate: lastDate,
      challengeDate,
    });
    const perfect = totals.activeRoundCount > 0 && totals.correctCount === totals.activeRoundCount;
    const won = isDailyVictory(totals.correctCount, totals.activeRoundCount);

    if (!alreadyCounted) {
      if (attempt.xpAwarded === 0) {
        xpAwarded = dailyXp(totals.correctCount, totals.activeRoundCount);
        const profile = await tx.profile.findUnique({
          where: { id: attempt.profileId },
          select: { xp: true },
        });
        if (profile) {
          const newXp = profile.xp + xpAwarded;
          await tx.profile.update({
            where: { id: attempt.profileId },
            data: { xp: newXp, level: levelFromXp(newXp) },
          });
        }
      }
      await tx.dailyPlayerStats.upsert({
        where: { profileId: attempt.profileId },
        create: {
          profileId: attempt.profileId,
          currentStreak: next.currentStreak,
          longestStreak: next.longestStreak,
          completions: 1,
          wins: won ? 1 : 0,
          perfectDays: perfect ? 1 : 0,
          lastCompletionDate: attempt.challenge.challengeDate,
        },
        update: {
          currentStreak: next.currentStreak,
          longestStreak: next.longestStreak,
          completions: { increment: 1 },
          wins: won ? { increment: 1 } : undefined,
          perfectDays: perfect ? { increment: 1 } : undefined,
          lastCompletionDate: attempt.challenge.challengeDate,
        },
      });
    } else {
      xpAwarded = attempt.xpAwarded;
    }

    await tx.dailyAttempt.update({
      where: { id: attempt.id },
      data: {
        state,
        completedAt: attempt.completedAt ?? now,
        correctCount: totals.correctCount,
        activeRoundCount: totals.activeRoundCount,
        won,
        totalResponseMs: totals.totalResponseMs,
        xpAwarded,
        revealUntil: null,
      },
    });
    await syncChallengeRanks(tx, attempt.challengeId);
  });

  const fresh = await loadAttempt(attempt.id, attempt.profileId);
  if (!fresh) throw new DailyHttpError(500, 'Tentative introuvable après clôture.');
  // After the transaction: a missing catalogue FK must not abort XP / streak.
  if (shouldRecordHistory) {
    await recordHeardSongs(prisma, attempt.profileId, heard);
  }
  return fresh;
};

export const writeUnanswered = async (
  attemptId: string,
  roundId: string,
  responseMs: number,
  now: Date,
) => {
  try {
    await prisma.dailyAttemptAnswer.create({
      data: {
        attemptId,
        roundId,
        selectedLabel: null,
        isCorrect: false,
        responseMs,
        answeredAt: now,
      },
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002')
      throw error;
  }
};

const startUnanswered = async (attempt: AttemptRecord, now: Date): Promise<AttemptRecord> => {
  const next = unansweredPlayable(attempt.challenge.rounds as DailyRoundRow[], attempt.answers);
  if (!next) return finishAttempt(attempt, 'COMPLETED', now);
  await prisma.dailyAttempt.update({
    where: { id: attempt.id },
    data: {
      currentRound: next.position,
      currentRoundStartedAt: now,
      revealUntil: null,
    },
  });
  return (await loadAttempt(attempt.id, attempt.profileId)) ?? attempt;
};

export const settleAttempt = async (
  attempt: AttemptRecord,
  now: Date,
  options?: { keepOpenGuess?: boolean; allowAdvance?: boolean },
): Promise<AttemptRecord> => {
  const rounds = attempt.challenge.rounds as DailyRoundRow[];
  const pending = unansweredPlayable(rounds, attempt.answers);
  const decision = decideDailySettle({
    terminal: TERMINAL.has(attempt.state),
    nowMs: now.getTime(),
    revealUntilMs: attempt.revealUntil?.getTime() ?? null,
    currentRound: attempt.currentRound,
    currentRoundStartedAtMs: attempt.currentRoundStartedAt?.getTime() ?? null,
    unansweredPosition: pending?.position ?? null,
    allowAdvance: options?.allowAdvance ?? true,
  });

  if (decision.type === 'noop' || decision.type === 'wait_reveal') return attempt;

  if (decision.type === 'complete') {
    return finishAttempt(attempt, 'COMPLETED', now);
  }

  if (decision.type === 'start_unanswered') {
    return startUnanswered(attempt, now);
  }

  if (decision.type === 'timeout_guess' && pending) {
    // Incoming /answer still owns this round — do not write a miss and 409 the player.
    if (options?.keepOpenGuess) return attempt;
    await writeUnanswered(attempt.id, pending.id, DAILY_GUESS_MS, now);
    if (decision.enterReveal) {
      const startedAt = attempt.currentRoundStartedAt ?? now;
      await prisma.dailyAttempt.update({
        where: { id: attempt.id },
        data: {
          revealUntil: new Date(startedAt.getTime() + DAILY_GUESS_WALL_MS + DAILY_REVEAL_MS),
          currentRound: pending.position,
        },
      });
      return (await loadAttempt(attempt.id, attempt.profileId)) ?? attempt;
    }
    const fresh = (await loadAttempt(attempt.id, attempt.profileId)) ?? attempt;
    return startUnanswered(fresh, now);
  }

  return attempt;
};
