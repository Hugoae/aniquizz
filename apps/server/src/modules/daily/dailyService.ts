import { prisma, Prisma } from '@aniquizz/database';
import {
  DAILY_GUESS_MS,
  DAILY_LEADERBOARD_SIZE,
  DAILY_REVEAL_MS,
  assignDailyRanks,
  dailyCalendarDate,
  isDailyQcmCorrect,
  offeredDailyChoice,
  clampDailyResponseMs,
  type DailyAttemptState,
  type DailyLeaderboardResponse,
  type DailySafeRoundDto,
  type DailyStreakDto,
  type DailyTodayResponse,
} from '@aniquizz/shared';
import { DailyHttpError } from './dailyErrors';
import { ensureTodayChallenge, loadChallengeByDate } from './dailyGenerator';
import {
  publicToday,
  snapshotOf,
  statusFromAttempt,
  toResultDto,
  toRevealDto,
  toSafeRound,
  type DailyRoundRow,
} from './dailyPayloads';
import {
  TERMINAL,
  attemptInclude,
  finishAttempt,
  loadAttempt,
  playableRounds,
  settleAttempt,
  unansweredPlayable,
  writeUnanswered,
  type AttemptRecord,
} from './dailyAttemptLifecycle';

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

const resultFor = async (attempt: AttemptRecord, streak?: DailyStreakDto) => {
  const resolved = streak ?? (await streakDto(attempt.profileId));
  return toResultDto({
    rounds: attempt.challenge.rounds as DailyRoundRow[],
    answers: attempt.answers,
    xpAwarded: attempt.xpAwarded,
    completedAt: attempt.completedAt ?? new Date(),
    streak: resolved.current,
  });
};

const playPayload = (attempt: AttemptRecord, now: Date): DailySafeRoundDto | null => {
  if (TERMINAL.has(attempt.state)) return null;
  const rounds = attempt.challenge.rounds as DailyRoundRow[];
  const total = playableRounds(rounds).length;
  const startedAt = attempt.currentRoundStartedAt;
  if (!startedAt) return null;

  const revealing = Boolean(attempt.revealUntil && attempt.revealUntil.getTime() > now.getTime());
  if (revealing) {
    const revealRound =
      rounds.find((row) => row.position === attempt.currentRound) ??
      unansweredPlayable(rounds, attempt.answers);
    if (!revealRound || !attempt.revealUntil) return null;
    const answer = attempt.answers.find((item) => item.roundId === revealRound.id);
    return toSafeRound({
      attemptId: attempt.id,
      round: revealRound,
      total,
      roundStartedAt: startedAt,
      revealUntil: attempt.revealUntil,
      phase: 'reveal',
      reveal: toRevealDto({
        round: revealRound,
        answer,
        rounds,
        answers: attempt.answers,
        revealUntil: attempt.revealUntil,
        finished: false,
      }),
    });
  }

  const round = unansweredPlayable(rounds, attempt.answers);
  if (!round) return null;
  return toSafeRound({
    attemptId: attempt.id,
    round,
    total,
    roundStartedAt: startedAt,
    revealUntil: attempt.revealUntil,
    phase: 'guessing',
    reveal: null,
  });
};

export async function getDailyToday(profileId: string | null, now = new Date()): Promise<DailyTodayResponse> {
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

  const record = { ...existing, challenge } as AttemptRecord;
  const wasTerminal = TERMINAL.has(existing.state);
  // Metadata only: complete a fully answered run, never start the next song.
  const settled = wasTerminal ? record : await settleAttempt(record, now, { allowAdvance: false });
  const terminal = TERMINAL.has(settled.state);
  const latestStreak = !wasTerminal && terminal ? await streakDto(profileId) : streak!;
  return {
    ...base,
    status: statusFromAttempt(asState(settled.state), true),
    streak: latestStreak,
    result: terminal ? await resultFor(settled, latestStreak) : null,
    openAttemptId: terminal ? null : settled.id,
  };
}

