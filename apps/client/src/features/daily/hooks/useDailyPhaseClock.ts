import { useEffect, useRef } from 'react';
import { dailyGuessVisualEndsAt } from '@aniquizz/shared';

const SAFETY_MS = 1_000;

/**
 * Same visual-0 commit as Standard solo: fire when the playable 15s elapses
 * (not the wall with start/end grace). Safety ticks recover from a failed HTTP.
 */
export function useDailyPhaseClock(input: {
  phase: 'guessing' | 'revealed';
  phaseEndsAt: number;
  onGuessEnd: () => void;
  onRevealEnd: () => void;
}): void {
  const guessRef = useRef(input.onGuessEnd);
  const revealRef = useRef(input.onRevealEnd);
  guessRef.current = input.onGuessEnd;
  revealRef.current = input.onRevealEnd;

  useEffect(() => {
    const visualEnd =
      input.phase === 'guessing' ? dailyGuessVisualEndsAt(input.phaseEndsAt) : input.phaseEndsAt;

    const tick = () => {
      if (Date.now() < visualEnd) return;
      if (input.phase === 'guessing') guessRef.current();
      else revealRef.current();
    };

    const delay = Math.max(0, visualEnd - Date.now());
    let safety: number | undefined;
    const startId = window.setTimeout(() => {
      tick();
      safety = window.setInterval(tick, SAFETY_MS);
    }, delay);

    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearTimeout(startId);
      if (safety !== undefined) window.clearInterval(safety);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [input.phase, input.phaseEndsAt]);
}
