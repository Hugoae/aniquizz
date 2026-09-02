import { describe, expect, it } from 'vitest';
import type { LeaderboardEntry, LeaderboardPodiumGroup } from '@aniquizz/shared';
import { entriesBeyondPodium } from './leaderboardList';

const xp = (id: string, rank: number): LeaderboardEntry => ({
  metric: 'xp',
  rank,
  id,
  username: id,
  avatar: 'default_avatar.png',
  level: 2,
  xp: 100,
});

describe('entriesBeyondPodium', () => {
  it('drops players already shown on the podium', () => {
    const entries = [xp('a', 1), xp('b', 2), xp('c', 4)];
    const podium: LeaderboardPodiumGroup[] = [
      { rank: 1, count: 1, entries: [xp('a', 1)] },
      { rank: 2, count: 1, entries: [xp('b', 2)] },
    ];
    expect(entriesBeyondPodium(entries, podium).map((entry) => entry.id)).toEqual(['c']);
  });
});
