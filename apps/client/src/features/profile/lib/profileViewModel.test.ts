import { describe, expect, it } from 'vitest';
import { INITIAL_OWN_PROFILE_STATS } from '@/features/profile/types';
import { buildOwnProfileViewModel, buildPublicProfileViewModel } from './profileViewModel';
import type { PublicProfile } from '@aniquizz/shared';

describe('profileViewModel', () => {
  it('marks the own profile history as visible', () => {
    const vm = buildOwnProfileViewModel({
      userId: 'me',
      username: 'Akira',
      avatar: 'default_avatar.png',
      role: 'USER',
      xp: 10,
      stats: INITIAL_OWN_PROFILE_STATS,
    });
    expect(vm.historyRedacted).toBe(false);
    expect(vm.status).toBe('online');
    expect(vm.username).toBe('Akira');
  });

  it('keeps a public historyRedacted flag', () => {
    const pub = {
      id: 'them',
      username: 'Bob',
      avatar: 'default_avatar.png',
      role: 'USER',
      xp: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
      status: 'offline',
      lastSeenAt: null,
      totalSongs: 0,
      discoveredSongs: 0,
      progressPercent: 0,
      bestScore: 0,
      scoreTotal: 0,
      avgXpPerGame: 0,
      avgAnswerMs: null,
      fastestAnswerMs: null,
      roundsPlayed: 0,
      multiCount: 0,
      soloCount: 0,
      playtimeMs: 0,
      history: [{ id: 'secret' }],
      historyRedacted: true,
      friends: [],
      relation: 'none',
      stats: {
        gamesPlayed: 0,
        gamesWon: 0,
        totalGuesses: 0,
        correctGuesses: 0,
        maxStreak: 0,
        winRate: 0,
        accuracy: 0,
        dailyCompletions: 0,
        dailyWins: 0,
        dailyStreak: 0,
        dailyLongestStreak: 0,
        dailyPerfectDays: 0,
        dailyTotalCorrect: 0,
        dailyTotalResponseMs: 0,
        dailyAvgRank: null,
        dailyBestRank: null,
        dailyAvgTimeMs: null,
        dailyBestTimeMs: null,
      },
    } as unknown as PublicProfile;
    const vm = buildPublicProfileViewModel(pub);
    expect(vm.historyRedacted).toBe(true);
    expect(vm.username).toBe('Bob');
  });
});
