import { prisma } from '@aniquizz/database';
import {
  DAILY_GUESS_MS,
  DAILY_REVEAL_MS,
  GAME_CONFIG,
  clampDailyResponseMs,
  isDailyQcmCorrect,
  offeredDailyChoice,
  type DailyPlayState,
} from '@aniquizz/shared';
import type { TypedSocket } from '../../core/socketTypes';
import { HTTP_AUTH_ERROR } from '../../core/httpAuth';
import { env } from '../../config/env';
import { toPlaybackUrl } from '../../lib/mediaPlaybackUrl';
import { logger } from '../../utils/logger';
import { RoundClock } from '../game/engine/RoundClock';
import { playableRounds } from './dailyAttemptLifecycle';
import { DailyHttpError } from './dailyErrors';
import { snapshotOf, toRevealDto, toSafeRound, type DailyRoundRow } from './dailyPayloads';
import { runDailyPlayer } from './dailyPlayerGate';
import { markDailyRunLive, clearDailyRunRegistry } from './dailyRunRegistry';
import { closeDailyAttempt, openDailyAttempt, type DailyClosedAnswer } from './dailyService';

interface LiveRound {
  row: DailyRoundRow;
  playbackUrl: string;
  videoStartTime: number;
}

interface LiveRun {
  userId: string;
  attemptId: string;
  socket: TypedSocket;
  allRounds: DailyRoundRow[];
  rounds: LiveRound[];
  answers: DailyClosedAnswer[];
  index: number;
  phase: 'guessing' | 'reveal';
  draft: string | null;
  phaseStartedAt: number;
  revealUntil: number | null;
  clock: RoundClock;
}

/**
 * In-memory quiz-du-jour, same shape as a match: the server owns the clock and
 * pushes each snapshot. Postgres is touched when the run opens, when a clip
 * starts (so a crash still knows what was heard), and when the run closes.
 */
class DailyEngine {
  private readonly runs = new Map<string, LiveRun>();
  private guessMs = DAILY_GUESS_MS;
  private revealMs = DAILY_REVEAL_MS;

  /** Test-only. Production durations stay the shared constants. */
  setDurationsForTests(guessMs: number, revealMs: number): void {
    if (env.NODE_ENV !== 'test') return;
    this.guessMs = guessMs;
    this.revealMs = revealMs;
  }

  clearForTests(): void {
    for (const run of this.runs.values()) run.clock.clear();
    this.runs.clear();
    clearDailyRunRegistry();
    this.guessMs = DAILY_GUESS_MS;
    this.revealMs = DAILY_REVEAL_MS;
  }

  isLive(profileId: string): boolean {
    return this.runs.has(profileId);
  }

  start(userId: string, socket: TypedSocket): Promise<void> {
    return this.enqueue(userId, () => this.startNow(userId, socket));
  }

  select(userId: string, attemptId: string, selected: string, socket: TypedSocket): Promise<void> {
    return this.enqueue(userId, async () => {
      const run = this.requireRun(userId, attemptId, socket);
      if (run.phase !== 'guessing') return;
      const choice = offeredDailyChoice(selected, snapshotOf(run.rounds[run.index].row).choices);
      if (!choice) throw new DailyHttpError(400, 'Cette proposition n’est pas proposée.');
      run.draft = choice;
    });
  }

  /** End the guess now. The reveal clock, or the player, can also end it. */
  lock(userId: string, attemptId: string, socket: TypedSocket): Promise<void> {
    return this.enqueue(userId, async () => {
      const run = this.requireRun(userId, attemptId, socket);
      await this.lockRun(run);
    });
  }

  /** End the reveal now (Suivant, or the server clock). */
  advance(userId: string, attemptId: string, socket: TypedSocket): Promise<void> {
    return this.enqueue(userId, async () => {
      const run = this.requireRun(userId, attemptId, socket);
      await this.advanceRun(run);
    });
  }

  forfeit(userId: string, attemptId: string, socket: TypedSocket): Promise<void> {
    return this.enqueue(userId, () => this.forfeitNow(userId, attemptId, socket));
  }

  /** A dropped socket is a leave. The product does not resume a run. */
  onSocketGone(userId: string, socketId: string): Promise<void> {
    return this.enqueue(userId, async () => {
      const run = this.runs.get(userId);
      if (!run || run.socket.id !== socketId) return;
      await this.forfeitRun(run);
    });
  }

  private enqueue<T>(userId: string, task: () => Promise<T>): Promise<T> {
    return runDailyPlayer(userId, task);
  }

  private requireRun(userId: string, attemptId: string, socket: TypedSocket): LiveRun {
    const run = this.runs.get(userId);
    if (!run || run.attemptId !== attemptId) {
      throw new DailyHttpError(404, 'Tentative introuvable.');
    }
    run.socket = socket;
    return run;
  }

