import { useEffect, useState } from 'react';
import { GAME_CONFIG } from '@aniquizz/shared';
import type { GamePhase } from '@/features/game/components/modes/standard/parts/types';

export interface MatchCountdownInput {
  phase: GamePhase;
  phaseEndsAt: number;
  phaseDurationSeconds: number;
  isGamePaused: boolean;
}

export interface MatchCountdownSnapshot {
  timeLeft: number;
  progress: number;
}

/** Pure countdown math — shared with tests and the live hook. */
export function computeMatchCountdown({
  phase,
  phaseEndsAt,
  phaseDurationSeconds,
  isGamePaused,
}: MatchCountdownInput): MatchCountdownSnapshot {
  if (phase === 'loading' || phase === 'ended' || isGamePaused) {
    return { timeLeft: 0, progress: 0 };
  }
  if (phase === 'ready') {
    return { timeLeft: phaseDurationSeconds, progress: 100 };
  }

  const tailMs =
    phase === 'guessing'
      ? GAME_CONFIG.TIMERS.GUESS_START_BUFFER + GAME_CONFIG.TIMERS.GUESS_END_GRACE
      : 0;
  const remainingMs = Math.max(0, phaseEndsAt - Date.now());
  const playableMs = Math.max(0, remainingMs - tailMs);
  const totalMs = phaseDurationSeconds * 1000;
  const visibleMs = Math.min(playableMs, totalMs);

  return {
    timeLeft: Math.ceil(visibleMs / 1000),
    progress: totalMs > 0 ? (visibleMs / totalMs) * 100 : 0,
  };
}

const PROGRESS_TICK_MS = 100;
const DISPLAY_TICK_MS = 250;

/**
 * Isolated match clock — progress bar updates every 100ms; displayed seconds every 250ms.
 * Keeps the heavy Game / VideoStage tree from re-rendering on every tick.
 */
export function useMatchCountdown({
  phase,
  phaseEndsAt,
  phaseDurationSeconds,
  isGamePaused,
}: MatchCountdownInput): MatchCountdownSnapshot {
  const [timeLeft, setTimeLeft] = useState(0);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (phase === 'loading' || phase === 'ended' || isGamePaused) {
      setTimeLeft(0);
      setProgress(0);
      return;
    }
    if (phase === 'ready') {
      setTimeLeft(phaseDurationSeconds);
      setProgress(100);
      return;
    }

    const input: MatchCountdownInput = { phase, phaseEndsAt, phaseDurationSeconds, isGamePaused };

    const tickProgress = () => {
      const { progress: next } = computeMatchCountdown(input);
      setProgress((prev) => (Math.abs(prev - next) < 0.05 ? prev : next));
    };

    const tickDisplay = () => {
      const { timeLeft: next } = computeMatchCountdown(input);
      setTimeLeft((prev) => (prev === next ? prev : next));
    };

    tickProgress();
    tickDisplay();

    const progressId = window.setInterval(tickProgress, PROGRESS_TICK_MS);
    const displayId = window.setInterval(tickDisplay, DISPLAY_TICK_MS);

    return () => {
      window.clearInterval(progressId);
      window.clearInterval(displayId);
    };
  }, [phase, phaseEndsAt, phaseDurationSeconds, isGamePaused]);

  return { timeLeft, progress };
}
