import { describe, expect, it } from 'vitest';
import {
  TIME_ATTACK_BUDGETS_SECONDS,
  TIME_ATTACK_DEFAULT_BUDGET_SECONDS,
  TIME_ATTACK_REVEAL_SECONDS,
  applyTimeAttackTax,
  clipGuessSeconds,
  isTimeAttackSettings,
  normalizeTimeBudgetSeconds,
  timeAttackMedal,
  timeAttackNextMedalGoal,
  timeAttackPoolSize,
  formatTimeAttackClock,
} from './timeAttack';

describe('normalizeTimeBudgetSeconds', () => {
  it('keeps the four presets and defaults to 3 minutes', () => {
    expect(TIME_ATTACK_BUDGETS_SECONDS).toEqual([60, 120, 180, 300]);
    expect(TIME_ATTACK_DEFAULT_BUDGET_SECONDS).toBe(180);
    expect(normalizeTimeBudgetSeconds(60)).toBe(60);
    expect(normalizeTimeBudgetSeconds(180)).toBe(180);
    expect(normalizeTimeBudgetSeconds(90)).toBe(180);
    expect(normalizeTimeBudgetSeconds(undefined)).toBe(180);
  });
});

describe('timeAttackPoolSize', () => {
  it('sizes the pool from the budget with a 20–80 clamp', () => {
    expect(timeAttackPoolSize(60)).toBe(20);
    expect(timeAttackPoolSize(180)).toBe(60);
    expect(timeAttackPoolSize(300)).toBe(80);
  });
});

describe('clipGuessSeconds', () => {
  it('uses catalogue duration with an 8–90s clamp', () => {
    expect(clipGuessSeconds(45)).toBe(45);
    expect(clipGuessSeconds(null)).toBe(90);
    expect(clipGuessSeconds(undefined)).toBe(90);
    expect(clipGuessSeconds(4)).toBe(8);
    expect(clipGuessSeconds(140)).toBe(90);
  });
});

describe('applyTimeAttackTax', () => {
  it('subtracts skip and wrong taxes without going below zero', () => {
    expect(applyTimeAttackTax(20_000, 'skip')).toBe(15_000);
    expect(applyTimeAttackTax(20_000, 'wrong')).toBe(17_000);
    expect(applyTimeAttackTax(2_000, 'skip')).toBe(0);
    expect(applyTimeAttackTax(0, 'wrong')).toBe(0);
  });
});

describe('isTimeAttackSettings', () => {
  it('is solo timeAttack only', () => {
    expect(
      isTimeAttackSettings({
        gameType: 'timeAttack',
        mode: 'solo',
        maxPlayers: 1,
      }),
    ).toBe(true);
    expect(
      isTimeAttackSettings({
        gameType: 'standard',
        mode: 'solo',
        maxPlayers: 1,
      }),
    ).toBe(false);
    expect(
      isTimeAttackSettings({
        gameType: 'timeAttack',
        mode: 'multiplayer',
        maxPlayers: 8,
      }),
    ).toBe(false);
  });
});

describe('timeAttackMedal', () => {
  it('uses 2/3/4/5 found per minute on medium franchise', () => {
    expect(TIME_ATTACK_REVEAL_SECONDS).toBe(3);
    expect(timeAttackMedal(5, 180, ['medium'], 'franchise')).toBeNull();
    expect(timeAttackMedal(6, 180, ['medium'], 'franchise')).toBe('bronze');
    expect(timeAttackMedal(9, 180, ['medium'], 'franchise')).toBe('silver');
    expect(timeAttackMedal(12, 180, ['medium'], 'franchise')).toBe('gold');
    expect(timeAttackMedal(15, 180, ['medium'], 'franchise')).toBe('platinum');
  });

  it('lowers the bar on harder songs and anime precision', () => {
    const mediumBronze = timeAttackMedal(6, 180, ['medium'], 'franchise');
    expect(mediumBronze).toBe('bronze');
    expect(timeAttackMedal(5, 180, ['hard'], 'franchise')).toBe('bronze');
    expect(timeAttackMedal(5, 180, ['medium'], 'anime')).toBe('bronze');
  });

  it('reports the next found-count bar', () => {
    expect(timeAttackNextMedalGoal(5, 180, ['medium'], null, 'franchise')?.pointsNeeded).toBe(1);
    expect(timeAttackNextMedalGoal(15, 180, ['medium'], 'platinum', 'franchise')).toBeNull();
  });
});

describe('formatTimeAttackClock', () => {
  it('formats remaining ms as m:ss', () => {
    expect(formatTimeAttackClock(180_000)).toBe('3:00');
    expect(formatTimeAttackClock(3_001)).toBe('0:04');
    expect(formatTimeAttackClock(0)).toBe('0:00');
  });
});
