// packages/shared/src/scoring.ts
// Pure scoring logic (Standard mode). Fixed points per answer type.
// Isolated so a future AMQ-style speed mode can plug in a different strategy.

import { GAME_CONFIG } from './constants';
import type { AnswerType, ResponseType } from './game';

/** Points awarded for a CORRECT answer of the given type. */
export const scoreForAnswer = (answerType: AnswerType): number => {
  switch (answerType) {
    case 'typing':
      return GAME_CONFIG.SCORING.TYPING;
    case 'qcm':
      return GAME_CONFIG.SCORING.QCM;
    case 'duo':
      return GAME_CONFIG.SCORING.DUO;
    default:
      return GAME_CONFIG.SCORING.DEFAULT;
  }
};

/**
 * Best points obtainable in a single round given the room's response mode.
 * `mix` lets the player choose, so its ceiling is the typing value.
 */
export const maxPointsPerRound = (responseType: ResponseType): number => {
  switch (responseType) {
    case 'qcm':
      return GAME_CONFIG.SCORING.QCM;
    case 'typing':
    case 'mix':
    default:
      return GAME_CONFIG.SCORING.TYPING;
  }
};
