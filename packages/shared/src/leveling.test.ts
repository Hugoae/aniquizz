import { describe, it, expect } from 'vitest';
import {
  xpForMatch,
  levelFromXp,
  totalXpForLevel,
  levelProgress,
  type MatchXpInput,
  type CorrectByDifficulty,
} from './leveling';
import { GAME_CONFIG } from './constants';

const L = GAME_CONFIG.LEVELING;

const correct = (easy = 0, medium = 0, hard = 0): CorrectByDifficulty => ({
  easy,
  medium,
  hard,
});

const baseMulti: MatchXpInput = {
  correctByDifficulty: correct(),
  roundsPlayed: 10,
  score: 20,
  isWinner: false,
  rank: 2,
  playerCount: 4,
  isSolo: false,
  winStreak: 0,
};

describe('xpForMatch - difficulty weighting', () => {
  it('weights correct answers by song difficulty', () => {
    const res = xpForMatch({
      ...baseMulti,
      correctByDifficulty: correct(1, 1, 1),
      score: 12,
      rank: 3,
    });
    // correct = 12*(0.75+1+1.25)=36 ; participation = 10*3=30 ; 3rd place +12
    expect(res).toBe(36 + 30 + L.PLACEMENT.THIRD);
  });

  it('hard answers are worth more than easy answers', () => {
    const easyRun = xpForMatch({ ...baseMulti, correctByDifficulty: correct(4, 0, 0), score: 0, roundsPlayed: 4 });
    const hardRun = xpForMatch({ ...baseMulti, correctByDifficulty: correct(0, 0, 4), score: 0, roundsPlayed: 4 });
    expect(hardRun).toBeGreaterThan(easyRun);
  });
});

describe('xpForMatch - participation & floor', () => {
  it('grants no XP when no round was played', () => {
    expect(xpForMatch({ ...baseMulti, roundsPlayed: 0, correctByDifficulty: correct() })).toBe(0);
  });

  it('floors to MIN_XP for a zero-score participant with rounds played', () => {
    const res = xpForMatch({
      ...baseMulti,
      correctByDifficulty: correct(),
      roundsPlayed: 1,
      score: 0,
      rank: 4,
    });
    // participation = 1*3 = 3 -> floored to MIN_XP (5)
    expect(res).toBe(L.MIN_XP);
  });
});

describe('xpForMatch - placement (multiplayer)', () => {
  it('gives tied podium ranks the same placement bonus', () => {
    const common = {
      ...baseMulti,
      roundsPlayed: 2,
      correctByDifficulty: correct(),
      score: 10,
      playerCount: 5,
    };
    const tiedThirdA = xpForMatch({ ...common, rank: 3 });
    const tiedThirdB = xpForMatch({ ...common, rank: 3 });
    expect(tiedThirdA).toBe(tiedThirdB);
    expect(tiedThirdA).toBe(2 * L.XP_PER_ROUND + L.PLACEMENT.THIRD);
  });

  it('awards the top-half bonus beyond the podium', () => {
    // rank 4 of 8 -> top half (ceil(8/2)=4) ; rank 5 -> below half
    const common = { ...baseMulti, roundsPlayed: 2, correctByDifficulty: correct(), score: 5, playerCount: 8 };
    const topHalf = xpForMatch({ ...common, rank: 4 });
    const belowHalf = xpForMatch({ ...common, rank: 5 });
    const participation = 2 * L.XP_PER_ROUND;
    expect(topHalf).toBe(participation + L.PLACEMENT.TOP_HALF);
    expect(belowHalf).toBe(participation);
  });

  it('gives no placement bonus when score is zero', () => {
    const res = xpForMatch({ ...baseMulti, roundsPlayed: 5, correctByDifficulty: correct(), score: 0, rank: 1, playerCount: 4 });
    expect(res).toBe(5 * L.XP_PER_ROUND); // participation only
  });
});

