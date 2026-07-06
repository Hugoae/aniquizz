import { describe, it, expect } from 'vitest';
import { scoreForAnswer, maxPointsPerRound } from './scoring';
import { GAME_CONFIG } from './constants';

describe('scoreForAnswer', () => {
  it('awards fixed points per answer type', () => {
    expect(scoreForAnswer('typing')).toBe(GAME_CONFIG.SCORING.TYPING);
    expect(scoreForAnswer('qcm')).toBe(GAME_CONFIG.SCORING.QCM);
    expect(scoreForAnswer('duo')).toBe(GAME_CONFIG.SCORING.DUO);
  });

  it('orders rewards typing > qcm > duo', () => {
    expect(scoreForAnswer('typing')).toBeGreaterThan(scoreForAnswer('qcm'));
    expect(scoreForAnswer('qcm')).toBeGreaterThan(scoreForAnswer('duo'));
  });
});

describe('maxPointsPerRound', () => {
  it('caps qcm rooms at the qcm value', () => {
    expect(maxPointsPerRound('qcm')).toBe(GAME_CONFIG.SCORING.QCM);
  });

  it('uses the typing ceiling for typing and mix rooms', () => {
    expect(maxPointsPerRound('typing')).toBe(GAME_CONFIG.SCORING.TYPING);
    expect(maxPointsPerRound('mix')).toBe(GAME_CONFIG.SCORING.TYPING);
  });
});
