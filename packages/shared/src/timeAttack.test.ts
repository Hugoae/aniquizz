import { describe, expect, it } from 'vitest';
import {
  TIME_ATTACK_DEFAULT_BUDGET_SECONDS,
  TIME_ATTACK_MAX_BUDGET_SECONDS,
  TIME_ATTACK_MAX_CLIP_SECONDS,
  TIME_ATTACK_MIN_BUDGET_SECONDS,
  TIME_ATTACK_MIN_CLIP_SECONDS,
  TIME_ATTACK_REVEAL_SECONDS,
  TIME_ATTACK_SKIP_TAX_MS,
  TIME_ATTACK_START_SAFETY_SECONDS,
  applyTimeAttackTax,
  clipGuessSeconds,
  isTimeAttackGame,
  isTimeAttackRace,
  isTimeAttackSettings,
  normalizeTimeBudgetSeconds,
  timeAttackClipWindow,
  timeAttackMedal,
  timeAttackMedalRules,
  timeAttackMedalTargets,
  timeAttackNextMedalGoal,
  timeAttackPoolSize,
  timeAttackShortestTitleSeconds,
  timeAttackStreakGrantMs,
  timeAttackTaxMs,
  normalizeTimeAttackStreakBonusSeconds,
  normalizeTimeAttackStreakLength,
  formatTimeAttackClock,
  seatCapForSettings,
  timeAttackLaunchBlock,
  timeAttackRaceOccupancyBlock,
} from './timeAttack';

describe('normalizeTimeBudgetSeconds', () => {
  it('snaps to a 30 s step between 1 and 5 minutes', () => {
    expect(TIME_ATTACK_MIN_BUDGET_SECONDS).toBe(60);
    expect(TIME_ATTACK_MAX_BUDGET_SECONDS).toBe(300);
    expect(TIME_ATTACK_DEFAULT_BUDGET_SECONDS).toBe(180);
    expect(normalizeTimeBudgetSeconds(60)).toBe(60);
    expect(normalizeTimeBudgetSeconds(90)).toBe(90);
    expect(normalizeTimeBudgetSeconds(75)).toBe(90);
    expect(normalizeTimeBudgetSeconds(20)).toBe(60);
    expect(normalizeTimeBudgetSeconds(400)).toBe(300);
    expect(normalizeTimeBudgetSeconds(undefined)).toBe(180);
  });
});

describe('timeAttackPoolSize', () => {
  it('sizes the pool from the budget with a 20–80 clamp', () => {
    expect(timeAttackPoolSize(60)).toBe(20);
    expect(timeAttackPoolSize(180)).toBe(60);
    expect(timeAttackPoolSize(300)).toBe(80);
  });

  it('covers the budget when every title is a late start or a minimum skip', () => {
    const fastest = timeAttackShortestTitleSeconds();
    expect(fastest).toBe(Math.min(TIME_ATTACK_MIN_CLIP_SECONDS, TIME_ATTACK_SKIP_TAX_MS / 1000));
    for (
      let budget = TIME_ATTACK_MIN_BUDGET_SECONDS;
      budget <= TIME_ATTACK_MAX_BUDGET_SECONDS;
      budget += 30
    ) {
      const pool = timeAttackPoolSize(budget);
      expect(pool * fastest).toBeGreaterThanOrEqual(budget);
      expect(pool * TIME_ATTACK_MIN_CLIP_SECONDS).toBeGreaterThanOrEqual(budget);
    }
  });

  it('draws enough titles to cover one extra budget when the prime is on', () => {
    const fastest = timeAttackShortestTitleSeconds();
    expect(timeAttackPoolSize(60, true)).toBe(40);
    expect(timeAttackPoolSize(180, true)).toBe(120);
    expect(timeAttackPoolSize(300, true)).toBe(200);
    for (
      let budget = TIME_ATTACK_MIN_BUDGET_SECONDS;
      budget <= TIME_ATTACK_MAX_BUDGET_SECONDS;
      budget += 30
    ) {
      const pool = timeAttackPoolSize(budget, true);
      expect(pool * fastest).toBeGreaterThanOrEqual(budget * 2);
    }
  });
});

