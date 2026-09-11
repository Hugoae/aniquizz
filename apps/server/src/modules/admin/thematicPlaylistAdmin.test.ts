import { describe, expect, it } from 'vitest';
import { PLAYLIST_RECIPE_LIMITS } from '@aniquizz/shared';
import { playlistRecipeSchema } from './thematicPlaylistAdmin';

describe('playlistRecipeSchema', () => {
  it('rejects an empty recipe that would match the whole catalogue', () => {
    expect(playlistRecipeSchema.safeParse({}).success).toBe(false);
  });

  it('rejects exclude-only recipes', () => {
    expect(playlistRecipeSchema.safeParse({ excludeSongIds: [1] }).success).toBe(false);
  });

  it('rejects yearMin > yearMax', () => {
    expect(playlistRecipeSchema.safeParse({ yearMin: 2020, yearMax: 2010 }).success).toBe(false);
  });

  it('rejects oversized include lists', () => {
    const includeSongIds = Array.from({ length: PLAYLIST_RECIPE_LIMITS.includeSongIds + 1 }, (_, i) => i + 1);
    expect(playlistRecipeSchema.safeParse({ includeSongIds }).success).toBe(false);
  });

  it('rejects overlong dimension strings', () => {
    expect(playlistRecipeSchema.safeParse({ tags: ['x'.repeat(PLAYLIST_RECIPE_LIMITS.stringMax + 1)] }).success).toBe(
      false,
    );
  });

  it('accepts a tagged recipe', () => {
    expect(playlistRecipeSchema.safeParse({ tags: ['Shounen'] }).success).toBe(true);
  });

  it('accepts include-only recipes', () => {
    expect(playlistRecipeSchema.safeParse({ includeSongIds: [12] }).success).toBe(true);
  });

  it('accepts a closed year range', () => {
    expect(playlistRecipeSchema.safeParse({ yearMin: 2010, yearMax: 2019 }).success).toBe(true);
  });
});
