import { describe, expect, it } from 'vitest';
import { profileXpFields, xpEarnedForUser } from './matchXpProfile';

describe('xpEarnedForUser', () => {
  const rankings = [
    { id: 'user-a', xpEarned: 12 },
    { id: 'user-b', xpEarned: 0 },
    { id: 3, xpEarned: 4 },
  ];

  it('returns the matching row XP', () => {
    expect(xpEarnedForUser(rankings, 'user-a')).toBe(12);
    expect(xpEarnedForUser(rankings, '3')).toBe(4);
  });

  it('returns 0 when the player earned nothing', () => {
    expect(xpEarnedForUser(rankings, 'user-b')).toBe(0);
  });

  it('returns null when the player is missing or XP is not a number', () => {
    expect(xpEarnedForUser(rankings, 'user-z')).toBeNull();
    expect(xpEarnedForUser([{ id: 'user-a' }], 'user-a')).toBeNull();
    expect(xpEarnedForUser([{ id: 'user-a', xpEarned: Number.NaN }], 'user-a')).toBeNull();
  });
});

describe('profileXpFields', () => {
  it('keeps a non-negative integer total and derives the level', () => {
    expect(profileXpFields(0)).toEqual({ xp: 0, level: 1 });
    expect(profileXpFields(12.4)).toEqual({ xp: 12, level: 1 });
    expect(profileXpFields(-8)).toEqual({ xp: 0, level: 1 });
  });
});
