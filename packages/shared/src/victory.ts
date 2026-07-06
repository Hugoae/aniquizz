// packages/shared/src/victory.ts
// Pure victory computation (Standard mode), extracted from the old StandardGame.
// Framework-agnostic and fully unit-testable. Solo labels stay French (UI-facing).

import { GAME_CONFIG } from './constants';
import { maxPointsPerRound } from './scoring';
import type { Precision, ResponseType } from './game';

export interface VictoryPlayerInput {
  userId: string;
  score: number;
}

export interface VictoryInput {
  players: VictoryPlayerInput[];
  totalRounds: number;
  responseType: ResponseType;
  isSolo: boolean;
  precision: Precision;
  /** Selected difficulties, e.g. ['easy', 'medium']. */
  difficulties: string[];
}

export interface VictoryResult {
  winnerIds: string[];
  /** Players sorted by score descending. */
  rankings: VictoryPlayerInput[];
  maxPossibleScore: number;
  soloTargetScore: number;
  soloDifficultyLabel: string;
  multiWinnerCount: number;
}

const soloRequirement = (
  precision: Precision,
  difficulties: string[],
): { ratio: number; label: string } => {
  const { SOLO } = GAME_CONFIG.VICTORY_CONDITIONS;

  if (precision === 'exact') {
    return { ratio: SOLO.EXACT, label: 'Exact' };
  }
  if (difficulties.includes('easy')) {
    return { ratio: SOLO.EASY, label: 'Facile' };
  }
  if (difficulties.includes('medium')) {
    return { ratio: SOLO.MEDIUM, label: 'Moyen' };
  }
  return { ratio: SOLO.HARD, label: 'Difficile' };
};

/**
 * Compute winners and metadata for a finished match.
 * - Solo: win if score >= ceil(maxPossible * requiredRatio).
 * - Multi: top 1 (or top 3 when the lobby has >= PODIUM_THRESHOLD players),
 *   excluding players who scored 0.
 */
export const computeVictory = (input: VictoryInput): VictoryResult => {
  const maxPossibleScore = input.totalRounds * maxPointsPerRound(input.responseType);

  const rankings = [...input.players].sort((a, b) => b.score - a.score);

  const winnerIds: string[] = [];
  let multiWinnerCount = 1;
  let soloTargetScore = 0;
  let soloDifficultyLabel = 'Difficile';

  if (input.isSolo) {
    const { ratio, label } = soloRequirement(input.precision, input.difficulties);
    soloDifficultyLabel = label;
    soloTargetScore = Math.ceil(maxPossibleScore * ratio);

    const top = rankings[0];
    if (top && top.score >= soloTargetScore) {
      winnerIds.push(top.userId);
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
    soloTargetScore,
    soloDifficultyLabel,
    multiWinnerCount,
  };
};