  private async startNow(userId: string, socket: TypedSocket): Promise<void> {
    await this.assertNotBanned(userId);
    const existing = this.runs.get(userId);
    if (existing) {
      existing.socket = socket;
      this.emitRound(existing);
      return;
    }

    const opened = await openDailyAttempt(userId);
    if (opened.result) {
      socket.emit('daily:state', { kind: 'result', result: opened.result });
      return;
    }

    const allRounds = opened.attempt.challenge.rounds as DailyRoundRow[];
    const rounds = playableRounds(allRounds).map((row) => {
      const snapshot = snapshotOf(row);
      return {
        row,
        playbackUrl: toPlaybackUrl(snapshot.videoKey),
        videoStartTime: snapshot.videoStartTime,
      };
    });
    if (!rounds.length) throw new DailyHttpError(409, 'Aucune manche jouable aujourd’hui.');

    const run: LiveRun = {
      userId,
      attemptId: opened.attempt.id,
      socket,
      allRounds,
      rounds,
      answers: [],
      index: 0,
      phase: 'guessing',
      draft: null,
      phaseStartedAt: Date.now(),
      revealUntil: null,
      clock: new RoundClock(),
    };
    this.runs.set(userId, run);
    markDailyRunLive(userId, true);
    this.arm(run);
    this.emitRound(run);
    await this.checkpoint(run);
  }

  private arm(run: LiveRun): void {
    run.clock.start(this.guessMs, () => {
      void this.enqueue(run.userId, async () => {
        const live = this.runs.get(run.userId);
        if (live === run && live.phase === 'guessing') await this.lockRun(live);
      });
    });
  }

  private async lockRun(run: LiveRun, now = Date.now()): Promise<void> {
    if (run.phase !== 'guessing') {
      this.emitRound(run);
      return;
    }
    const current = run.rounds[run.index];
    if (!current) return;
    const snapshot = snapshotOf(current.row);
    const selected = run.draft ? offeredDailyChoice(run.draft, snapshot.choices) : null;
    const isCorrect = selected ? isDailyQcmCorrect(selected, snapshot.validAnswers) : false;
    run.answers.push({
      roundId: current.row.id,
      selectedLabel: selected,
      isCorrect,
      responseMs: selected
        ? clampDailyResponseMs(run.phaseStartedAt, now, this.guessMs)
        : this.guessMs,
      answeredAt: new Date(now),
    });
    const revealMs = this.revealMs + GAME_CONFIG.TIMERS.REVEAL_END_GRACE;
    run.phase = 'reveal';
    run.draft = null;
    run.revealUntil = now + revealMs;
    run.clock.start(revealMs, () => {
      void this.enqueue(run.userId, async () => {
        const live = this.runs.get(run.userId);
        if (live === run && live.phase === 'reveal') await this.advanceRun(live);
      });
    });
    this.emitRound(run);
  }

  private async advanceRun(run: LiveRun, now = Date.now()): Promise<void> {
    if (run.phase !== 'reveal') return;
    if (run.index + 1 >= run.rounds.length) {
      await this.finishRun(run, 'COMPLETED', now);
      return;
    }
    run.index += 1;
    run.phase = 'guessing';
    run.draft = null;
    run.revealUntil = null;
    run.phaseStartedAt = now;
    this.arm(run);
    this.emitRound(run);
    await this.checkpoint(run);
  }

  private async forfeitNow(userId: string, attemptId: string, socket: TypedSocket): Promise<void> {
    const run = this.runs.get(userId);
    if (run && run.attemptId === attemptId) {
      run.socket = socket;
      await this.forfeitRun(run);
      return;
    }
    const closed = await closeDailyAttempt({
      profileId: userId,
      attemptId,
      currentRound: null,
      answers: [],
      state: 'FORFEITED',
    });
    socket.emit('daily:state', { kind: 'result', result: closed.result });
  }

  private async forfeitRun(run: LiveRun, now = Date.now()): Promise<void> {
    const from = run.phase === 'guessing' ? run.index : run.index + 1;
    for (let index = from; index < run.rounds.length; index += 1) {
      const roundId = run.rounds[index].row.id;
      if (run.answers.some((answer) => answer.roundId === roundId)) continue;
      run.answers.push({
        roundId,
        selectedLabel: null,
        isCorrect: false,
        responseMs: this.guessMs,
        answeredAt: new Date(now),
      });
    }
    await this.finishRun(run, 'FORFEITED', now);
  }

