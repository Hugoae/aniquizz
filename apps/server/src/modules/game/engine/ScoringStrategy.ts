import { scoreForAnswer, type AnswerType } from '@aniquizz/shared';

/**
 * Pluggable scoring strategy. Standard mode awards fixed points by answer type.
 * A future AMQ-style speed mode can implement this interface using `ctx.timeMs`.
 */
export interface ScoringStrategy {
  scoreFor(answerType: AnswerType, ctx: { timeMs: number; durationMs: number }): number;
}

export const standardScoring: ScoringStrategy = {
  scoreFor: (answerType) => scoreForAnswer(answerType),
};
