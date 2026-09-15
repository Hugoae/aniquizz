import { describe, expect, it } from 'vitest';
import axios from 'axios';
import {
  anilistGraphqlLooksLikeOutage,
  collectWatchedAnilistMediaIds,
  isAnilistUnavailableError,
} from './anilistService';

describe('collectWatchedAnilistMediaIds', () => {
  it('includes Completed, Watching, On-Hold, Rewatching and Dropped by entry status', () => {
    expect(
      collectWatchedAnilistMediaIds([
        {
          name: 'Completed',
          entries: [
            { mediaId: 1, status: 'COMPLETED' },
            { mediaId: 2, status: 'PLANNING' },
            { mediaId: 3, status: 'DROPPED' },
          ],
        },
        {
          name: 'Paused',
          entries: [{ mediaId: 4, status: 'PAUSED' }],
        },
        {
          name: 'Watching',
          entries: [{ mediaId: 5, status: 'CURRENT' }],
        },
        {
          name: 'Rewatching',
          entries: [{ mediaId: 6, status: 'REPEATING' }],
        },
      ]),
    ).toEqual([1, 3, 4, 5, 6]);
  });

  it('falls back to list name when entry status is missing (French On-Hold and Dropped)', () => {
    expect(
      collectWatchedAnilistMediaIds([
        { name: 'En pause', entries: [{ mediaId: 10 }] },
        { name: 'Planning', entries: [{ mediaId: 11 }] },
        { name: 'Abandonnés', entries: [{ mediaId: 12 }] },
      ]),
    ).toEqual([10, 12]);
  });

  it('returns empty when MediaListCollection has no lists', () => {
    expect(collectWatchedAnilistMediaIds(null)).toEqual([]);
    expect(collectWatchedAnilistMediaIds([])).toEqual([]);
  });
});

describe('anilistGraphqlLooksLikeOutage', () => {
  it('treats GraphQL errors without data as AniList-side outage', () => {
    expect(
      anilistGraphqlLooksLikeOutage({
        errors: [{ message: 'Internal Server Error' }],
        data: null,
      }),
    ).toBe(true);
  });

  it('does not treat user-not-found as an outage', () => {
    expect(
      anilistGraphqlLooksLikeOutage({
        errors: [{ message: 'Not Found.' }],
        data: { MediaListCollection: null },
      }),
    ).toBe(false);
  });

  it('does not treat a successful payload as an outage', () => {
    expect(
      anilistGraphqlLooksLikeOutage({
        data: { MediaListCollection: { lists: [] } },
      }),
    ).toBe(false);
  });
});

describe('isAnilistUnavailableError', () => {
  it('treats timeouts without an HTTP response as AniList-side', () => {
    const error = new axios.AxiosError('timeout of 15000ms exceeded', 'ECONNABORTED');
    expect(isAnilistUnavailableError(error)).toBe(true);
  });
});
