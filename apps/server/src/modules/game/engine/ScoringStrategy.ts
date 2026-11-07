import {
  computeSpeedPodiumBonus,
  isSpeedBonusEnabled,
  isTimeAttackSettings,
  scoreForAnswer,
  type AnswerType,
  type GameType,
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

export const timeAttackScoring: ScoringStrategy = {
  scoreFor: () => 1,
  roundBonus: () => new Map(),
};

export function scoringForSettings(settings: {
  speedBonusEnabled?: boolean;
  responseType?: string;
  maxPlayers?: number;
  mode?: string;
  gameType?: GameType;
}): ScoringStrategy {
  if (isTimeAttackSettings(settings)) return timeAttackScoring;
  return isSpeedBonusEnabled(settings) ? speedBonusScoring : standardScoring;
}
