import { describe, expect, it, vi, afterEach } from 'vitest';
import { GAME_CONFIG } from '@aniquizz/shared';
import { computeMatchCountdown } from './useMatchCountdown';

describe('computeMatchCountdown', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns ready-phase snapshot', () => {
    expect(
      computeMatchCountdown({
        phase: 'ready',
        phaseEndsAt: Date.now() + 5000,
        phaseDurationSeconds: 5,
        isGamePaused: false,
      }),
    ).toEqual({ timeLeft: 5, progress: 100 });
  });

  it('strips guess tail from displayed countdown', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);

    const snap = computeMatchCountdown({
      phase: 'guessing',
      phaseEndsAt: 1_000_000 + 750,
      phaseDurationSeconds: 30,
      isGamePaused: false,
    });

    expect(snap.timeLeft).toBe(1);
    expect(snap.progress).toBeGreaterThan(0);
    expect(snap.progress).toBeLessThan(5);
  });

  it('holds reveal on 0 for the end grace before the phase cuts', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    const grace = GAME_CONFIG.TIMERS.REVEAL_END_GRACE;

    const lingering = computeMatchCountdown({
      phase: 'revealed',
      phaseEndsAt: 1_000_000 + grace,
      phaseDurationSeconds: 15,
      isGamePaused: false,
    });
    expect(lingering.timeLeft).toBe(0);
    expect(lingering.progress).toBe(0);

    const early = computeMatchCountdown({
      phase: 'revealed',
      phaseEndsAt: 1_000_000 + grace + 15_000,
      phaseDurationSeconds: 15,
      isGamePaused: false,
    });
    expect(early.timeLeft).toBe(15);
  });
});
