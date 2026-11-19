/**
 * Profile achievements. Thresholds are checked against counters the server
 * already stores. Opening the profile grants any that are newly met, once.
 * Rewards are XP only.
 */

export interface AchievementProgress {
  gamesPlayed: number;
  gamesWon: number;
  correctGuesses: number;
  maxStreak: number;
  dailyCompletions: number;
  dailyLongestStreak: number;
  dailyPerfectDays: number;
  songsHeard: number;
  medals: number;
  platinums: number;
  friends: number;
  likes: number;
  /** Finished Standard matches. */
  standardMatches: number;
  /** Finished Contre-la-montre matches. */
  chronoMatches: number;
  /** Finished Évolutif matches. */
  evolvingMatches: number;
  /** 1 when the player uploaded a photo, 0 for a preset. */
  customAvatar: number;
  /** Linked list accounts: AniList and MyAnimeList each count. */
  linkedList: number;
  /** Finished matches with at least one other player. */
  multiMatches: number;
  /** Finished multiplayer matches this player won. */
  multiWins: number;
  /** How many of Standard, Contre-la-montre, and Évolutif have been finished. */
  modesPlayed: number;
  /** Correct Évolutif answers on the first excerpt. */
  evolvingSnaps: number;
  /** Distinct playable songs this player has answered correctly. */
  songsFound: number;
  /** Playable songs right now. The full-catalogue success uses this as its goal. */
  catalogueSize: number;
}

export const EMPTY_ACHIEVEMENT_PROGRESS: AchievementProgress = {
  gamesPlayed: 0,
  gamesWon: 0,
  correctGuesses: 0,
  maxStreak: 0,
  dailyCompletions: 0,
  dailyLongestStreak: 0,
  dailyPerfectDays: 0,
  songsHeard: 0,
  medals: 0,
  platinums: 0,
  friends: 0,
  likes: 0,
  standardMatches: 0,
  chronoMatches: 0,
  evolvingMatches: 0,
  customAvatar: 0,
  linkedList: 0,
  multiMatches: 0,
  multiWins: 0,
  modesPlayed: 0,
  evolvingSnaps: 0,
  songsFound: 0,
  catalogueSize: 0,
};

export const ACHIEVEMENT_GROUP_ORDER = [
  'matches',
  'daily',
  'modes',
  'collection',
  'profile',
] as const;

export type AchievementGroup = (typeof ACHIEVEMENT_GROUP_ORDER)[number];

/**
 * Standard matches stored with the speed podium use `SPRINT`.
 * They still count as Standard for the mode successes.
 */
export const STANDARD_MATCH_MODES = ['STANDARD', 'SPRINT'] as const;

