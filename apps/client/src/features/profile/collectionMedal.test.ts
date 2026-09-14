import { describe, expect, it } from 'vitest';
import { collectionMedal, COLLECTION_MEDALS } from './collectionMedal';

describe('collectionMedal', () => {
  it('uses token classes rather than hex colors', () => {
    expect(COLLECTION_MEDALS.every((medal) => medal.textClass.startsWith('text-'))).toBe(true);
    expect(COLLECTION_MEDALS.every((medal) => !medal.textClass.includes('#'))).toBe(true);
  });

  it('returns null under bronze and the highest reached tier otherwise', () => {
    expect(collectionMedal(0)).toBeNull();
    expect(collectionMedal(24.9)).toBeNull();
    expect(collectionMedal(25)?.key).toBe('bronze');
    expect(collectionMedal(50)?.key).toBe('silver');
    expect(collectionMedal(75)?.key).toBe('gold');
    expect(collectionMedal(100)?.key).toBe('platinum');
  });
});
