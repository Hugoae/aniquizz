import {
  DAILY_FRANCHISE_LOOKBACK_DAYS,
  DAILY_SONG_LOOKBACK_DAYS,
  addCalendarDays,
} from '@aniquizz/shared';

/** One past daily round, already reduced to the fields the lookback needs. */
export interface DatedExclusionRound {
  /** Paris civil date (YYYY-MM-DD) of the challenge that used this round. */
  day: string;
  songId: number | null;
  franchiseKey: string | null;
}

export interface RecentExclusionSets {
  songIds: Set<number>;
  franchiseKeys: Set<string>;
}

/**
 * History that must not repeat on `beforeDate`.
 * Songs look back 60 days; franchise keys only 14. The target day itself is excluded.
 */
export function exclusionsBefore(
  beforeDate: string,
  rounds: readonly DatedExclusionRound[],
): RecentExclusionSets {
  const songFrom = addCalendarDays(beforeDate, -DAILY_SONG_LOOKBACK_DAYS);
  const franchiseFrom = addCalendarDays(beforeDate, -DAILY_FRANCHISE_LOOKBACK_DAYS);
  const songIds = new Set<number>();
  const franchiseKeys = new Set<string>();

  for (const round of rounds) {
    if (round.day < songFrom || round.day >= beforeDate) continue;
    if (round.songId != null) songIds.add(round.songId);
    if (round.day >= franchiseFrom && round.franchiseKey) franchiseKeys.add(round.franchiseKey);
  }

  return { songIds, franchiseKeys };
}

/** Same windows as `exclusionsBefore`, one entry per requested date. */
export function exclusionsByDate(
  beforeDates: readonly string[],
  rounds: readonly DatedExclusionRound[],
): Map<string, RecentExclusionSets> {
  const result = new Map<string, RecentExclusionSets>();
  for (const beforeDate of new Set(beforeDates)) {
    result.set(beforeDate, exclusionsBefore(beforeDate, rounds));
  }
  return result;
}
