import { describe, expect, it } from 'vitest';
import type { PlaylistPoolStats } from '@aniquizz/shared';
import { checkPlaylistPoolLaunch } from './playlistSource';
import { PLAYLISTS_COPY } from './playlistsCopy';

const baseStats = (overrides: Partial<PlaylistPoolStats> = {}): PlaylistPoolStats => ({
  playlistId: 'p1',
  snapshotCount: 40,
  filteredCount: 20,
  playableSongs: 20,
  animeCount: 10,
  distinctNames: 10,
  soundCount: 10,
  insufficient: false,
  packInsufficient: false,
  staleDropped: 0,
  playlistWatched: false,
  ...overrides,
});

describe('checkPlaylistPoolLaunch', () => {
  it('blocks an empty filtered pack with the under-button filters copy', () => {
    const result = checkPlaylistPoolLaunch(
      'playlist',
      'mix',
      baseStats({ filteredCount: 0, playableSongs: 0 }),
    );
    expect(result.blocked).toBe(true);
    expect(result.reason).toBe(PLAYLISTS_COPY.filteredEmpty);
  });

  it('blocks a pack that cannot fill the requested round count', () => {
    const result = checkPlaylistPoolLaunch(
      'playlist',
      'mix',
      baseStats({
        filteredCount: 4,
        playableSongs: 4,
        soundCount: 20,
        packInsufficient: true,
        insufficient: true,
      }),
    );
    expect(result.blocked).toBe(true);
    expect(result.reason).toBe(PLAYLISTS_COPY.packTooSmall);
  });

  it('blocks an empty watched overlay without calling it a pack-size issue', () => {
    const result = checkPlaylistPoolLaunch(
      'playlist',
      'mix',
      baseStats({ playlistWatched: true, playableSongs: 0, insufficient: true }),
    );
    expect(result.blocked).toBe(true);
    expect(result.reason).toBe(PLAYLISTS_COPY.overlayEmpty);
  });

  it('uses the AniList down copy when the overlay is empty because AniList failed', () => {
    const result = checkPlaylistPoolLaunch(
      'playlist',
      'mix',
      baseStats({
        playlistWatched: true,
        playableSongs: 0,
        insufficient: true,
        listError: 'anilist_blocked',
      }),
    );
    expect(result.blocked).toBe(true);
    expect(result.reason).toMatch(/API AniList est down/i);
  });

  it('blocks an insufficient overlay with the pack-completion hint', () => {
    const result = checkPlaylistPoolLaunch(
      'playlist',
      'mix',
      baseStats({ playlistWatched: true, playableSongs: 4, soundCount: 20, insufficient: true }),
    );
    expect(result.blocked).toBe(true);
    expect(result.reason).toBe(PLAYLISTS_COPY.overlayInsufficient(4, 20));
  });
});
