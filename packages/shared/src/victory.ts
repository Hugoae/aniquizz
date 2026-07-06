// packages/shared/src/victory.ts
// Pure victory + medal computation (Standard mode).
// Framework-agnostic and fully unit-testable.
// - Solo: victory = earning at least a Bronze medal, graded on the mastery
//   ratio (earned score / best obtainable) so the answer mode matters.
// - Multi: victory = relative podium; medals are NOT shown (ranking is the story).
// Solo labels stay French (UI-facing).

import { GAME_CONFIG } from './constants';
import { maxPointsPerRound } from './scoring';
import { computeMedal, effectiveMedalThresholds, type MedalTier } from './grading';
import type { ResponseType } from './game';

export interface VictoryPlayerInput {
  userId: string;
  score: number;
  /** Correct answers this match (informational; accuracy display). */
  correctCount: number;
  /** Rounds counted for the player (mastery-ratio denominator). */
  totalCount: number;
}

export interface VictoryInput {
  players: VictoryPlayerInput[];
  totalRounds: number;
  responseType: ResponseType;
  isSolo: boolean;
  /** Selected difficulties, e.g. ['easy', 'medium']. */
  difficulties: string[];
  /** Actual difficulty of each song played (drives the medal thresholds). */
  songDifficulties: string[];
}

export interface VictoryResult {
  winnerIds: string[];
  /** Players sorted by score descending. */
  rankings: VictoryPlayerInput[];
  maxPossibleScore: number;
  /** Mastery ratio (0–1) needed for a Bronze medal / a solo win. */
  soloTargetRatio: number;
  /** The solo player's medal (null = defeat). Null in multiplayer. */
  soloMedal: MedalTier;
  soloDifficultyLabel: string;
  multiWinnerCount: number;
}

const soloDifficultyLabel = (difficulties: string[]): string => {
  const set = new Set(difficulties.map((d) => d.toLowerCase()));
  if (set.size > 1) return 'Mixte';
  if (set.has('easy')) return 'Facile';
  if (set.has('hard')) return 'Difficile';
  if (set.has('medium')) return 'Moyen';
  return 'Normal';
};

/**
 * Compute winners and metadata for a finished match.
 * - Solo: win if the player earns at least a Bronze medal. The medal is graded
 *   on the mastery ratio `score / (bestPointsPerRound × roundsPlayed)`, so
 *   acing trivial Duo rounds can't earn a top medal.
 * - Multi: top 1 (or top 3 when the lobby has >= PODIUM_THRESHOLD players),
 *   excluding players who scored 0. No per-player medals (ranking is the story).
 */
export const computeVictory = (input: VictoryInput): VictoryResult => {
  const bestPerRound = maxPointsPerRound(input.responseType);
  const maxPossibleScore = input.totalRounds * bestPerRound;
  const rankings = [...input.players].sort((a, b) => b.score - a.score);

  const soloTargetRatio = effectiveMedalThresholds(input.songDifficulties).bronze;

  const winnerIds: string[] = [];
  let multiWinnerCount = 1;
  let soloMedal: MedalTier = null;

  if (input.isSolo) {
    const top = rankings[0];
    if (top) {
      const rounds = top.totalCount > 0 ? top.totalCount : input.totalRounds;
      const denom = bestPerRound * rounds;
      const ratio = denom > 0 ? top.score / denom : 0;
      soloMedal = computeMedal(ratio, input.songDifficulties);
      if (soloMedal) winnerIds.push(top.userId);
    }
  } else {
    if (input.players.length >= GAME_CONFIG.VICTORY_CONDITIONS.MULTI.PODIUM_THRESHOLD) {
      multiWinnerCount = 3;
    }
    for (let i = 0; i < Math.min(multiWinnerCount, rankings.length); i++) {
      if (rankings[i].score > 0) {
        winnerIds.push(rankings[i].userId);
      }
    }
  }

  return {
    winnerIds,
    rankings,
    maxPossibleScore,
    soloTargetRatio,
    soloMedal,
    soloDifficultyLabel: soloDifficultyLabel(input.difficulties),
    multiWinnerCount,
  };
};