  private async finishRun(
    run: LiveRun,
    state: 'COMPLETED' | 'FORFEITED',
    now: number,
  ): Promise<void> {
    run.clock.clear();
    this.runs.delete(run.userId);
    markDailyRunLive(run.userId, false);
    const current = run.rounds[Math.min(run.index, run.rounds.length - 1)];
    try {
      const closed = await closeDailyAttempt({
        profileId: run.userId,
        attemptId: run.attemptId,
        currentRound: current?.row.position ?? 1,
        answers: run.answers,
        state,
        now: new Date(now),
      });
      run.socket.emit('daily:state', { kind: 'result', result: closed.result });
    } catch (error) {
      logger.error('[Daily] Failed to close a run', 'Daily', error);
      run.socket.emit('daily:error', {
        message: 'Impossible de clôturer le quiz du jour.',
        status: 500,
      });
    }
  }

  /** Which clip has started. Kept off the guess/reveal click path. */
  private async checkpoint(run: LiveRun): Promise<void> {
    const current = run.rounds[run.index];
    if (!current) return;
    await prisma.dailyAttempt.update({
      where: { id: run.attemptId },
      data: {
        currentRound: current.row.position,
        currentRoundStartedAt: new Date(run.phaseStartedAt),
        revealUntil: null,
      },
    });
  }

  private emitRound(run: LiveRun): void {
    const state: DailyPlayState = { kind: 'round', attempt: this.snapshot(run) };
    run.socket.emit('daily:state', state);
  }

  private snapshot(run: LiveRun) {
    const current = run.rounds[run.index];
    const upcoming = run.rounds[run.index + 1] ?? null;
    const revealUntil = run.revealUntil == null ? null : new Date(run.revealUntil);
    const answer = run.answers.find((item) => item.roundId === current.row.id);
    const dto = toSafeRound({
      attemptId: run.attemptId,
      round: current.row,
      rounds: run.allRounds,
      total: run.rounds.length,
      roundStartedAt: new Date(run.phaseStartedAt),
      revealUntil,
      phase: run.phase === 'reveal' ? 'reveal' : 'guessing',
      reveal:
        run.phase === 'reveal' && revealUntil
          ? toRevealDto({
              round: current.row,
              answer,
              rounds: run.allRounds,
              answers: run.answers,
              revealUntil,
              finished: false,
            })
          : null,
    });
    const revealEndsAt =
      run.phase === 'reveal' && run.revealUntil != null
        ? new Date(run.revealUntil).toISOString()
        : null;
    return {
      ...dto,
      videoKey: current.playbackUrl,
      videoStartTime: current.videoStartTime,
      nextVideo: upcoming?.playbackUrl ?? null,
      nextVideoStartTime: upcoming?.videoStartTime ?? null,
      roundEndsAt: new Date(run.phaseStartedAt + this.guessMs).toISOString(),
      revealEndsAt,
      reveal: dto.reveal
        ? {
            ...dto.reveal,
            revealEndsAt: revealEndsAt ?? dto.reveal.revealEndsAt,
            song: {
              ...dto.reveal.song,
              videoKey: current.playbackUrl,
              videoStartTime: current.videoStartTime,
            },
          }
        : null,
    };
  }

  private async assertNotBanned(userId: string): Promise<void> {
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { bannedUntil: true },
    });
    if (profile?.bannedUntil && profile.bannedUntil.getTime() > Date.now()) {
      throw new DailyHttpError(403, HTTP_AUTH_ERROR.banned);
    }
  }
}

const engine = new DailyEngine();

export function setDailyEngineDurationsForTests(guessMs: number, revealMs: number): void {
  engine.setDurationsForTests(guessMs, revealMs);
}

export function clearDailyEngineForTests(): void {
  engine.clearForTests();
}

export function isDailyEngineLive(profileId: string): boolean {
  return engine.isLive(profileId);
}

export function startDailyRun(userId: string, socket: TypedSocket): Promise<void> {
  return engine.start(userId, socket);
}

export function selectDailyChoice(
  userId: string,
  attemptId: string,
  selected: string,
  socket: TypedSocket,
): Promise<void> {
  return engine.select(userId, attemptId, selected, socket);
}

export function lockDailyGuess(
  userId: string,
  attemptId: string,
  socket: TypedSocket,
): Promise<void> {
  return engine.lock(userId, attemptId, socket);
}

export function advanceDailyReveal(
  userId: string,
  attemptId: string,
  socket: TypedSocket,
): Promise<void> {
  return engine.advance(userId, attemptId, socket);
}

export function forfeitDailyRun(
  userId: string,
  attemptId: string,
  socket: TypedSocket,
): Promise<void> {
  return engine.forfeit(userId, attemptId, socket);
}

export function forfeitDailyRunOnDisconnect(userId: string, socketId: string): Promise<void> {
  return engine.onSocketGone(userId, socketId);
}