export const ACHIEVEMENTS = [
  { id: 'first_match', group: 'matches', metric: 'gamesPlayed', threshold: 1, xp: 70 },
  { id: 'matches_10', group: 'matches', metric: 'gamesPlayed', threshold: 10, xp: 250 },
  { id: 'matches_50', group: 'matches', metric: 'gamesPlayed', threshold: 50, xp: 1_300 },
  { id: 'matches_100', group: 'matches', metric: 'gamesPlayed', threshold: 100, xp: 3_500 },
  { id: 'matches_250', group: 'matches', metric: 'gamesPlayed', threshold: 250, xp: 13_000 },
  { id: 'matches_500', group: 'matches', metric: 'gamesPlayed', threshold: 500, xp: 35_000 },
  { id: 'first_win', group: 'matches', metric: 'gamesWon', threshold: 1, xp: 120 },
  { id: 'wins_10', group: 'matches', metric: 'gamesWon', threshold: 10, xp: 700 },
  { id: 'wins_50', group: 'matches', metric: 'gamesWon', threshold: 50, xp: 3_500 },
  { id: 'wins_100', group: 'matches', metric: 'gamesWon', threshold: 100, xp: 10_000 },
  { id: 'correct_100', group: 'matches', metric: 'correctGuesses', threshold: 100, xp: 500 },
  { id: 'correct_1000', group: 'matches', metric: 'correctGuesses', threshold: 1000, xp: 4_500 },
  { id: 'correct_5000', group: 'matches', metric: 'correctGuesses', threshold: 5000, xp: 20_000 },
  { id: 'streak_5', group: 'matches', metric: 'maxStreak', threshold: 5, xp: 180 },
  { id: 'streak_10', group: 'matches', metric: 'maxStreak', threshold: 10, xp: 700 },
  { id: 'streak_25', group: 'matches', metric: 'maxStreak', threshold: 25, xp: 2_500 },
  { id: 'streak_50', group: 'matches', metric: 'maxStreak', threshold: 50, xp: 9_000 },
  { id: 'first_medal', group: 'matches', metric: 'medals', threshold: 1, xp: 250 },
  { id: 'medals_10', group: 'matches', metric: 'medals', threshold: 10, xp: 2_500 },
  { id: 'platinum', group: 'matches', metric: 'platinums', threshold: 1, xp: 1_000 },
  { id: 'platinums_5', group: 'matches', metric: 'platinums', threshold: 5, xp: 10_000 },
  { id: 'daily_first', group: 'daily', metric: 'dailyCompletions', threshold: 1, xp: 120 },
  { id: 'daily_50', group: 'daily', metric: 'dailyCompletions', threshold: 50, xp: 9_000 },
  { id: 'daily_streak_7', group: 'daily', metric: 'dailyLongestStreak', threshold: 7, xp: 1_200 },
  {
    id: 'daily_streak_30',
    group: 'daily',
    metric: 'dailyLongestStreak',
    threshold: 30,
    xp: 13_000,
  },
  { id: 'daily_perfect', group: 'daily', metric: 'dailyPerfectDays', threshold: 1, xp: 500 },
  { id: 'daily_perfect_5', group: 'daily', metric: 'dailyPerfectDays', threshold: 5, xp: 2_500 },
  { id: 'daily_perfect_15', group: 'daily', metric: 'dailyPerfectDays', threshold: 15, xp: 13_000 },
  { id: 'mode_standard', group: 'modes', metric: 'standardMatches', threshold: 1, xp: 180 },
  { id: 'mode_standard_25', group: 'modes', metric: 'standardMatches', threshold: 25, xp: 2_500 },
  { id: 'mode_chrono', group: 'modes', metric: 'chronoMatches', threshold: 1, xp: 200 },
  { id: 'mode_chrono_20', group: 'modes', metric: 'chronoMatches', threshold: 20, xp: 3_500 },
  { id: 'mode_evolving', group: 'modes', metric: 'evolvingMatches', threshold: 1, xp: 200 },
  { id: 'mode_evolving_10', group: 'modes', metric: 'evolvingMatches', threshold: 10, xp: 3_500 },
  { id: 'evolving_snap', group: 'modes', metric: 'evolvingSnaps', threshold: 1, xp: 1_800 },
  { id: 'modes_all', group: 'modes', metric: 'modesPlayed', threshold: 3, xp: 2_500 },
  { id: 'multi_1', group: 'modes', metric: 'multiMatches', threshold: 1, xp: 200 },
  { id: 'multi_10', group: 'modes', metric: 'multiMatches', threshold: 10, xp: 1_800 },
  { id: 'multi_25', group: 'modes', metric: 'multiMatches', threshold: 25, xp: 5_000 },
  { id: 'multi_win', group: 'modes', metric: 'multiWins', threshold: 1, xp: 700 },
  { id: 'multi_wins_10', group: 'modes', metric: 'multiWins', threshold: 10, xp: 5_000 },
  { id: 'heard_25', group: 'collection', metric: 'songsHeard', threshold: 25, xp: 180 },
  { id: 'heard_100', group: 'collection', metric: 'songsHeard', threshold: 100, xp: 1_000 },
  { id: 'heard_500', group: 'collection', metric: 'songsHeard', threshold: 500, xp: 5_000 },
  { id: 'heard_1000', group: 'collection', metric: 'songsHeard', threshold: 1000, xp: 13_000 },
  {
    id: 'heard_all',
    group: 'collection',
    metric: 'songsHeard',
    threshold: 0,
    xp: 45_000,
    goal: 'catalogue',
  },
  { id: 'found_25', group: 'collection', metric: 'songsFound', threshold: 25, xp: 350 },
  { id: 'found_100', group: 'collection', metric: 'songsFound', threshold: 100, xp: 1_800 },
  { id: 'found_500', group: 'collection', metric: 'songsFound', threshold: 500, xp: 9_000 },
  { id: 'found_1000', group: 'collection', metric: 'songsFound', threshold: 1000, xp: 20_000 },
  { id: 'first_friend', group: 'profile', metric: 'friends', threshold: 1, xp: 70 },
  { id: 'friends_10', group: 'profile', metric: 'friends', threshold: 10, xp: 700 },
  { id: 'first_like', group: 'profile', metric: 'likes', threshold: 1, xp: 50 },
  { id: 'likes_25', group: 'profile', metric: 'likes', threshold: 25, xp: 500 },
  { id: 'custom_avatar', group: 'profile', metric: 'customAvatar', threshold: 1, xp: 180 },
  { id: 'linked_list', group: 'profile', metric: 'linkedList', threshold: 1, xp: 250 },
] as const;

export type AchievementId = (typeof ACHIEVEMENTS)[number]['id'];
export type AchievementMetric = (typeof ACHIEVEMENTS)[number]['metric'];

/** AniList and MyAnimeList each add one. A blank name does not count. */
export function linkedProviderCount(
  anilistUsername: string | null | undefined,
  malUsername: string | null | undefined,
): number {
  return [anilistUsername, malUsername].filter((name) => (name ?? '').trim().length > 0).length;
}

/** Count of the three match formats already finished at least once. */
export function modesPlayedFrom(progress: {
  standardMatches: number;
  chronoMatches: number;
  evolvingMatches: number;
}): number {
  return [progress.standardMatches, progress.chronoMatches, progress.evolvingMatches].filter(
    (count) => count > 0,
  ).length;
}

export function achievementXp(id: string): number {
  return ACHIEVEMENTS.find((item) => item.id === id)?.xp ?? 0;
}

/** Live goal. The full catalogue follows the songs available today. */
export function achievementGoal(
  item: { threshold: number; goal?: 'catalogue' },
  progress: AchievementProgress,
): number {
  return item.goal === 'catalogue' ? progress.catalogueSize : item.threshold;
}

/** Ids whose goal the snapshot already meets. A goal of zero never unlocks. */
export function earnedAchievementIds(progress: AchievementProgress): AchievementId[] {
  return ACHIEVEMENTS.filter((item) => {
    const goal = achievementGoal(item, progress);
    return goal > 0 && progress[item.metric] >= goal;
  }).map((item) => item.id);
}
