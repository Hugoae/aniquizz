import { GAME_CONFIG } from './constants';

/** Cap so a long guess clock does not drag the post-guess reveal. */
export const REVEAL_DURATION_CAP_SECONDS = 15;

/**
 * Reveal window after a guess: min(guess, 15s), floored at 1s.
 * Daily quiz keeps its own 15s-per-round clock — do not fold it in here.
 */
export function revealDurationSeconds(guessDurationSeconds: number): number {
  const guess = Number.isFinite(guessDurationSeconds) ? Math.round(guessDurationSeconds) : 0;
  return Math.max(1, Math.min(guess, REVEAL_DURATION_CAP_SECONDS));
}

export function revealDurationMs(guessDurationSeconds: number): number {
  return revealDurationSeconds(guessDurationSeconds) * 1000;
}

/** Server reveal clock: the visible window, then a short linger on 0. */
export function revealClockMs(revealSeconds: number): number {
  const seconds = Number.isFinite(revealSeconds) ? revealSeconds : 0;
  return Math.max(0, Math.round(seconds * 1000)) + GAME_CONFIG.TIMERS.REVEAL_END_GRACE;
}
