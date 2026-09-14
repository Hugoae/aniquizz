import { afterEach, describe, expect, it } from 'vitest';
import {
  applyMotionAttribute,
  readOsPrefersReduced,
  resolvedMotionValue,
  subscribeOsPrefersReduced,
} from './motionRuntime';

afterEach(() => {
  document.documentElement.removeAttribute('data-motion');
});

describe('resolvedMotionValue', () => {
  it('maps the nine mode × OS combinations to reduced or full', () => {
    expect(resolvedMotionValue('auto', true)).toBe('reduced');
    expect(resolvedMotionValue('auto', false)).toBe('full');
    expect(resolvedMotionValue('reduced', true)).toBe('reduced');
    expect(resolvedMotionValue('reduced', false)).toBe('reduced');
    expect(resolvedMotionValue('full', true)).toBe('full');
    expect(resolvedMotionValue('full', false)).toBe('full');
  });
});

describe('readOsPrefersReduced', () => {
  it('does not throw when matchMedia is missing', () => {
    const original = window.matchMedia;
    // @ts-expect-error jsdom may omit matchMedia
    delete window.matchMedia;
    expect(readOsPrefersReduced()).toBe(false);
    const stop = subscribeOsPrefersReduced(() => {});
    expect(() => stop()).not.toThrow();
    window.matchMedia = original;
  });
});

describe('applyMotionAttribute', () => {
  it('writes data-motion so Full can override the OS', () => {
    applyMotionAttribute('full', true);
    expect(document.documentElement.getAttribute('data-motion')).toBe('full');
    applyMotionAttribute('reduced', false);
    expect(document.documentElement.getAttribute('data-motion')).toBe('reduced');
  });
});
