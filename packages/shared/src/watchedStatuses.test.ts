import { describe, expect, it } from 'vitest';
import {
  WATCHED_ANILIST_STATUS_SET,
  WATCHED_LIST_STATUS_LABELS,
  WATCHED_MAL_STATUS_SET,
} from './watchedStatuses';

describe('watchedStatuses', () => {
  it('includes Dropped and excludes Planning on both providers', () => {
    expect(WATCHED_ANILIST_STATUS_SET.has('DROPPED')).toBe(true);
    expect(WATCHED_ANILIST_STATUS_SET.has('PLANNING')).toBe(false);
    expect(WATCHED_MAL_STATUS_SET.has('dropped')).toBe(true);
    expect(WATCHED_MAL_STATUS_SET.has('plan_to_watch')).toBe(false);
  });

  it('lists Dropped in the player-facing status names', () => {
    expect(WATCHED_LIST_STATUS_LABELS).toContain('Dropped');
    expect(WATCHED_LIST_STATUS_LABELS).not.toContain('Planning');
  });
});
