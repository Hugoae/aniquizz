import { isLeaderboardMetric, type LeaderboardMetric } from '@aniquizz/shared';
import { parseLeaderboardMetric, leaderboardSearchString } from '@/features/leaderboard/utils/leaderboardUrl';

/** Location state on /profile/:userId when opened from the community board. */
export interface ProfileFromLeaderboardState {
  returnTo: '/leaderboard';
  metric: LeaderboardMetric;
}

export const profileFromLeaderboardState = (
  metric: LeaderboardMetric,
): ProfileFromLeaderboardState => ({
  returnTo: '/leaderboard',
  metric,
});

export const getProfileFromLeaderboardState = (
  state: unknown,
): ProfileFromLeaderboardState | null => {
  if (!state || typeof state !== 'object') return null;
  const s = state as Record<string, unknown>;
  if (s.returnTo !== '/leaderboard' || typeof s.metric !== 'string' || !isLeaderboardMetric(s.metric)) {
    return null;
  }
  return { returnTo: '/leaderboard', metric: s.metric };
};

/** Survives a profile refresh: `/profile/:id?from=leaderboard&metric=victories`. */
export const profilePathFromLeaderboard = (playerId: string, metric: LeaderboardMetric): string => {
  const params = new URLSearchParams({ from: 'leaderboard', metric });
  return `/profile/${playerId}?${params.toString()}`;
};

export const getLeaderboardReturnMetric = (
  state: unknown,
  search: string,
): LeaderboardMetric | null => {
  const fromState = getProfileFromLeaderboardState(state);
  if (fromState) return fromState.metric;
  const params = new URLSearchParams(search);
  if (params.get('from') !== 'leaderboard') return null;
  return parseLeaderboardMetric(params.get('metric'));
};

export const leaderboardPath = (metric: LeaderboardMetric): string => {
  const search = leaderboardSearchString(metric);
  return search ? `/leaderboard?${search}` : '/leaderboard';
};
