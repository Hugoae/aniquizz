import { describe, expect, it } from 'vitest';
import {
  computeSprintPodiumBonus,
  computeSprintProjectedPoints,
  formatSprintTimeSeconds,
  gameTypeFromStoredMode,
  maxSprintPointsPerRound,
  sprintSpeedRank,
} from './sprint';
describe('computeSprintPodiumBonus', () => {
  it('awards +0 when only one player answered correctly', () => {
    const bonuses = computeSprintPodiumBonus([{ userId: 'a', timeMs: 1000 }]);
    expect(bonuses.get('a')).toBe(0);
  });

  it('awards +2/+1 when two players answered correctly', () => {
    const bonuses = computeSprintPodiumBonus([
      { userId: 'fast', timeMs: 500 },
      { userId: 'slow', timeMs: 2000 },
    ]);
    expect(bonuses.get('fast')).toBe(2);
    expect(bonuses.get('slow')).toBe(1);
  });

  it('awards +3/+2/+1 when three or more answered correctly (top 3 only)', () => {
    const bonuses = computeSprintPodiumBonus([
      { userId: 'p1', timeMs: 100 },
      { userId: 'p2', timeMs: 200 },
      { userId: 'p3', timeMs: 300 },
      { userId: 'p4', timeMs: 400 },
    ]);
    expect(bonuses.get('p1')).toBe(3);
    expect(bonuses.get('p2')).toBe(2);
    expect(bonuses.get('p3')).toBe(1);
    expect(bonuses.get('p4')).toBe(0);
  });
});

describe('sprintSpeedRank', () => {
  const ranked = [
    { userId: 'a', timeMs: 1 },
    { userId: 'b', timeMs: 2 },
  ];

  it('returns 1-based rank for correct players', () => {
    expect(sprintSpeedRank(ranked, 'a')).toBe(1);
    expect(sprintSpeedRank(ranked, 'b')).toBe(2);
  });

  it('returns null for missing players', () => {
    expect(sprintSpeedRank(ranked, 'c')).toBeNull();
  });
});

describe('formatSprintTimeSeconds', () => {
  it('formats milliseconds with two decimal places', () => {
    expect(formatSprintTimeSeconds(1234)).toBe('1.23');
    expect(formatSprintTimeSeconds(50)).toBe('0.05');
  });
});

describe('gameTypeFromStoredMode', () => {
  it('maps persisted enum strings to GameType', () => {
    expect(gameTypeFromStoredMode('STANDARD')).toBe('standard');
    expect(gameTypeFromStoredMode('SPRINT')).toBe('sprint');
    expect(gameTypeFromStoredMode('sprint')).toBe('sprint');
    expect(gameTypeFromStoredMode(null)).toBe('standard');
  });
});

describe('maxSprintPointsPerRound', () => {
  it('returns typing base + max podium bonus', () => {
    expect(maxSprintPointsPerRound()).toBe(8);
  });
});

describe('computeSprintProjectedPoints', () => {
  const ranked = [
    { userId: 'a', timeMs: 100 },
    { userId: 'b', timeMs: 200 },
    { userId: 'c', timeMs: 300 },
  ];

  it('returns base + podium bonus for a correct player', () => {
    expect(computeSprintProjectedPoints(ranked, 'a', 5)).toBe(8);
    expect(computeSprintProjectedPoints(ranked, 'c', 5)).toBe(6);
  });

  it('returns 0 when the player is not among correct answerers', () => {
    expect(computeSprintProjectedPoints(ranked, 'z', 5)).toBe(0);
  });
});
