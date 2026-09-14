import { describe, expect, it } from 'vitest';
import { dailyAdminCanVoidRound, dailyAdminLineupLocked } from './dailyAdminLock';

describe('dailyAdminLineupLocked', () => {
  it('locks past days even with no attempts', () => {
    expect(dailyAdminLineupLocked('2026-09-13', '2026-09-14', 0)).toBe(true);
  });

  it('keeps today editable until the first attempt', () => {
    expect(dailyAdminLineupLocked('2026-09-14', '2026-09-14', 0)).toBe(false);
    expect(dailyAdminLineupLocked('2026-09-14', '2026-09-14', 1)).toBe(true);
  });

  it('keeps future days editable', () => {
    expect(dailyAdminLineupLocked('2026-09-15', '2026-09-14', 0)).toBe(false);
  });
});

describe('dailyAdminCanVoidRound', () => {
  it('allows void only on a live day with attempts', () => {
    expect(dailyAdminCanVoidRound('2026-09-14', '2026-09-14', 1)).toBe(true);
    expect(dailyAdminCanVoidRound('2026-09-14', '2026-09-14', 0)).toBe(false);
    expect(dailyAdminCanVoidRound('2026-09-15', '2026-09-14', 1)).toBe(false);
  });
});
