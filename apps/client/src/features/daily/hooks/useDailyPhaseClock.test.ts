import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { DAILY_GUESS_MS, DAILY_GUESS_WALL_MS } from '@aniquizz/shared';
import { useDailyPhaseClock } from './useDailyPhaseClock';

describe('useDailyPhaseClock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('commits the guess at the visual 15s mark, not the wall', () => {
    const onGuessEnd = vi.fn();
    const onRevealEnd = vi.fn();
    renderHook(() =>
      useDailyPhaseClock({
        phase: 'guessing',
        phaseEndsAt: 1_000_000 + DAILY_GUESS_WALL_MS,
        onGuessEnd,
        onRevealEnd,
      }),
    );

    vi.advanceTimersByTime(DAILY_GUESS_MS - 50);
    expect(onGuessEnd).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(onGuessEnd).toHaveBeenCalledOnce();
    expect(onRevealEnd).not.toHaveBeenCalled();
  });

  it('retries after a failed commit instead of giving up', () => {
    const onGuessEnd = vi.fn();
    renderHook(() =>
      useDailyPhaseClock({
        phase: 'guessing',
        phaseEndsAt: 1_000_000 + DAILY_GUESS_WALL_MS,
        onGuessEnd,
        onRevealEnd: vi.fn(),
      }),
    );

    vi.advanceTimersByTime(DAILY_GUESS_MS);
    expect(onGuessEnd).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1_000);
    expect(onGuessEnd).toHaveBeenCalledTimes(2);
  });
});
