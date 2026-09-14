import { describe, expect, it } from 'vitest';
import { guessingClipPaintKey } from './videoStagePaint';

const GUESSING = {
  videoKey: 'https://media.example/v/token-guess',
  videoStartTime: 12,
};

const REVEAL = {
  id: 42,
  anime: 'Blue Period',
  title: 'EVERBLUE',
  artist: 'Omoinotake',
  type: 'OP1',
  difficulty: 'EASY',
  videoKey: 'https://media.example/v/token-reveal',
  videoStartTime: 12,
};

describe('guessingClipPaintKey', () => {
  it('tracks the guessing locator so a new round resets paint flags', () => {
    expect(guessingClipPaintKey('guessing', GUESSING)).toBe(
      'https://media.example/v/token-guess:12',
    );
  });

  it('stays stable when reveal re-signs the Worker URL', () => {
    expect(guessingClipPaintKey('revealed', REVEAL)).toBeNull();
    expect(guessingClipPaintKey('guessing', REVEAL)).toBeNull();
  });

  it('does not reset during intro or game-over', () => {
    expect(guessingClipPaintKey('loading', GUESSING)).toBeNull();
    expect(guessingClipPaintKey('ended', null)).toBeNull();
  });
});
