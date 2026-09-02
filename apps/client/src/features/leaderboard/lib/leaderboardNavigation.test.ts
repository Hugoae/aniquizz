import { describe, expect, it } from 'vitest';
import {
  getLeaderboardReturnMetric,
  getProfileFromLeaderboardState,
  leaderboardPath,
  profileFromLeaderboardState,
  profilePathFromLeaderboard,
} from './leaderboardNavigation';

describe('leaderboard navigation state', () => {
  it('round-trips the metric so profile back restores the tab', () => {
    const state = profileFromLeaderboardState('discoveries');
    expect(getProfileFromLeaderboardState(state)).toEqual(state);
    expect(leaderboardPath('discoveries')).toBe('/leaderboard?metric=discoveries');
    expect(leaderboardPath('xp')).toBe('/leaderboard');
    expect(getProfileFromLeaderboardState({ returnTo: '/admin' })).toBeNull();
    expect(getProfileFromLeaderboardState({ returnTo: '/leaderboard', metric: 'nope' })).toBeNull();
  });

  it('reads the metric from the profile URL after a refresh', () => {
    expect(profilePathFromLeaderboard('abc', 'victories')).toBe(
      '/profile/abc?from=leaderboard&metric=victories',
    );
    expect(getLeaderboardReturnMetric(null, '?from=leaderboard&metric=games')).toBe('games');
    expect(getLeaderboardReturnMetric(null, '?from=leaderboard')).toBe('xp');
    expect(getLeaderboardReturnMetric(null, '')).toBeNull();
    expect(getLeaderboardReturnMetric(profileFromLeaderboardState('accuracy'), '')).toBe('accuracy');
  });
});
