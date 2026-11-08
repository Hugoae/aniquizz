import type { PeekWindow } from '@aniquizz/shared';
import { MatchBudgetClock } from './MatchBudgetClock';
import { RoundClock } from './RoundClock';
import type { PlaylistItem, RecordedRound } from './types';

export type LanePhase = 'guessing' | 'reveal' | 'done';

/**
 * One player's independent run through the shared playlist in a versus
 * time-attack: own title cursor, own budget clock, own reveal timing.
 */
export class RaceLane {
  readonly clock = new RoundClock();
  readonly budget = new MatchBudgetClock();

  /** Null until the common start fires. */
  phase: LanePhase | null = null;
  /** Index of the title this lane is on (-1 before the first). */
  index = -1;
  found = 0;
  guessStartAt = 0;
  isRoundEnded = false;
  /** The player explicitly left: the lane is dropped from standings. */
  removed = false;
  /** Budget left when the lane ended, frozen for the tie-break. */
  finalRemainingMs: number | null = null;
  /** Skips taken, frozen with the lane because disposing the clock resets its counter. */
  finalSkips: number | null = null;
  peekWindow: PeekWindow | null = null;
  botTimers: NodeJS.Timeout[] = [];
  /** This lane's rounds only, one answer each. Merged by index at persistence. */
  readonly rounds: RecordedRound[] = [];

  constructor(readonly userId: string) {}

  get isDone(): boolean {
    return this.phase === 'done';
  }

  /** Remaining budget, frozen once the lane is done. */
  remainingMs(): number {
    return this.finalRemainingMs ?? this.budget.getRemainingMs();
  }

  skips(): number {
    return this.finalSkips ?? this.budget.skips;
  }

  /**
   * Titles this lane has started. The clip on screen counts, and so do skips
   * and misses: found / heard is the efficiency tie-break (8/13 beats 8/15).
   */
  heardCount(): number {
    const onClip = this.phase === 'guessing' && this.index >= 0;
    return this.rounds.length + (onClip ? 1 : 0);
  }

  /** Songs this lane actually heard; the clip on screen counts. */
  heardSongIds(playlist: PlaylistItem[]): number[] {
    const heard = new Set(this.rounds.map((round) => round.songId));
    const current = this.phase === 'guessing' ? playlist[this.index] : undefined;
    if (current) heard.add(current.id);
    return [...heard];
  }

  clearBotTimers(): void {
    for (const timer of this.botTimers) clearTimeout(timer);
    this.botTimers = [];
  }

  dispose(): void {
    this.clock.clear();
    this.budget.clear();
    this.clearBotTimers();
  }
}