describe('timeAttackStreakGrantMs', () => {
  it('pays on each multiple of the required streak and keeps a zero streak unpaid', () => {
    const base = {
      enabled: true,
      required: 5,
      bonusSeconds: 5,
      grantedMs: 0,
      remainingMs: 0,
      budgetSeconds: 180,
    };
    expect(timeAttackStreakGrantMs({ ...base, enabled: false, streak: 5 })).toBe(0);
    expect(timeAttackStreakGrantMs({ ...base, streak: 0 })).toBe(0);
    expect(timeAttackStreakGrantMs({ ...base, streak: 4 })).toBe(0);
    expect(timeAttackStreakGrantMs({ ...base, streak: 5 })).toBe(5_000);
    expect(timeAttackStreakGrantMs({ ...base, streak: 10, bonusSeconds: 10 })).toBe(10_000);
  });

  it('stops at one extra starting budget, shortening the last prime', () => {
    expect(
      timeAttackStreakGrantMs({
        enabled: true,
        streak: 3,
        required: 3,
        bonusSeconds: 5,
        grantedMs: 58_000,
        remainingMs: 0,
        budgetSeconds: 60,
      }),
    ).toBe(2_000);
    expect(
      timeAttackStreakGrantMs({
        enabled: true,
        streak: 6,
        required: 3,
        bonusSeconds: 5,
        grantedMs: 60_000,
        remainingMs: 0,
        budgetSeconds: 60,
      }),
    ).toBe(0);
  });

  it('stops at the chosen duration, shortening a prime that would cross it', () => {
    expect(
      timeAttackStreakGrantMs({
        enabled: true,
        streak: 5,
        required: 5,
        bonusSeconds: 5,
        grantedMs: 0,
        remainingMs: 178_000,
        budgetSeconds: 180,
      }),
    ).toBe(2_000);
    expect(
      timeAttackStreakGrantMs({
        enabled: true,
        streak: 5,
        required: 5,
        bonusSeconds: 5,
        grantedMs: 0,
        remainingMs: 180_000,
        budgetSeconds: 180,
      }),
    ).toBe(0);
  });

  it('clamps the sliders into 3–10 and defaults an empty value to 5', () => {
    expect(normalizeTimeAttackStreakLength(undefined)).toBe(5);
    expect(normalizeTimeAttackStreakLength(2)).toBe(3);
    expect(normalizeTimeAttackStreakLength(10)).toBe(10);
    expect(normalizeTimeAttackStreakLength(11)).toBe(10);
    expect(normalizeTimeAttackStreakBonusSeconds(undefined)).toBe(5);
    expect(normalizeTimeAttackStreakBonusSeconds(1)).toBe(3);
    expect(normalizeTimeAttackStreakBonusSeconds(15)).toBe(10);
  });
});

