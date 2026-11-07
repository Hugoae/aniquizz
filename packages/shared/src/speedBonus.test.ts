import { describe, expect, it } from 'vitest';
import {
  computeSpeedPodiumBonus,
  computeSpeedProjectedPoints,
  formatSpeedTimeSeconds,
  gameTypeFromStoredMode,
  isSpeedBonusEnabled,
  maxSpeedBonusPointsPerRound,
  speedBonusFromStoredMode,
  speedPodiumRank,
} from './speedBonus';

describe('computeSpeedPodiumBonus', () => {
  it('awards +0 when only one player answered correctly', () => {
    const bonuses = computeSpeedPodiumBonus([{ userId: 'a', timeMs: 1000 }]);
    expect(bonuses.get('a')).toBe(0);
  });

  it('awards +2/+1 when two players answered correctly', () => {
    const bonuses = computeSpeedPodiumBonus([
      { userId: 'fast', timeMs: 500 },
      { userId: 'slow', timeMs: 2000 },
    ]);
    expect(bonuses.get('fast')).toBe(2);
    expect(bonuses.get('slow')).toBe(1);
  });

  it('awards +3/+2/+1 when three or more answered correctly (top 3 only)', () => {
    const bonuses = computeSpeedPodiumBonus([
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

describe('speedPodiumRank', () => {
  const ranked = [
    { userId: 'a', timeMs: 1 },
    { userId: 'b', timeMs: 2 },
  ];

  it('returns 1-based rank for correct players', () => {
    expect(speedPodiumRank(ranked, 'a')).toBe(1);
    expect(speedPodiumRank(ranked, 'b')).toBe(2);
  });

  it('returns null for missing players', () => {
    expect(speedPodiumRank(ranked, 'c')).toBeNull();
  });
});

describe('formatSpeedTimeSeconds', () => {
  it('formats milliseconds with two decimal places', () => {
    expect(formatSpeedTimeSeconds(1234)).toBe('1.23');
    expect(formatSpeedTimeSeconds(50)).toBe('0.05');
  });
});

describe('gameTypeFromStoredMode', () => {
  it('maps Standard and historical SPRINT rows to standard', () => {
    expect(gameTypeFromStoredMode('STANDARD')).toBe('standard');
    expect(gameTypeFromStoredMode('SPRINT')).toBe('standard');
    expect(gameTypeFromStoredMode('sprint')).toBe('standard');
    expect(gameTypeFromStoredMode(null)).toBe('standard');
  });

  it('maps TIME_ATTACK rows to timeAttack', () => {
    expect(gameTypeFromStoredMode('TIME_ATTACK')).toBe('timeAttack');
    expect(gameTypeFromStoredMode('time_attack')).toBe('timeAttack');
  });
});

describe('speedBonusFromStoredMode', () => {
  it('treats persisted SPRINT as speed bonus', () => {
    expect(speedBonusFromStoredMode('SPRINT')).toBe(true);
    expect(speedBonusFromStoredMode('sprint')).toBe(true);
    expect(speedBonusFromStoredMode('STANDARD')).toBe(false);
    expect(speedBonusFromStoredMode(null)).toBe(false);
  });
});

describe('isSpeedBonusEnabled', () => {
  it('requires the flag, typing, and at least two seats', () => {
    expect(
      isSpeedBonusEnabled({
        speedBonusEnabled: true,
        responseType: 'typing',
        maxPlayers: 8,
      }),
    ).toBe(true);
    expect(
      isSpeedBonusEnabled({
        speedBonusEnabled: true,
        responseType: 'qcm',
        maxPlayers: 8,
      }),
    ).toBe(false);
    expect(
      isSpeedBonusEnabled({
        speedBonusEnabled: true,
        responseType: 'typing',
        maxPlayers: 1,
      }),
    ).toBe(false);
    expect(
      isSpeedBonusEnabled({
        speedBonusEnabled: true,
        responseType: 'typing',
        maxPlayers: 8,
        mode: 'solo',
      }),
    ).toBe(false);
    expect(
      isSpeedBonusEnabled({
        speedBonusEnabled: true,
        responseType: 'typing',
        maxPlayers: 8,
        gameType: 'timeAttack',
      }),
    ).toBe(false);
  });
});

describe('maxSpeedBonusPointsPerRound', () => {
  it('returns typing base + max podium bonus', () => {
    expect(maxSpeedBonusPointsPerRound()).toBe(8);
  });
});

describe('computeSpeedProjectedPoints', () => {
  const ranked = [
    { userId: 'a', timeMs: 100 },
    { userId: 'b', timeMs: 200 },
    { userId: 'c', timeMs: 300 },
  ];

  it('returns base + podium bonus for a correct player', () => {
    expect(computeSpeedProjectedPoints(ranked, 'a', 5)).toBe(8);
    expect(computeSpeedProjectedPoints(ranked, 'c', 5)).toBe(6);
  });

  it('returns 0 when the player is not among correct answerers', () => {
    expect(computeSpeedProjectedPoints(ranked, 'z', 5)).toBe(0);
  });
});
