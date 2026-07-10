import { describe, it, expect } from 'vitest';
import { computeVictory, type VictoryInput, type VictoryPlayerInput } from './victory';
import { GAME_CONFIG } from './constants';

// typing => maxPointsPerRound = 5, so 10 rounds => maxPossibleScore = 50.
const mediumSongs = (n: number): string[] => Array.from({ length: n }, () => 'medium');

const base: Omit<VictoryInput, 'players'> = {
  totalRounds: 10,
  responseType: 'typing',
  isSolo: false,
  difficulties: ['medium'],
  songDifficulties: mediumSongs(10),
};

const player = (userId: string, score: number, correctCount = 0, totalCount = 10): VictoryPlayerInput => ({
  userId,
  score,
  correctCount,
  totalCount,
});

describe('computeVictory - rankings & max score', () => {
  it('sorts players by score descending', () => {
    const res = computeVictory({
      ...base,
      players: [player('a', 10), player('b', 40), player('c', 25)],
    });
    expect(res.rankings.map((r) => r.userId)).toEqual(['b', 'c', 'a']);
  });

  it('computes max possible score from rounds x best-per-round', () => {
    const res = computeVictory({ ...base, totalRounds: 10, responseType: 'typing', players: [] });
    expect(res.maxPossibleScore).toBe(10 * GAME_CONFIG.SCORING.TYPING);
  });
});

describe('computeVictory - solo (mastery-ratio medals)', () => {
  it('wins with at least a bronze medal (medium bronze = 0.50 of max)', () => {
    const res = computeVictory({
      ...base,
      isSolo: true,
      players: [player('solo', 26, 10, 10)], // 26/50 = 0.52 -> bronze (< silver 0.58)
    });
    expect(res.soloTargetRatio).toBeCloseTo(0.5);
    expect(res.soloMedal).toBe('bronze');
    expect(res.winnerIds).toEqual(['solo']);
  });

  it('does NOT award a top medal for acing easy Duo rounds (low score)', () => {
    const res = computeVictory({
      ...base,
      isSolo: true,
      // 10/10 correct but all via Duo (1 pt each) => score 10 => 10/50 = 0.2.
      players: [player('solo', 10, 10, 10)],
    });
    expect(res.soloMedal).toBeNull();
    expect(res.winnerIds).toEqual([]);
  });

  it('awards platinum for a perfect high-value (typing) run', () => {
    const res = computeVictory({
      ...base,
      isSolo: true,
      players: [player('solo', 50, 10, 10)], // 50/50 = 1.0 -> platinum
    });
    expect(res.soloMedal).toBe('platinum');
  });

  it('scales the required ratio with the songs actually played (hard = easier bar)', () => {
    const res = computeVictory({
      ...base,
      isSolo: true,
      songDifficulties: Array.from({ length: 10 }, () => 'hard'),
      players: [player('solo', 23, 6, 10)], // 23/50 = 0.46 >= hard bronze 0.45 (< silver 0.50)
    });
    expect(res.soloTargetRatio).toBeCloseTo(0.45);
    expect(res.soloMedal).toBe('bronze');
    expect(res.winnerIds).toEqual(['solo']);
  });

  it('uses the rounds actually played as the denominator (early quit)', () => {
    const res = computeVictory({
      ...base,
      isSolo: true,
      players: [player('solo', 20, 4, 5)], // 20 / (5 rounds * 5) = 0.8 -> gold
    });
    expect(res.soloMedal).toBe('gold');
  });

  it('awards platinum at the QCM boundary (18/20 medium)', () => {
    const res = computeVictory({
      ...base,
      isSolo: true,
      responseType: 'qcm',
      players: [player('solo', 18, 9, 10)],
    });
    expect(res.maxPossibleScore).toBe(20);
    expect(res.soloMedal).toBe('platinum');
  });
});

describe('computeVictory - multiplayer (no medals)', () => {
  it('crowns a single winner below the podium threshold', () => {
    const res = computeVictory({
      ...base,
      players: [player('a', 30, 6), player('b', 20, 4)],
    });
    expect(res.multiWinnerCount).toBe(1);
    expect(res.winnerIds).toEqual(['a']);
  });

  it('crowns a top-3 podium once the lobby is large enough', () => {
    const players = Array.from({ length: GAME_CONFIG.VICTORY_CONDITIONS.MULTI.PODIUM_THRESHOLD }, (_, i) =>
      player(`p${i}`, (i + 1) * 10, i + 1),
    );
    const res = computeVictory({ ...base, players });
    expect(res.multiWinnerCount).toBe(3);
    expect(res.winnerIds).toHaveLength(3);
  });

  it('includes every player tied on a winning podium tier', () => {
    const res = computeVictory({
      ...base,
      players: [
        player('a', 100, 10),
        player('b', 100, 10),
        player('c', 100, 10),
        player('d', 100, 10),
        player('e', 50, 5),
      ],
    });
    expect(res.winnerIds.sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('includes both players tied for 3rd when the lobby uses a top-3 podium', () => {
    const res = computeVictory({
      ...base,
      players: [
        player('a', 100, 10),
        player('b', 90, 9),
        player('c', 80, 8),
        player('d', 80, 8),
        player('e', 70, 7),
      ],
    });
    expect(res.winnerIds.sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('crowns every player tied for 1st in a small lobby', () => {
    const res = computeVictory({
      ...base,
      players: [player('a', 40, 8), player('b', 40, 8), player('c', 20, 4)],
    });
    expect(res.multiWinnerCount).toBe(1);
    expect(res.winnerIds.sort()).toEqual(['a', 'b']);
  });

  it('never crowns a player who scored zero', () => {
    const res = computeVictory({
      ...base,
      players: [player('a', 0, 0), player('b', 0, 0)],
    });
    expect(res.winnerIds).toEqual([]);
  });

  it('leaves soloMedal null in multiplayer', () => {
    const res = computeVictory({
      ...base,
      players: [player('a', 50, 10), player('b', 40, 8)],
    });
    expect(res.soloMedal).toBeNull();
  });
});
