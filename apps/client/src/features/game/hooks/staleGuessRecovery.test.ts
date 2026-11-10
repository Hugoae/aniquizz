import { describe, expect, it } from 'vitest';
import { shouldRecoverStaleGuess } from './staleGuessRecovery';

describe('shouldRecoverStaleGuess', () => {
  it('recovers a stuck standard guess', () => {
    expect(
      shouldRecoverStaleGuess({
        phase: 'guessing',
        evolving: false,
        paused: false,
        laneDone: false,
      }),
    ).toBe(true);
  });

  it('does not recover Evolving, or the excerpt restarts on its own', () => {
    expect(
      shouldRecoverStaleGuess({
        phase: 'guessing',
        evolving: true,
        paused: false,
        laneDone: false,
      }),
    ).toBe(false);
  });

  it('stays quiet while paused, revealed, or a lane is done', () => {
    expect(
      shouldRecoverStaleGuess({
        phase: 'guessing',
        evolving: false,
        paused: true,
        laneDone: false,
      }),
    ).toBe(false);
    expect(
      shouldRecoverStaleGuess({
        phase: 'revealed',
        evolving: false,
        paused: false,
        laneDone: false,
      }),
    ).toBe(false);
    expect(
      shouldRecoverStaleGuess({
        phase: 'guessing',
        evolving: false,
        paused: false,
        laneDone: true,
      }),
    ).toBe(false);
  });
});
