import { describe, expect, it } from 'vitest';
import {
  dailyAttemptLabel,
  formatDailyAdminDate,
  formatClipTimestamp,
  toLibraryDifficulty,
} from './dailyAdminFormat';
import { dailyAdminWarningLabel } from './dailyAdminCopy';

describe('daily admin labels', () => {
  it('formats the Paris calendar date in French without shifting the day', () => {
    expect(formatDailyAdminDate('2026-09-14')).toMatch(/14 septembre 2026/i);
  });

  it('maps snapshot difficulties onto library tokens', () => {
    expect(toLibraryDifficulty('easy')).toBe('EASY');
    expect(toLibraryDifficulty('HARD')).toBe('HARD');
    expect(toLibraryDifficulty('medium')).toBe('MEDIUM');
  });

  it('counts attempts in French', () => {
    const copy = {
      attemptsNone: 'Aucune tentative',
      attemptsOne: '1 tentative',
      attemptsMany: (count: number) => `${count} tentatives`,
    };
    expect(dailyAttemptLabel(0, copy)).toBe('Aucune tentative');
    expect(dailyAttemptLabel(2, copy)).toBe('2 tentatives');
  });

  it('formats clip start as m:ss', () => {
    expect(formatClipTimestamp(0)).toBe('0:00');
    expect(formatClipTimestamp(83)).toBe('1:23');
  });

  it('translates known generator warning codes', () => {
    expect(dailyAdminWarningLabel('difficulty_mix', 'fallback')).toMatch(/faciles/);
    expect(dailyAdminWarningLabel('duplicate_franchise', 'fallback')).toMatch(/franchise/);
    expect(dailyAdminWarningLabel('recent_franchise', 'fallback')).toMatch(/14/);
    expect(dailyAdminWarningLabel('unknown', 'fallback')).toBe('fallback');
  });
});
