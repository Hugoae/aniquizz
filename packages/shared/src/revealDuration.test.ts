import { describe, expect, it } from 'vitest';
import { revealDurationMs, revealDurationSeconds } from './revealDuration';

describe('revealDurationSeconds', () => {
  it('matches a short guess clock (5s guess → 5s reveal)', () => {
    expect(revealDurationSeconds(5)).toBe(5);
  });

  it('matches a 15s guess clock without stretching past it', () => {
    expect(revealDurationSeconds(15)).toBe(15);
  });

  it('caps a long guess at 15s so a 20s+ guess does not drag the reveal', () => {
    expect(revealDurationSeconds(20)).toBe(15);
    expect(revealDurationSeconds(30)).toBe(15);
  });

  it('floors at 1s like the round duration helper', () => {
    expect(revealDurationSeconds(0)).toBe(1);
    expect(revealDurationSeconds(-4)).toBe(1);
  });
});

describe('revealDurationMs', () => {
  it('returns the same window in milliseconds', () => {
    expect(revealDurationMs(5)).toBe(5000);
    expect(revealDurationMs(20)).toBe(15000);
  });
});
