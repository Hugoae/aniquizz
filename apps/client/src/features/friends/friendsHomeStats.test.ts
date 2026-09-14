import { describe, expect, it } from 'vitest';
import { shouldIntervalPollFriendsHomeStats } from './friendsHomeStats';

describe('shouldIntervalPollFriendsHomeStats', () => {
  it('polls on Home and when the bubble is open, not on /play lobby', () => {
    expect(shouldIntervalPollFriendsHomeStats('/', false)).toBe(true);
    expect(shouldIntervalPollFriendsHomeStats('/play', true)).toBe(true);
    expect(shouldIntervalPollFriendsHomeStats('/play', false)).toBe(false);
    expect(shouldIntervalPollFriendsHomeStats('/play/join', false)).toBe(false);
  });
});
