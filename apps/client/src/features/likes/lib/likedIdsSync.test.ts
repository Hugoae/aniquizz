import { describe, expect, it } from 'vitest';
import { mergeLikedIdsFromServer, resolveSongLikedState } from './likedIdsSync';

describe('mergeLikedIdsFromServer', () => {
  it('keeps an optimistic like that the snapshot has not seen yet', () => {
    const pending = new Map<number, boolean>([[42, true]]);
    expect([...mergeLikedIdsFromServer([1], pending)].sort()).toEqual([1, 42]);
  });

  it('keeps an optimistic unlike against a stale snapshot', () => {
    const pending = new Map<number, boolean>([[42, false]]);
    expect([...mergeLikedIdsFromServer([1, 42], pending)]).toEqual([1]);
  });

  it('returns the snapshot when nothing is pending', () => {
    expect([...mergeLikedIdsFromServer([7, 8], new Map())]).toEqual([7, 8]);
  });
});

describe('resolveSongLikedState', () => {
  it('uses the server hint until likes/ids is ready', () => {
    expect(
      resolveSongLikedState({
        ready: false,
        inSet: false,
        initialLiked: true,
        hasPending: false,
      }),
    ).toBe(true);
  });

  it('uses the optimistic set even while ready is false', () => {
    expect(
      resolveSongLikedState({
        ready: false,
        inSet: true,
        initialLiked: false,
        hasPending: true,
      }),
    ).toBe(true);
    expect(
      resolveSongLikedState({
        ready: false,
        inSet: false,
        initialLiked: true,
        hasPending: true,
      }),
    ).toBe(false);
  });

  it('ignores the hint once the ids fetch is ready', () => {
    expect(
      resolveSongLikedState({
        ready: true,
        inSet: false,
        initialLiked: true,
        hasPending: false,
      }),
    ).toBe(false);
  });
});