describe('xpForMatch - solo', () => {
  it('applies the solo multiplier and win bonus', () => {
    const res = xpForMatch({
      correctByDifficulty: correct(0, 5, 0),
      roundsPlayed: 5,
      score: 25,
      isWinner: true,
      rank: 1,
      playerCount: 1,
      isSolo: true,
      winStreak: 0,
    });
    // perf = 5*12 + 5*3 = 75 ; +25 solo win = 100 ; *0.8 = 80
    expect(res).toBe(80);
  });
});

describe('xpForMatch - win streak', () => {
  it('adds +5% once the streak reaches the minimum', () => {
    const common: MatchXpInput = {
      correctByDifficulty: correct(0, 10, 0),
      roundsPlayed: 10,
      score: 40,
      isWinner: true,
      rank: 1,
      playerCount: 4,
      isSolo: false,
      winStreak: 2,
    };
    const noStreak = xpForMatch(common);
    const withStreak = xpForMatch({ ...common, winStreak: 3 });
    expect(withStreak).toBe(Math.round(noStreak * (1 + L.WIN_STREAK_BONUS)));
  });

  it('does not apply the streak bonus to a loser', () => {
    const loser = xpForMatch({ ...baseMulti, isWinner: false, winStreak: 5, correctByDifficulty: correct(0, 3, 0), roundsPlayed: 3, score: 10 });
    const winnerNoStreak = xpForMatch({ ...baseMulti, isWinner: false, winStreak: 0, correctByDifficulty: correct(0, 3, 0), roundsPlayed: 3, score: 10 });
    expect(loser).toBe(winnerNoStreak);
  });
});

describe('level curve', () => {
  it('matches the documented thresholds', () => {
    expect(totalXpForLevel(1)).toBe(0);
    expect(totalXpForLevel(2)).toBe(100);
    expect(totalXpForLevel(3)).toBe(300);
    expect(totalXpForLevel(4)).toBe(600);
    expect(totalXpForLevel(5)).toBe(1000);
  });

  it('levelFromXp is the inverse of totalXpForLevel at boundaries', () => {
    for (let lvl = 1; lvl <= 30; lvl++) {
      const floor = totalXpForLevel(lvl);
      expect(levelFromXp(floor)).toBe(lvl);
      expect(levelFromXp(floor + 1)).toBe(lvl);
      if (lvl > 1) expect(levelFromXp(floor - 1)).toBe(lvl - 1);
    }
  });

  it('caps at MAX_LEVEL', () => {
    const huge = totalXpForLevel(L.MAX_LEVEL) * 10;
    expect(levelFromXp(huge)).toBe(L.MAX_LEVEL);
    const p = levelProgress(huge);
    expect(p.level).toBe(L.MAX_LEVEL);
    expect(p.percent).toBe(100);
    expect(p.xpForNextLevel).toBe(0);
  });

  it('is monotonic and starts at level 1', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(-50)).toBe(1);
    let prev = 1;
    for (let xp = 0; xp <= 5000; xp += 37) {
      const lvl = levelFromXp(xp);
      expect(lvl).toBeGreaterThanOrEqual(prev);
      prev = lvl;
    }
  });
});

describe('levelProgress', () => {
  it('reports 0% at a level floor', () => {
    const p = levelProgress(300); // exactly level 3
    expect(p.level).toBe(3);
    expect(p.xpIntoLevel).toBe(0);
    expect(p.xpForNextLevel).toBe(300); // 100 * level 3
    expect(p.percent).toBe(0);
  });

  it('reports partial progress within a level', () => {
    const p = levelProgress(450); // level 3 floor 300, span 300 -> 150 in
    expect(p.level).toBe(3);
    expect(p.xpIntoLevel).toBe(150);
    expect(p.percent).toBeCloseTo(50);
  });

  it('clamps to sane bounds for zero xp', () => {
    const p = levelProgress(0);
    expect(p.level).toBe(1);
    expect(p.percent).toBe(0);
  });
});