export async function startDailyAttempt(profileId: string, now = new Date()) {
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
          // Leftover NOT NULL column; the settler does not use this as a chrono.
          expiresAt: now,
          currentRound: first.position,
          currentRoundStartedAt: now,
        },
        include: attemptInclude,
      });
      created = true;
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
      attempt = await prisma.dailyAttempt.findUniqueOrThrow({
        where: { challengeId_profileId: { challengeId: challenge.id, profileId } },
        include: attemptInclude,
      });
    }
  }

  const settled = await settleAttempt(attempt, now);
  if (TERMINAL.has(settled.state)) {
    return { attempt: null, result: await resultFor(settled), status: 'completed' as const };
  }
  // Concurrent double-start of a brand-new attempt must stay idempotent. Anything
  // older is treated as an abandoned run — one attempt, no resume.
  if (!created) {
    const startedAt = settled.currentRoundStartedAt?.getTime() ?? 0;
    const freshEmpty =
      settled.answers.length === 0 &&
      !settled.revealUntil &&
      now.getTime() - startedAt < 10_000;
    if (!freshEmpty) {
      const forfeited = await forfeitDailyAttempt(profileId, settled.id, now);
      return { attempt: null, result: forfeited.result, status: 'completed' as const };
    }
  }
  const payload = playPayload(settled, now);
  if (!payload) throw new DailyHttpError(409, 'Impossible de démarrer cette tentative.');
  return { attempt: payload, result: null, status: 'in_progress' as const };
}

export async function answerDailyAttempt(
  profileId: string,
  attemptId: string,
  selected: string | null,
  now = new Date(),
) {
  const loaded = await loadAttempt(attemptId, profileId);
  if (!loaded) throw new DailyHttpError(404, 'Tentative introuvable.');
  // Keep the open guess: timeout_guess on GET/next must not steal this POST.
  const attempt = await settleAttempt(loaded, now, { keepOpenGuess: true });
  if (TERMINAL.has(attempt.state)) {
    return { reveal: null, result: await resultFor(attempt), finished: true };
  }

  const currentReveal = playPayload(attempt, now);
  if (currentReveal?.reveal) {
    return { finished: false, result: null, reveal: currentReveal.reveal };
  }

  const round = unansweredPlayable(attempt.challenge.rounds as DailyRoundRow[], attempt.answers);
  if (!round || !attempt.currentRoundStartedAt) {
    const settled = await settleAttempt(attempt, now);
    if (TERMINAL.has(settled.state)) {
      return { reveal: null, result: await resultFor(settled), finished: true };
    }
    const fallback = playPayload(settled, now);
    if (fallback?.reveal) {
      return { finished: false, result: null, reveal: fallback.reveal };
    }
    throw new DailyHttpError(409, 'Aucune manche en cours.');
  }
  const snapshot = snapshotOf(round);
  let selectedLabel: string | null = null;
  let isCorrect = false;
  if (selected != null) {
    selectedLabel = offeredDailyChoice(selected, snapshot.choices);
    if (!selectedLabel) throw new DailyHttpError(400, 'Cette proposition n’est pas proposée.');
    isCorrect = isDailyQcmCorrect(selectedLabel, snapshot.validAnswers);
  }
  const responseMs = selectedLabel
    ? clampDailyResponseMs(attempt.currentRoundStartedAt.getTime(), now.getTime(), DAILY_GUESS_MS)
    : DAILY_GUESS_MS;
  const revealUntil = new Date(now.getTime() + DAILY_REVEAL_MS);

  try {
    await prisma.$transaction([
      prisma.dailyAttemptAnswer.create({
        data: {
          attemptId: attempt.id,
          roundId: round.id,
          selectedLabel,
          isCorrect,
          responseMs,
          answeredAt: now,
        },
      }),
      prisma.dailyAttempt.update({
        where: { id: attempt.id },
        data: { revealUntil, currentRound: round.position },
      }),
    ]);
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
  }

  const fresh = await loadAttempt(attempt.id, profileId);
  if (!fresh) throw new DailyHttpError(500, 'Réponse perdue.');
  const replay = playPayload(fresh, now);
  if (replay?.reveal) {
    return { finished: false, result: null, reveal: replay.reveal };
  }
  const answer = fresh.answers.find((item) => item.roundId === round.id);
  return {
    finished: false,
    result: null,
    reveal: toRevealDto({
      round,
      answer,
      rounds: fresh.challenge.rounds as DailyRoundRow[],
      answers: fresh.answers,
      revealUntil,
      finished: false,
    }),
  };
}

