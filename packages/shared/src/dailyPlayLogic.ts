import { answerIdentityKey } from './utils';
import {
  DAILY_GUESS_MS,
  DAILY_GUESS_WALL_MS,
  DAILY_REVEAL_MS,
} from './dailyConstants';
import type { DailyTrackState } from './dailyTypes';

export function clampDailyResponseMs(
  roundStartedAtMs: number,
  answeredAtMs: number,
  guessMs = DAILY_GUESS_MS,
): number {
  return Math.max(0, Math.min(guessMs, answeredAtMs - roundStartedAtMs));
}

export function dailyRoundTimeMs(input: {
  answered: boolean;
  responseMs: number | null;
  guessMs?: number;
  voided?: boolean;
}): number {
  if (input.voided) return 0;
  const guessMs = input.guessMs ?? DAILY_GUESS_MS;
  if (!input.answered || input.responseMs == null) return guessMs;
  return Math.max(0, Math.min(guessMs, input.responseMs));
}

export function offeredDailyChoice(selected: string, choices: string[]): string | null {
  const key = answerIdentityKey(selected);
  if (!key) return null;
  return choices.find((choice) => answerIdentityKey(choice) === key) ?? null;
}

export function isDailyQcmCorrect(selected: string, validAnswers: string[]): boolean {
  const key = answerIdentityKey(selected);
  if (!key) return false;
  return validAnswers.some((answer) => answerIdentityKey(answer) === key);
}

export type DailySettleAction =
  | { type: 'noop' }
  | { type: 'wait_reveal' }
  | { type: 'timeout_guess'; enterReveal: boolean }
  | { type: 'start_unanswered' }
  | { type: 'complete' };

/**
 * Pure play-loop settler. After an answer, `currentRound` stays on the revealed
 * song while `unansweredPosition` points at the next one — never treat that next
 * song as timed-out using the previous round's start timestamp.
 * No global attempt TTL: leaving forfeits; a long gap only times out the current guess.
 * `allowAdvance: false` is the GET /today path — close a fully answered run, never
 * start the next song (that would be resume).
 */
export function decideDailySettle(input: {
  terminal: boolean;
  nowMs: number;
  revealUntilMs: number | null;
  currentRound: number;
  currentRoundStartedAtMs: number | null;
  unansweredPosition: number | null;
  guessMs?: number;
  revealMs?: number;
  allowAdvance?: boolean;
}): DailySettleAction {
  if (input.terminal) return { type: 'noop' };
  if (input.revealUntilMs != null && input.nowMs < input.revealUntilMs) {
    return { type: 'wait_reveal' };
  }
  if (input.unansweredPosition == null) return { type: 'complete' };
  if (input.allowAdvance === false) return { type: 'noop' };
  if (input.currentRound !== input.unansweredPosition || input.currentRoundStartedAtMs == null) {
    return { type: 'start_unanswered' };
  }
  const guessMs = input.guessMs ?? DAILY_GUESS_WALL_MS;
  const revealMs = input.revealMs ?? DAILY_REVEAL_MS;
  const guessEnd = input.currentRoundStartedAtMs + guessMs;
  if (input.nowMs < guessEnd) return { type: 'noop' };
  return { type: 'timeout_guess', enterReveal: input.nowMs < guessEnd + revealMs };
}

export function dailyTrackStates(
  rounds: Array<{ position: number; voided?: boolean; correct?: boolean | null }>,
): DailyTrackState[] {
  return [...rounds]
    .sort((a, b) => a.position - b.position)
    .map((round) => {
      if (round.voided) return 'voided';
      if (round.correct === true) return 'correct';
      if (round.correct === false) return 'wrong';
      return 'empty';
    });
}

export function dailyPlayTracks(input: {
  total: number;
  currentPosition: number;
  answers: Array<{ position: number; voided?: boolean; correct?: boolean | null }>;
}): DailyTrackState[] {
  const byPosition = new Map(input.answers.map((answer) => [answer.position, answer]));
  return Array.from({ length: input.total }, (_, index) => {
    const position = index + 1;
    const answer = byPosition.get(position);
    if (answer?.voided) return 'voided';
    if (answer?.correct === true) return 'correct';
    if (answer?.correct === false) return 'wrong';
    if (position === input.currentPosition) return 'pending';
    return 'empty';
  });
}

export function summarizeDailyRounds(rounds: Array<{ voided?: boolean; correct?: boolean | null }>): {
  correctCount: number;
  activeRoundCount: number;
} {
  const active = rounds.filter((round) => !round.voided);
  return {
    correctCount: active.filter((round) => round.correct === true).length,
    activeRoundCount: active.length,
  };
}
