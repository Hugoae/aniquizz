import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENTS,
  EMPTY_ACHIEVEMENT_PROGRESS,
  earnedAchievementIds,
  linkedProviderCount,
} from './achievements';

const none = EMPTY_ACHIEVEMENT_PROGRESS;

describe('earnedAchievementIds', () => {
  it('unlocks nothing from a fresh profile', () => {
    expect(earnedAchievementIds(none)).toEqual([]);
  });

  it('unlocks the first match at one game and the next tier at ten', () => {
    expect(earnedAchievementIds({ ...none, gamesPlayed: 1 })).toEqual(['first_match']);
    expect(earnedAchievementIds({ ...none, gamesPlayed: 10 })).toEqual([
      'first_match',
      'matches_10',
    ]);
  });

  it('keeps a threshold that is exactly met', () => {
    expect(earnedAchievementIds({ ...none, maxStreak: 5 })).toContain('streak_5');
    expect(earnedAchievementIds({ ...none, maxStreak: 4 })).not.toContain('streak_5');
  });

  it('unlocks a finished mode, an imported photo, and a linked list', () => {
    expect(earnedAchievementIds({ ...none, chronoMatches: 1 })).toContain('mode_chrono');
    expect(earnedAchievementIds({ ...none, evolvingMatches: 10 })).toContain('mode_evolving_10');
    expect(earnedAchievementIds({ ...none, customAvatar: 1 })).toEqual(['custom_avatar']);
    expect(earnedAchievementIds({ ...none, linkedList: 1 })).toEqual(['linked_list']);
    expect(earnedAchievementIds({ ...none, gamesPlayed: 250 })).toContain('matches_250');
    expect(earnedAchievementIds({ ...none, gamesPlayed: 249 })).not.toContain('matches_250');
  });

  it('follows the live catalogue and counts separate daily visits', () => {
    expect(earnedAchievementIds({ ...none, songsHeard: 10, catalogueSize: 0 })).not.toContain(
      'heard_all',
    );
    expect(earnedAchievementIds({ ...none, songsHeard: 10, catalogueSize: 11 })).not.toContain(
      'heard_all',
    );
    expect(earnedAchievementIds({ ...none, songsHeard: 11, catalogueSize: 11 })).toContain(
      'heard_all',
    );
    expect(earnedAchievementIds({ ...none, dailyCompletions: 50 })).toContain('daily_50');
    expect(earnedAchievementIds({ ...none, multiMatches: 1 })).toContain('multi_1');
    expect(
      earnedAchievementIds({
        ...none,
        standardMatches: 1,
        chronoMatches: 1,
        evolvingMatches: 1,
        modesPlayed: 3,
      }),
    ).toContain('modes_all');
    expect(earnedAchievementIds({ ...none, evolvingSnaps: 1 })).toContain('evolving_snap');
    expect(earnedAchievementIds({ ...none, multiWins: 1 })).toContain('multi_win');
    expect(earnedAchievementIds({ ...none, songsFound: 25 })).toContain('found_25');
  });

  it('counts each linked list, and ignores a blank name', () => {
    expect(linkedProviderCount(null, null)).toBe(0);
    expect(linkedProviderCount('  ', '')).toBe(0);
    expect(linkedProviderCount('AniUser', null)).toBe(1);
    expect(linkedProviderCount(null, 'MalUser')).toBe(1);
    expect(linkedProviderCount('AniUser', 'MalUser')).toBe(2);
  });

  it('pays XP only, and every id is unique', () => {
    const ids = ACHIEVEMENTS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ACHIEVEMENTS.every((item) => item.xp > 0)).toBe(true);
  });
});
