import { describe, expect, it } from 'vitest';
import { RETIRED_STAFF_PLAYLIST_SLUGS, STAFF_THEMATIC_PLAYLISTS } from './thematicPlaylistSeeds';
import { recipeHasPositiveConstraint, recipeYearRangeIsValid } from './playlist';

describe('STAFF_THEMATIC_PLAYLISTS', () => {
  it('has unique slugs and drops retired staff packs', () => {
    const slugs = STAFF_THEMATIC_PLAYLISTS.map((pack) => pack.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs).not.toContain('movies');
    expect(slugs).not.toContain('easy-hits');
    expect(slugs).toEqual(
      expect.arrayContaining(['1990s', '2000s', '2010s', '2020s', 'isekai', 'fantasy']),
    );
    for (const retired of RETIRED_STAFF_PLAYLIST_SLUGS) {
      expect(slugs).not.toContain(retired);
    }
  });

  it('gives every staff recipe a positive constraint and a valid year range', () => {
    for (const pack of STAFF_THEMATIC_PLAYLISTS) {
      expect(recipeHasPositiveConstraint(pack.recipe)).toBe(true);
      expect(recipeYearRangeIsValid(pack.recipe)).toBe(true);
    }
  });

  it('describes non-decade packs with famous anime examples', () => {
    const shonen = STAFF_THEMATIC_PLAYLISTS.find((pack) => pack.slug === 'shonen');
    const nineties = STAFF_THEMATIC_PLAYLISTS.find((pack) => pack.slug === '1990s');
    expect(shonen?.description).toMatch(/Naruto/);
    expect(nineties?.description).toMatch(/1990/);
    expect(nineties?.description).not.toMatch(/Naruto/);
  });
});
