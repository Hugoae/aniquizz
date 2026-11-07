import { describe, expect, it } from 'vitest';
import { addCalendarDays } from '@aniquizz/shared';
import { exclusionsBefore, exclusionsByDate } from './dailyExclusions';

const TODAY = '2026-10-17';

describe('exclusionsBefore', () => {
  it('keeps a song inside 60 days and a franchise key inside 14', () => {
    const sets = exclusionsBefore(TODAY, [
      {
        day: addCalendarDays(TODAY, -10),
        songId: 1,
        franchiseKey: 'franchise-1',
      },
    ]);
    expect([...sets.songIds]).toEqual([1]);
    expect([...sets.franchiseKeys]).toEqual(['franchise-1']);
  });

  it('counts a song in the 15–60 day band without its franchise key', () => {
    const sets = exclusionsBefore(TODAY, [
      {
        day: addCalendarDays(TODAY, -15),
        songId: 2,
        franchiseKey: 'franchise-2',
      },
    ]);
    expect(sets.songIds.has(2)).toBe(true);
    expect(sets.franchiseKeys.size).toBe(0);
  });

  it('drops songs older than 60 days and songs on the target day', () => {
    const sets = exclusionsBefore(TODAY, [
      { day: addCalendarDays(TODAY, -61), songId: 3, franchiseKey: 'old' },
      { day: TODAY, songId: 4, franchiseKey: 'today' },
      { day: addCalendarDays(TODAY, -60), songId: 5, franchiseKey: null },
    ]);
    expect([...sets.songIds]).toEqual([5]);
    expect(sets.franchiseKeys.size).toBe(0);
  });
});

describe('exclusionsByDate', () => {
  it('does not treat a later challenge as history for an earlier day', () => {
    const earlier = '2026-10-10';
    const later = '2026-10-17';
    const map = exclusionsByDate(
      [earlier, later],
      [{ day: '2026-10-12', songId: 9, franchiseKey: 'later-only' }],
    );
    expect(map.get(earlier)?.songIds.has(9)).toBe(false);
    expect(map.get(later)?.songIds.has(9)).toBe(true);
    expect(map.get(later)?.franchiseKeys.has('later-only')).toBe(true);
  });
});
