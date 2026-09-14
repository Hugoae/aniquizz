import { dailyTypeMix, type DailySongCandidate } from './dailySelection';
import { parseDailySnapshot } from './dailySnapshot';
import type { DailyRoundSnapshot } from '@aniquizz/shared';

export interface DailyValidationWarning {
  code: string;
  message: string;
}

export function validateDailySnapshots(
  snapshots: DailyRoundSnapshot[],
  opts: { challengeNumber: number; recentSongIds: Set<number>; recentFranchiseKeys: Set<string> },
): DailyValidationWarning[] {
  const warnings: DailyValidationWarning[] = [];
  if (snapshots.length !== 5) {
    warnings.push({ code: 'round_count', message: `Expected 5 rounds, got ${snapshots.length}.` });
  }

  const franchises = snapshots.map((row) =>
    row.franchiseId != null ? `f:${row.franchiseId}` : `a:${row.animeId}`,
  );
  if (new Set(franchises).size !== snapshots.length) {
    warnings.push({ code: 'duplicate_franchise', message: 'Two rounds share the same franchise.' });
  }

  const diffs = { easy: 0, medium: 0, hard: 0 };
  const types = { OP: 0, ED: 0 };
  let recentSong = false;
  let recentFranchise = false;
  for (const row of snapshots) {
    const diff = row.difficulty.toLowerCase() as keyof typeof diffs;
    if (diff in diffs) diffs[diff] += 1;
    if (row.songType === 'ED') types.ED += 1;
    else types.OP += 1;
    if (!row.videoKey)
      warnings.push({ code: 'missing_video', message: `Round song ${row.id} has no video key.` });
    if (row.choices.includes('???')) {
      warnings.push({
        code: 'placeholder_choice',
        message: `Round ${row.id} fell back to a placeholder QCM choice.`,
      });
    }
    if (opts.recentSongIds.has(row.id)) recentSong = true;
    const franchiseKey = row.franchiseId != null ? `f:${row.franchiseId}` : `a:${row.animeId}`;
    if (opts.recentFranchiseKeys.has(franchiseKey)) recentFranchise = true;
  }
  if (recentSong) {
    warnings.push({ code: 'recent_song', message: 'A song appeared in the last 60 days.' });
  }
  if (recentFranchise) {
    warnings.push({
      code: 'recent_franchise',
      message: 'A franchise appeared in the last 14 days.',
    });
  }

  if (diffs.easy !== 2 || diffs.medium !== 2 || diffs.hard !== 1) {
    warnings.push({
      code: 'difficulty_mix',
      message: `Difficulty mix is ${diffs.easy}E/${diffs.medium}M/${diffs.hard}H (want 2/2/1).`,
    });
  }

  const wanted = dailyTypeMix(opts.challengeNumber);
  if (types.OP !== wanted.OP || types.ED !== wanted.ED) {
    warnings.push({
      code: 'type_mix',
      message: `Type mix is ${types.OP} OP / ${types.ED} ED (want ${wanted.OP}/${wanted.ED}).`,
    });
  }

  return warnings;
}

export function candidatesFromSnapshots(snapshots: DailyRoundSnapshot[]): DailySongCandidate[] {
  return snapshots.map((row) => ({
    songId: row.id,
    animeId: row.animeId,
    franchiseId: row.franchiseId,
    franchiseKey: row.franchiseId != null ? `f:${row.franchiseId}` : `a:${row.animeId}`,
    difficulty: row.difficulty.toUpperCase() as DailySongCandidate['difficulty'],
    songType: row.songType,
    popularity: row.popularity,
  }));
}

export function snapshotsFromJson(rows: Array<{ snapshot: unknown }>): DailyRoundSnapshot[] {
  return rows.map((row) => parseDailySnapshot(row.snapshot));
}
