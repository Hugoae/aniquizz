import type { GamePhase } from '../state/gameReducer';

/**
 * A guessing round whose clock already expired may have missed `round_reveal`.
 * Evolving has no clock: its `endsAt` is "now", so the same check would sync
 * and skip forever, restarting the excerpt.
 */
export function shouldRecoverStaleGuess(input: {
  phase: GamePhase;
  evolving: boolean;
  paused: boolean;
  laneDone: boolean;
}): boolean {
  return input.phase === 'guessing' && !input.evolving && !input.paused && !input.laneDone;
}
