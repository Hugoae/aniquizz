import { describe, expect, it } from 'vitest';
import { mergeRoomSettings, normalizeRoomSettings } from './settings';
import type { RoomSettings } from '@aniquizz/shared';

const meta = { hostName: 'Host', hostAvatar: 'player1' };

describe('normalizeRoomSettings', () => {
  it('keeps playlistId (Zod strip would drop unknown keys)', () => {
    const settings = normalizeRoomSettings(
      {
        soundSelection: 'playlist',
        playlistId: '11111111-1111-4111-8111-111111111111',
        playlistWatched: true,
        watchedAllowFallback: true,
      },
      meta,
    );
    expect(settings.soundSelection).toBe('playlist');
    expect(settings.playlistId).toBe('11111111-1111-4111-8111-111111111111');
    expect(settings.playlistWatched).toBe(true);
    expect(settings.watchedAllowFallback).toBe(true);
  });

  it('rejects playlist source without playlistId', () => {
    expect(() =>
      normalizeRoomSettings({ soundSelection: 'playlist' }, meta),
    ).toThrow(/playlist/i);
  });

  it('keeps decadePlaylistId and allows a decade-only playlist source', () => {
    const decade = '22222222-2222-4222-8222-222222222222';
    const settings = normalizeRoomSettings(
      { soundSelection: 'playlist', decadePlaylistId: decade },
      meta,
    );
    expect(settings.decadePlaylistId).toBe(decade);
    expect(settings.playlistId).toBeUndefined();
  });

  it('keeps a genre pack combined with a decade overlay', () => {
    const genre = '11111111-1111-4111-8111-111111111111';
    const decade = '22222222-2222-4222-8222-222222222222';
    const settings = normalizeRoomSettings(
      { soundSelection: 'playlist', playlistId: genre, decadePlaylistId: decade },
      meta,
    );
    expect(settings.playlistId).toBe(genre);
    expect(settings.decadePlaylistId).toBe(decade);
  });
});

describe('mergeRoomSettings', () => {
  const current = normalizeRoomSettings(
    {
      soundSelection: 'playlist',
      playlistId: '11111111-1111-4111-8111-111111111111',
      playlistWatched: true,
      watchedAllowFallback: true,
    },
    meta,
  ) as RoomSettings;

  it('keeps watchedAllowFallback when playlist overlay is on', () => {
    const next = mergeRoomSettings(current, { soundCount: 15 });
    expect(next.watchedAllowFallback).toBe(true);
    expect(next.playlistId).toBe(current.playlistId);
  });

  it('clears playlist fields when switching to random', () => {
    const next = mergeRoomSettings(current, { soundSelection: 'random' });
    expect(next.playlistId).toBeUndefined();
    expect(next.decadePlaylistId).toBeUndefined();
    expect(next.playlistWatched).toBe(false);
    expect(next.watchedAllowFallback).toBe(false);
  });

  it('clears decadePlaylistId when the host sends null', () => {
    const decade = '22222222-2222-4222-8222-222222222222';
    const withDecade = mergeRoomSettings(current, { decadePlaylistId: decade });
    expect(withDecade.decadePlaylistId).toBe(decade);
    const next = mergeRoomSettings(withDecade, { decadePlaylistId: null });
    expect(next.decadePlaylistId).toBeUndefined();
    expect(next.playlistId).toBe(current.playlistId);
  });
});
