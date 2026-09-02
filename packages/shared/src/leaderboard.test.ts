import { describe, expect, it } from 'vitest';
import {
  accuracyPercent,
  clampLeaderboardPageSize,
  coveragePercent,
  isAccuracyEligible,
  isLeaderboardMetric,
  LEADERBOARD_ACCURACY_MIN_ROUNDS,
  LEADERBOARD_DEFAULT_PAGE_SIZE,
  LEADERBOARD_MAX_PAGE_SIZE,
  pageForRow,
  winRatePercent,
} from './leaderboard';

describe('leaderboard helpers', () => {
  it('accepts only the five public metrics', () => {
    expect(isLeaderboardMetric('xp')).toBe(true);
    expect(isLeaderboardMetric('discoveries')).toBe(true);
    expect(isLeaderboardMetric('accuracy')).toBe(true);
    expect(isLeaderboardMetric('streak')).toBe(false);
    expect(isLeaderboardMetric('precision')).toBe(false);
    expect(isLeaderboardMetric('level')).toBe(false);
  });

  it('clamps page size to the public bounds', () => {
    expect(clampLeaderboardPageSize(undefined)).toBe(LEADERBOARD_DEFAULT_PAGE_SIZE);
    expect(clampLeaderboardPageSize(0)).toBe(1);
    expect(clampLeaderboardPageSize(80)).toBe(LEADERBOARD_MAX_PAGE_SIZE);
  });

  it('rounds accuracy to one decimal without treating 1/1 as a leader', () => {
    expect(accuracyPercent(1, 1)).toBe(100);
    expect(isAccuracyEligible(1)).toBe(false);
    expect(isAccuracyEligible(LEADERBOARD_ACCURACY_MIN_ROUNDS - 1)).toBe(false);
    expect(isAccuracyEligible(LEADERBOARD_ACCURACY_MIN_ROUNDS)).toBe(true);
    expect(accuracyPercent(43, 50)).toBe(86);
    expect(accuracyPercent(87, 100)).toBe(87);
  });

  it('keeps equal ratios equal after rounding', () => {
    expect(accuracyPercent(40, 50)).toBe(accuracyPercent(80, 100));
  });

  it('computes win rate and catalogue coverage', () => {
    expect(winRatePercent(3, 4)).toBe(75);
    expect(winRatePercent(0, 0)).toBe(0);
    expect(coveragePercent(150, 1000)).toBe(15);
  });

  it('maps a global row number onto the paginated page', () => {
    expect(pageForRow(1, 25)).toBe(1);
    expect(pageForRow(25, 25)).toBe(1);
    expect(pageForRow(26, 25)).toBe(2);
  });
});