describe('timeAttackClipWindow', () => {
  const tail = TIME_ATTACK_REVEAL_SECONDS + TIME_ATTACK_START_SAFETY_SECONDS;

  it('plays the catalogue clip from the beginning', () => {
    expect(timeAttackClipWindow(90, 'beginning', () => 0.99)).toEqual({
      videoStartTime: 0,
      guessDuration: 90,
    });
    expect(timeAttackClipWindow(4, 'beginning')).toEqual({ videoStartTime: 0, guessDuration: 8 });
  });

  it('stays at the beginning when the file cannot fit a late start', () => {
    expect(timeAttackClipWindow(12, 'random', () => 0.99)).toEqual({
      videoStartTime: 0,
      guessDuration: 12,
    });
    expect(timeAttackClipWindow(null, 'random', () => 0.99)).toEqual({
      videoStartTime: 0,
      guessDuration: TIME_ATTACK_MAX_CLIP_SECONDS,
    });
  });

  it('starts near the end and keeps at least the minimum clip plus the reveal tail', () => {
    const duration = 90;
    const window = timeAttackClipWindow(duration, 'random', () => 0.999999);
    expect(window.videoStartTime).toBeGreaterThan(0);
    expect(window.guessDuration).toBeGreaterThanOrEqual(TIME_ATTACK_MIN_CLIP_SECONDS);
    expect(window.guessDuration).toBeLessThanOrEqual(TIME_ATTACK_MAX_CLIP_SECONDS);
    expect(window.videoStartTime + window.guessDuration + tail).toBeLessThanOrEqual(duration);
  });

  it('caps a late start on a long file at the maximum clip', () => {
    const window = timeAttackClipWindow(240, 'random', () => 0);
    expect(window).toEqual({ videoStartTime: 0, guessDuration: 90 });
    const late = timeAttackClipWindow(240, 'random', () => 0.5);
    expect(late.videoStartTime).toBeGreaterThan(0);
    expect(late.guessDuration).toBe(TIME_ATTACK_MAX_CLIP_SECONDS);
    expect(late.videoStartTime + late.guessDuration + tail).toBeLessThanOrEqual(240);
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

describe('timeAttackTaxMs', () => {
  it('escalates skips 5 / 7 / 9 s up to a cap and keeps wrong flat', () => {
    expect([0, 1, 2, 3].map((n) => timeAttackTaxMs('skip', n))).toEqual([5000, 7000, 9000, 11000]);
    expect(timeAttackTaxMs('skip', 50)).toBe(15_000);
    expect(timeAttackTaxMs('wrong', 9)).toBe(3000);
    expect(timeAttackTaxMs('skip', 4, false)).toBe(5000);
    expect(applyTimeAttackTax(20_000, 'skip', 2)).toBe(11_000);
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

describe('versus detection', () => {
  const room = (mode: string, maxPlayers: number, gameType: 'timeAttack' | 'standard') => ({
    gameType,
    mode,
    maxPlayers,
  });

  it('splits solo runs from versus races', () => {
    expect(isTimeAttackRace(room('multiplayer', 4, 'timeAttack'))).toBe(true);
    expect(isTimeAttackSettings(room('multiplayer', 4, 'timeAttack'))).toBe(false);
    expect(isTimeAttackRace(room('solo', 1, 'timeAttack'))).toBe(false);
    expect(isTimeAttackRace(room('multiplayer', 4, 'standard'))).toBe(false);
  });

  it('isTimeAttackGame covers both shapes', () => {
    expect(isTimeAttackGame(room('solo', 1, 'timeAttack'))).toBe(true);
    expect(isTimeAttackGame(room('multiplayer', 4, 'timeAttack'))).toBe(true);
    expect(isTimeAttackGame(room('multiplayer', 4, 'standard'))).toBe(false);
    expect(isTimeAttackGame(null)).toBe(false);
  });
});

describe('timeAttackMedal', () => {
  it('uses 4/5/7/9 found per minute on medium franchise', () => {
    expect(TIME_ATTACK_REVEAL_SECONDS).toBe(3);
    expect(timeAttackMedal(11, 180, ['medium'], 'franchise')).toBeNull();
    expect(timeAttackMedal(12, 180, ['medium'], 'franchise')).toBe('bronze');
    expect(timeAttackMedal(15, 180, ['medium'], 'franchise')).toBe('silver');
    expect(timeAttackMedal(21, 180, ['medium'], 'franchise')).toBe('gold');
    expect(timeAttackMedal(27, 180, ['medium'], 'franchise')).toBe('platinum');
  });

  it('lowers the bar on harder songs and anime precision', () => {
    expect(timeAttackMedal(12, 180, ['medium'], 'franchise')).toBe('bronze');
    // hard bronze = round(4 * 3 * 0.45/0.5) = 11
    expect(timeAttackMedal(10, 180, ['hard'], 'franchise')).toBeNull();
    expect(timeAttackMedal(11, 180, ['hard'], 'franchise')).toBe('bronze');
    expect(timeAttackMedal(11, 180, ['medium'], 'anime')).toBe('bronze');
  });

  it('reports the next found-count bar', () => {
    expect(timeAttackNextMedalGoal(11, 180, ['medium'], null, 'franchise')?.pointsNeeded).toBe(1);
    expect(timeAttackNextMedalGoal(27, 180, ['medium'], 'platinum', 'franchise')).toBeNull();
  });

  it('eases the bar when punitive skip is on and raises it with the streak prime', () => {
    const punitive = timeAttackMedalRules({ timeAttackPunitiveSkip: true });
    expect(timeAttackMedalTargets(180, ['medium'], 'franchise', punitive)).toEqual({
      bronze: 11,
      silver: 14,
      gold: 19,
      platinum: 25,
    });

    const prime = timeAttackMedalRules({
      timeAttackPunitiveSkip: false,
      timeAttackStreakBonus: true,
      timeAttackStreakLength: 5,
      timeAttackStreakBonusSeconds: 5,
    });
    expect(timeAttackMedalTargets(180, ['medium'], 'franchise', prime)).toEqual({
      bronze: 13,
      silver: 17,
      gold: 23,
      platinum: 30,
    });

    const greedy = timeAttackMedalRules({
      timeAttackPunitiveSkip: false,
      timeAttackStreakBonus: true,
      timeAttackStreakLength: 3,
      timeAttackStreakBonusSeconds: 10,
    });
    expect(timeAttackMedalTargets(180, ['medium'], 'franchise', greedy).platinum).toBe(31);
    expect(timeAttackMedalTargets(180, ['medium'], 'franchise', greedy).bronze).toBe(14);
  });
});

describe('formatTimeAttackClock', () => {
  it('formats remaining ms as m:ss', () => {
    expect(formatTimeAttackClock(180_000)).toBe('3:00');
    expect(formatTimeAttackClock(3_001)).toBe('0:04');
    expect(formatTimeAttackClock(0)).toBe('0:00');
  });
});

describe('time-attack occupancy', () => {
  it('refuses a race once more than 8 players are seated', () => {
    expect(timeAttackRaceOccupancyBlock(8)).toBeNull();
    expect(timeAttackRaceOccupancyBlock(16)).toMatch(/8 joueurs maximum/);
    expect(
      timeAttackLaunchBlock(16, { gameType: 'timeAttack', mode: 'multiplayer', maxPlayers: 16 }),
    ).toMatch(/8 joueurs maximum/);
  });

  it('refuses a solo-shaped Chrono when several players are already in the room', () => {
    expect(
      timeAttackLaunchBlock(4, { gameType: 'timeAttack', mode: 'solo', maxPlayers: 1 }),
    ).toMatch(/en course/);
    expect(
      timeAttackLaunchBlock(1, { gameType: 'timeAttack', mode: 'solo', maxPlayers: 1 }),
    ).toBeNull();
  });

  it('caps seats for a race and for Evolving', () => {
    expect(
      seatCapForSettings({ gameType: 'timeAttack', mode: 'multiplayer', maxPlayers: 16 }),
    ).toBe(8);
    expect(seatCapForSettings({ gameType: 'timeAttack', mode: 'solo', maxPlayers: 1 })).toBe(1);
    expect(seatCapForSettings({ gameType: 'evolving', mode: 'solo', maxPlayers: 8 })).toBe(1);
    expect(seatCapForSettings({ gameType: 'standard', mode: 'multiplayer', maxPlayers: 16 })).toBe(
      16,
    );
  });
});
