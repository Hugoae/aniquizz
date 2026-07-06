import { describe, it, expect } from 'vitest';
import { computeVictory, type VictoryInput } from './victory';
import { GAME_CONFIG } from './constants';

const base: Omit<VictoryInput, 'players'> = {
  totalRounds: 10,
  responseType: 'typing',
  isSolo: false,
  precision: 'franchise',
  difficulties: ['medium'],
};

describe('computeVictory - rankings & max score', () => {
  it('sorts players by score descending', () => {
    const res = computeVictory({
      ...base,
      players: [
        { userId: 'a', score: 10 },
        { userId: 'b', score: 40 },
        { userId: 'c', score: 25 },
      ],
    });
    expect(res.rankings.map((r) => r.userId)).toEqual(['b', 'c', 'a']);
  });

  it('computes max possible score from rounds x ceiling', () => {
    const res = computeVictory({ ...base, totalRounds: 10, responseType: 'typing', players: [] });
    expect(res.maxPossibleScore).toBe(10 * GAME_CONFIG.SCORING.TYPING);
  });
});

describe('computeVictory - solo', () => {
  it('wins when reaching the exact-precision target', () => {
    // max = 10 * 5 = 50, exact ratio 0.5 -> target 25
    const res = computeVictory({
      ...base,
      isSolo: true,
      precision: 'exact',
      players: [{ userId: 'solo', score: 25 }],
    });
    expect(res.soloTargetScore).toBe(25);
    expect(res.soloDifficultyLabel).toBe('Exact');
    expect(res.winnerIds).toEqual(['solo']);
  });

  it('loses when below the target', () => {
    const res = computeVictory({
      ...base,
      isSolo: true,
      precision: 'exact',
      players: [{ userId: 'solo', score: 24 }],
    });
    expect(res.winnerIds).toEqual([]);
  });

  it('uses franchise/medium ratio when not exact', () => {
    // max 50, medium 0.55 -> ceil(27.5) = 28
    const res = computeVictory({
      ...base,
      isSolo: true,
      precision: 'franchise',
      difficulties: ['medium'],
      players: [{ userId: 'solo', score: 28 }],
    });
    expect(res.soloTargetScore).toBe(28);
    expect(res.soloDifficultyLabel).toBe('Moyen');
    expect(res.winnerIds).toEqual(['solo']);
  });
});

describe('computeVictory - multiplayer', () => {
  it('crowns a single winner below the podium threshold', () => {
    const res = computeVictory({
      ...base,
      players: [
        { userId: 'a', score: 30 },
        { userId: 'b', score: 20 },
      ],
    });
    expect(res.multiWinnerCount).toBe(1);
    expect(res.winnerIds).toEqual(['a']);
  });

  it('crowns a top-3 podium once the lobby is large enough', () => {
    const players = Array.from({ length: GAME_CONFIG.VICTORY_CONDITIONS.MULTI.PODIUM_THRESHOLD }, (_, i) => ({
      userId: `p${i}`,
      score: (i + 1) * 10,
    }));
    const res = computeVictory({ ...base, players });
    expect(res.multiWinnerCount).toBe(3);
    expect(res.winnerIds).toHaveLength(3);
  });

  it('never crowns a player who scored zero', () => {
    const res = computeVictory({
      ...base,
      players: [
        { userId: 'a', score: 0 },
        { userId: 'b', score: 0 },
      ],
    });
    expect(res.winnerIds).toEqual([]);
  });
});
