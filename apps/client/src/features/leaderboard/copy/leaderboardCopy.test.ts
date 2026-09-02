import { describe, expect, it } from 'vitest';
import type { LeaderboardEntry } from '@aniquizz/shared';
import {
  formatLeaderboardAnnouncement,
  formatLeaderboardDetail,
  formatLeaderboardValue,
} from './leaderboardCopy';

const discoveries = (discoveriesCount: number): LeaderboardEntry => ({
  metric: 'discoveries',
  rank: 1,
  id: 'p1',
  username: 'Ada',
  avatar: 'default_avatar.png',
  level: 4,
  discoveries: discoveriesCount,
});

describe('leaderboard value copy', () => {
  it('shows Pokédex as a discovery count only', () => {
    const entry = discoveries(248);
    expect(formatLeaderboardValue(entry)).toBe('248');
    expect(formatLeaderboardDetail(entry)).toBeNull();
    expect(formatLeaderboardAnnouncement(entry)).toBe('248 découvertes');
  });

  it('keeps victories as a win count with games and win rate as detail', () => {
    const entry: LeaderboardEntry = {
      metric: 'victories',
      rank: 1,
      id: 'p1',
      username: 'Ada',
      avatar: 'default_avatar.png',
      level: 8,
      gamesWon: 27,
      gamesPlayed: 35,
      winRate: 77,
    };
    expect(formatLeaderboardValue(entry)).toBe('27');
    expect(formatLeaderboardDetail(entry)).toBe('35 parties · 77 %');
    expect(formatLeaderboardAnnouncement(entry)).toBe('27 victoires, 35 parties · 77 %');
  });

  it('does not repeat the level under the name', () => {
    expect(
      formatLeaderboardDetail({
        metric: 'xp',
        rank: 4,
        id: 'p1',
        username: 'Ada',
        avatar: 'default_avatar.png',
        level: 3,
        xp: 200,
      }),
    ).toBeNull();
  });
});
