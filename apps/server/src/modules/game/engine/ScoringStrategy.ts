import {
  computeSpeedPodiumBonus,
  isSpeedBonusEnabled,
  scoreForAnswer,
  type AnswerType,
  type RankedCorrectAnswer,
} from '@aniquizz/shared';

/**
 * Pluggable scoring strategy. Standard mode awards fixed points by answer type.
 * Speed bonus adds a round-level podium at `endRound`.
 */
export interface ScoringStrategy {
  scoreFor(answerType: AnswerType, ctx: { timeMs: number; durationMs: number }): number;
  roundBonus(rankedCorrect: RankedCorrectAnswer[]): Map<string, number>;
}

export const standardScoring: ScoringStrategy = {
  scoreFor: (answerType) => scoreForAnswer(answerType),
  roundBonus: () => new Map(),
};

export const speedBonusScoring: ScoringStrategy = {
  scoreFor: () => scoreForAnswer('typing'),
  roundBonus: (rankedCorrect) => computeSpeedPodiumBonus(rankedCorrect),
};

export function scoringForSettings(settings: {
  speedBonusEnabled?: boolean;
  responseType?: string;
  maxPlayers?: number;
  mode?: string;
}): ScoringStrategy {
  return isSpeedBonusEnabled(settings) ? speedBonusScoring : standardScoring;
}
