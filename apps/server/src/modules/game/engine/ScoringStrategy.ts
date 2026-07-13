import {

  computeSprintPodiumBonus,

  scoreForAnswer,

  type AnswerType,

  type RankedCorrectAnswer,

} from '@aniquizz/shared';



/**

 * Pluggable scoring strategy. Standard mode awards fixed points by answer type.

 * Sprint adds a round-level speed podium bonus at `endRound`.

 */

export interface ScoringStrategy {

  scoreFor(answerType: AnswerType, ctx: { timeMs: number; durationMs: number }): number;

  roundBonus(rankedCorrect: RankedCorrectAnswer[]): Map<string, number>;

}



export const standardScoring: ScoringStrategy = {

  scoreFor: (answerType) => scoreForAnswer(answerType),

  roundBonus: () => new Map(),

};



export const sprintScoring: ScoringStrategy = {

  scoreFor: () => scoreForAnswer('typing'),

  roundBonus: (rankedCorrect) => computeSprintPodiumBonus(rankedCorrect),

};



export function scoringForGameType(gameType: string | undefined): ScoringStrategy {

  return gameType === 'sprint' ? sprintScoring : standardScoring;

}

