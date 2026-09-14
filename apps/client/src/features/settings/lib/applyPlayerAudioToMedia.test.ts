import { describe, expect, it } from 'vitest';
import {
  applyPlayerAudioToMedia,
  readPlayerAudioFromMedia,
} from './applyPlayerAudioToMedia';

function fakeMedia(init?: Partial<Pick<HTMLMediaElement, 'volume' | 'muted'>>): HTMLMediaElement {
  return {
    volume: init?.volume ?? 1,
    muted: init?.muted ?? false,
  } as HTMLMediaElement;
}

describe('applyPlayerAudioToMedia', () => {
  it('maps percent volume onto the element and honors mute separately', () => {
    const el = fakeMedia();
    applyPlayerAudioToMedia(el, 20, true);
    expect(el.volume).toBe(0.2);
    expect(el.muted).toBe(true);
  });

  it('does not clobber an already matching volume', () => {
    const el = fakeMedia({ volume: 0.7, muted: false });
    applyPlayerAudioToMedia(el, 70, false);
    expect(el.volume).toBe(0.7);
    expect(el.muted).toBe(false);
  });
});

describe('readPlayerAudioFromMedia', () => {
  it('rounds native volume back to a percent', () => {
    const el = fakeMedia({ volume: 0.333, muted: true });
    expect(readPlayerAudioFromMedia(el)).toEqual({ audioVolume: 33, audioMuted: true });
  });
});
