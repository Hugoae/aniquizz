import { describe, expect, it } from 'vitest';
import {
  getPrecisionChipLabel,
  getPrecisionLabel,
  getPrecisionMeta,
  normalizePrecision,
} from './precision';

describe('normalizePrecision', () => {
  it('maps legacy exact to anime', () => {
    expect(normalizePrecision('exact')).toBe('anime');
    expect(normalizePrecision('anime')).toBe('anime');
    expect(normalizePrecision('franchise')).toBe('franchise');
    expect(normalizePrecision('artist')).toBe('artist');
  });

  it('falls back unknown values to franchise', () => {
    expect(normalizePrecision('title')).toBe('franchise');
    expect(normalizePrecision(undefined)).toBe('franchise');
  });
});

describe('precision labels', () => {
  it('exposes Anime UI copy', () => {
    expect(getPrecisionChipLabel('anime')).toBe('Anime');
    expect(getPrecisionLabel('anime')).toBe('Anime');
  });

  it('exposes Artiste UI copy', () => {
    expect(getPrecisionChipLabel('artist')).toBe('Artiste');
    expect(getPrecisionLabel('artist')).toBe('Artiste');
    expect(getPrecisionMeta('artist').description).toBe('Un artiste suffit');
  });
});
