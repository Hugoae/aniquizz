import { describe, expect, it } from 'vitest';
import {
  checkWatchedLobby,
  isWatchedSourceBlocked,
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

describe('WATCHED_SOURCE_BLOCK_MESSAGE', () => {
  it('is a French user-facing string', () => {
    expect(WATCHED_SOURCE_BLOCK_MESSAGE).toMatch(/AniList/);
  });
});
