import { describe, expect, it } from 'vitest';
import {
  checkWatchedLobby,
  checkWatchedPoolLaunch,
  isWatchedSourceBlocked,
  resolveWatchedPoolBanner,
  watchedPoolBannerVariantClasses,
  watchedPoolModeLabel,
  WATCHED_SOURCE_BLOCK_MESSAGE,
} from './watchedSource';

describe('isWatchedSourceBlocked', () => {
  it('blocks watched source when user is not logged in', () => {
    expect(isWatchedSourceBlocked('watched', null, null)).toBe(true);
  });

  it('blocks watched source when AniList is not linked', () => {
    expect(
      isWatchedSourceBlocked('watched', { id: 'u1' } as never, { anilistUsername: null } as never),
    ).toBe(true);
  });

  it('allows watched source when AniList is linked', () => {
    expect(
      isWatchedSourceBlocked('watched', { id: 'u1' } as never, {
        anilistUsername: 'PlayerOne',
      } as never),
    ).toBe(false);
  });

  it('does not block random source', () => {
    expect(isWatchedSourceBlocked('random', null, null)).toBe(false);
  });
});

describe('checkWatchedLobby', () => {
  const humans = [
    { id: 'a', hasAniList: true },
    { id: 'b', hasAniList: false },
  ];

  it('returns no block for non-watched sources', () => {
    const result = checkWatchedLobby('random', 'union', humans);
    expect(result.blocked).toBe(false);
  });

  it('blocks union when no human has AniList linked', () => {
    const result = checkWatchedLobby('watched', 'union', [
      { id: 'a', hasAniList: false },
      { id: 'b', hasAniList: false },
    ]);
    expect(result.blocked).toBe(true);
    expect(result.reason).toMatch(/AniList/i);
  });

  it('blocks intersection when any human is unlinked', () => {
    const result = checkWatchedLobby('watched', 'intersection', humans);
    expect(result.blocked).toBe(true);
    expect(result.badgeIds.has('b')).toBe(true);
  });

  it('allows intersection when all humans are linked', () => {
    const result = checkWatchedLobby('watched', 'intersection', [
      { id: 'a', hasAniList: true },
      { id: 'b', hasAniList: true },
    ]);
    expect(result.blocked).toBe(false);
  });

  it('ignores bots for watched lobby validation', () => {
    const result = checkWatchedLobby('watched', 'intersection', [
      { id: 'a', hasAniList: true },
      { id: 'bot', isBot: true, hasAniList: false },
    ]);
    expect(result.blocked).toBe(false);
  });
});

describe('watchedPoolModeLabel', () => {
  it('labels union mode', () => {
    expect(watchedPoolModeLabel('union')).toMatch(/union des listes/);
  });

  it('labels commun mode', () => {
    expect(watchedPoolModeLabel('intersection')).toBe('commun');
  });
});

describe('checkWatchedPoolLaunch', () => {
  it('does not block when pool is sufficient', () => {
    const result = checkWatchedPoolLaunch('watched', {
      playableSongs: 20,
      soundCount: 20,
      insufficient: false,
    });
    expect(result.blocked).toBe(false);
  });

  it('blocks when pool is empty', () => {
    const result = checkWatchedPoolLaunch('watched', {
      playableSongs: 0,
      soundCount: 20,
      insufficient: true,
      watchedMode: 'intersection',
    });
    expect(result.blocked).toBe(true);
    expect(result.reason).toMatch(/Commun/i);
  });

  it('blocks when insufficient and fallback not opted in', () => {
    const result = checkWatchedPoolLaunch(
      'watched',
      { playableSongs: 8, soundCount: 20, insufficient: true },
      false,
    );
    expect(result.blocked).toBe(true);
    expect(result.reason).toMatch(/Compléter avec l'aléatoire/);
  });

  it('allows launch when host opted in to fallback', () => {
    const result = checkWatchedPoolLaunch(
      'watched',
      { playableSongs: 8, soundCount: 20, insufficient: true },
      true,
    );
    expect(result.blocked).toBe(false);
  });

  it('ignores non-watched sources', () => {
    const result = checkWatchedPoolLaunch('random', {
      playableSongs: 0,
      soundCount: 20,
      insufficient: true,
    });
    expect(result.blocked).toBe(false);
  });
});

describe('resolveWatchedPoolBanner', () => {
  it('returns loading while stats are pending', () => {
    const result = resolveWatchedPoolBanner(null, true, 'union des listes');
    expect(result.variant).toBe('loading');
    expect(watchedPoolBannerVariantClasses(result.variant)).toMatch(/muted-foreground/);
  });

  it('returns fallback when insufficient but opt-in is enabled', () => {
    const result = resolveWatchedPoolBanner(
      { playableSongs: 6, soundCount: 100, insufficient: true },
      false,
      'union des listes',
      true,
    );
    expect(result.variant).toBe('fallback');
    expect(result.count).toBe(6);
    expect(result.soundCount).toBe(100);
    expect(watchedPoolBannerVariantClasses(result.variant)).toMatch(/info/);
  });

  it('returns insufficient when fallback is disabled', () => {
    const result = resolveWatchedPoolBanner(
      { playableSongs: 6, soundCount: 100, insufficient: true },
      false,
      'union des listes',
      false,
    );
    expect(result.variant).toBe('insufficient');
    expect(watchedPoolBannerVariantClasses(result.variant)).toMatch(/warning/);
  });
});

describe('WATCHED_SOURCE_BLOCK_MESSAGE', () => {
  it('is a French user-facing string', () => {
    expect(WATCHED_SOURCE_BLOCK_MESSAGE).toMatch(/AniList/);
  });
});
