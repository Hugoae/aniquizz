import { describe, expect, it } from 'vitest';
import {
  PEEK_MARGIN_PERCENT,
  PEEK_SIZE_PERCENT,
  generatePeekWindow,
  normalizeVideoMode,
  peekClipPath,
  peekWindowRect,
} from './videoMode';

describe('normalizeVideoMode', () => {
  it('defaults unknown values to hidden', () => {
    expect(normalizeVideoMode(undefined)).toBe('hidden');
    expect(normalizeVideoMode('invalid')).toBe('hidden');
  });

  it('preserves valid modes', () => {
    expect(normalizeVideoMode('blurred')).toBe('blurred');
    expect(normalizeVideoMode('peek')).toBe('peek');
  });
});

describe('generatePeekWindow', () => {
  it('respects margin and size bounds', () => {
    let i = 0;
    const values = [0, 0.5, 1, 0.25, 0.75];
    const win = generatePeekWindow(() => values[i++ % values.length]);

    expect(win.sizePercent).toBe(PEEK_SIZE_PERCENT);
    const max = 100 - PEEK_MARGIN_PERCENT - PEEK_SIZE_PERCENT;
    expect(win.xPercent).toBeGreaterThanOrEqual(PEEK_MARGIN_PERCENT);
    expect(win.yPercent).toBeGreaterThanOrEqual(PEEK_MARGIN_PERCENT);
    expect(win.xPercent).toBeLessThanOrEqual(max);
    expect(win.yPercent).toBeLessThanOrEqual(max);
  });

  it('is deterministic with a fixed rng', () => {
    const rng = () => 0;
    expect(generatePeekWindow(rng)).toEqual({
      xPercent: PEEK_MARGIN_PERCENT,
      yPercent: PEEK_MARGIN_PERCENT,
      sizePercent: PEEK_SIZE_PERCENT,
    });
  });
});

describe('peekClipPath', () => {
  it('produces inset clip for a 16:9 square aperture', () => {
    const path = peekClipPath({ xPercent: 10, yPercent: 12, sizePercent: 22 });
    expect(path).toBe('inset(12% 77.625% 66% 10%)');
  });
});

describe('peekWindowRect', () => {
  it('matches clip-path geometry', () => {
    const win = { xPercent: 10, yPercent: 12, sizePercent: 22 };
    expect(peekWindowRect(win)).toEqual({ left: 10, top: 12, width: 12.375, height: 22 });
  });
});
