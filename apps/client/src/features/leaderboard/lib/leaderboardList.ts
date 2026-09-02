import type { LeaderboardEntry, LeaderboardPodiumGroup } from '@aniquizz/shared';

export const podiumPlayerIds = (groups: LeaderboardPodiumGroup[]): Set<string> =>
  new Set(groups.flatMap((group) => group.entries.map((entry) => entry.id)));

export const entriesBeyondPodium = (
  entries: LeaderboardEntry[],
  groups: LeaderboardPodiumGroup[],
): LeaderboardEntry[] => {
  const onPodium = podiumPlayerIds(groups);
  return entries.filter((entry) => !onPodium.has(entry.id));
};
