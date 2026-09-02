import { isLeaderboardMetric, type LeaderboardMetric } from '@aniquizz/shared';

export const parseLeaderboardMetric = (raw: string | null): LeaderboardMetric =>
  raw && isLeaderboardMetric(raw) ? raw : 'xp';

export const leaderboardSearchString = (metric: LeaderboardMetric): string => {
  if (metric === 'xp') return '';
  return new URLSearchParams({ metric }).toString();
};
