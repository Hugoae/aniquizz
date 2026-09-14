import { describe, expect, it } from 'vitest';
import type { PlaylistPoolStats, WatchedPoolStats } from '@aniquizz/shared';
import { resolveConfigPoolPreview, formatPoolMetric, poolUnitLabel } from './configPoolPreview';

const watched = (songs: number, animes: number): WatchedPoolStats => ({
  playableSongs: songs,
  animeCount: animes,
  soundCount: 20,
  insufficient: songs < 20,
});

const playlist = (songs: number, animes: number): PlaylistPoolStats => ({
  playlistId: 'p1',
  snapshotCount: 100,
  filteredCount: songs,
  playableSongs: songs,
  animeCount: animes,
  distinctNames: animes,
  soundCount: 20,
  insufficient: false,
  packInsufficient: false,
  staleDropped: 0,
  playlistWatched: false,
});

describe('resolveConfigPoolPreview', () => {
  it('uses catalogue counts for random source', () => {
    expect(
      resolveConfigPoolPreview({
        soundSelection: 'random',
        catalogue: { playableSongs: 3002, animeCount: 846 },
        catalogueLoading: false,
        watched: null,
        watchedLoading: false,
        playlist: null,
        playlistLoading: false,
      }),
    ).toEqual({ songs: 3002, animes: 846, loading: false });

    expect(
      resolveConfigPoolPreview({
        soundSelection: 'mix',
        catalogue: { playableSongs: 3002, animeCount: 846 },
        catalogueLoading: false,
        watched: null,
        watchedLoading: false,
        playlist: null,
        playlistLoading: false,
      }).songs,
    ).toBe(3002);
  });

  it('uses watched or playlist stats when those sources are selected', () => {
    expect(
      resolveConfigPoolPreview({
        soundSelection: 'watched',
        catalogue: { playableSongs: 3002, animeCount: 846 },
        catalogueLoading: false,
        watched: watched(40, 12),
        watchedLoading: false,
        playlist: null,
        playlistLoading: false,
      }),
    ).toEqual({ songs: 40, animes: 12, loading: false });

    expect(
      resolveConfigPoolPreview({
        soundSelection: 'playlist',
        catalogue: { playableSongs: 3002, animeCount: 846 },
        catalogueLoading: false,
        watched: null,
        watchedLoading: false,
        playlist: playlist(287, 116),
        playlistLoading: false,
      }),
    ).toEqual({ songs: 287, animes: 116, loading: false });
  });

  it('reports loading until the active source has stats', () => {
    expect(
      resolveConfigPoolPreview({
        soundSelection: 'random',
        catalogue: null,
        catalogueLoading: true,
        watched: null,
        watchedLoading: false,
        playlist: null,
        playlistLoading: false,
      }).loading,
    ).toBe(true);
  });
});

describe('formatPoolMetric', () => {
  it('hides the unit while loading or empty so AT does not hear a stray s', () => {
    expect(formatPoolMetric(null, true)).toEqual({ count: '…', unitVisible: false });
    expect(formatPoolMetric(null, false)).toEqual({ count: '—', unitVisible: false });
    expect(formatPoolMetric(12, false)).toEqual({ count: '12', unitVisible: true });
    expect(poolUnitLabel(1, 'son', 'sons')).toBe('son');
    expect(poolUnitLabel(12, 'son', 'sons')).toBe('sons');
  });
});
