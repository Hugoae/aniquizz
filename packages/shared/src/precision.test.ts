import { describe, expect, it } from 'vitest';
import {
  getPrecisionChipLabel,
  getPrecisionLabel,
  normalizePrecision,
} from '@aniquizz/shared';

describe('normalizePrecision', () => {
  it('maps legacy exact to anime', () => {
    expect(normalizePrecision('exact')).toBe('anime');
    expect(normalizePrecision('anime')).toBe('anime');
    expect(normalizePrecision('franchise')).toBe('franchise');
  });
});

describe('precision labels', () => {
  it('exposes Anime UI copy', () => {
    expect(getPrecisionChipLabel('anime')).toBe('Anime');
    expect(getPrecisionLabel('anime')).toBe('Anime');
  });
});
