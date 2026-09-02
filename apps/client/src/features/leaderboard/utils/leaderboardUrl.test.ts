import { describe, expect, it } from 'vitest';
import { leaderboardSearchString, parseLeaderboardMetric } from './leaderboardUrl';

describe('leaderboard URL state', () => {
  it('defaults to XP', () => {
    expect(parseLeaderboardMetric(null)).toBe('xp');
    expect(parseLeaderboardMetric('precision')).toBe('xp');
    expect(leaderboardSearchString('xp')).toBe('');
  });

  it('keeps the metric in the query string', () => {
    expect(parseLeaderboardMetric('discoveries')).toBe('discoveries');
    expect(leaderboardSearchString('victories')).toBe('metric=victories');
  });
});