export async function nextDailyRound(profileId: string, attemptId: string, now = new Date()) {
  const loaded = await loadAttempt(attemptId, profileId);
  if (!loaded) throw new DailyHttpError(404, 'Tentative introuvable.');
  const wasRevealing = Boolean(loaded.revealUntil && loaded.revealUntil.getTime() > now.getTime());
  const attempt = await settleAttempt(loaded, now);
  if (TERMINAL.has(attempt.state)) {
    return { attempt: null, result: await resultFor(attempt), status: 'completed' as const };
  }
  const nowRevealing = Boolean(attempt.revealUntil && attempt.revealUntil.getTime() > now.getTime());
  // Guess just timed out on the server: return reveal instead of skipping it.
  if (nowRevealing && !wasRevealing) {
    const payload = playPayload(attempt, now);
    if (payload) return { attempt: payload, result: null, status: 'in_progress' as const };
  }
  const pending = unansweredPlayable(attempt.challenge.rounds as DailyRoundRow[], attempt.answers);
  if (!pending) {
    const finished = await finishAttempt(attempt, 'COMPLETED', now);
    return { attempt: null, result: await resultFor(finished), status: 'completed' as const };
  }
  // Already on the next guess (reveal elapsed, or a duplicate Suivant). Do not
  // reset the 15s window. Early Suivant during reveal still falls through.
  const onPendingGuess =
    attempt.revealUntil == null &&
    attempt.currentRound === pending.position &&
    attempt.currentRoundStartedAt != null;
  if (onPendingGuess) {
    const payload = playPayload(attempt, now);
    if (!payload) throw new DailyHttpError(409, 'Impossible de démarrer la manche suivante.');
    return { attempt: payload, result: null, status: 'in_progress' as const };
  }
  await prisma.dailyAttempt.update({
    where: { id: attempt.id },
    data: {
      currentRound: pending.position,
      currentRoundStartedAt: now,
      revealUntil: null,
    },
  });
  const fresh = await loadAttempt(attempt.id, profileId);
  if (!fresh) throw new DailyHttpError(500, 'Manche suivante introuvable.');
  const payload = playPayload(fresh, now);
  if (!payload) throw new DailyHttpError(409, 'Impossible de démarrer la manche suivante.');
  return { attempt: payload, result: null, status: 'in_progress' as const };
}

export async function forfeitDailyAttempt(profileId: string, attemptId: string, now = new Date()) {
  const loaded = await loadAttempt(attemptId, profileId);
  if (!loaded) throw new DailyHttpError(404, 'Tentative introuvable.');
  let attempt = await settleAttempt(loaded, now);
  if (!TERMINAL.has(attempt.state)) {
    const remaining = playableRounds(attempt.challenge.rounds as DailyRoundRow[]).filter(
      (round) => !attempt.answers.some((answer) => answer.roundId === round.id),
    );
    for (const round of remaining) {
      await writeUnanswered(attempt.id, round.id, DAILY_GUESS_MS, now);
    }
    attempt = (await loadAttempt(attempt.id, profileId)) ?? attempt;
    attempt = await finishAttempt(attempt, 'FORFEITED', now);
  }
  return { result: await resultFor(attempt) };
}

export async function getDailyLeaderboard(_profileId: string | null, now = new Date()): Promise<DailyLeaderboardResponse> {
  const today = dailyCalendarDate(now);
  const challenge = await loadChallengeByDate(today);
  if (!challenge) {
    return { challengeDate: today, participantCount: 0, entries: [] };
  }
  const rows = await prisma.dailyAttempt.findMany({
    where: { challengeId: challenge.id, state: { in: ['COMPLETED', 'FORFEITED', 'EXPIRED'] } },
    include: { profile: { select: { id: true, username: true, avatar: true } } },
  });
  const participantCount = rows.length;
  const ranked = rows.map((row) => ({
    id: row.profileId,
    correctCount: row.correctCount,
    totalResponseMs: row.totalResponseMs,
    completedAtMs: row.completedAt?.getTime() ?? row.startedAt.getTime(),
    username: row.profile.username,
    avatar: row.profile.avatar,
  }));
  const ranks = assignDailyRanks(ranked);
  const ordered = [...ranked].sort((a, b) => (ranks.get(a.id) ?? 99) - (ranks.get(b.id) ?? 99) || a.id.localeCompare(b.id));
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