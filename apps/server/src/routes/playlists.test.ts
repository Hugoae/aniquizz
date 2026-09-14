import { describe, expect, it } from 'vitest';
import { PUBLISHED_PLAYLISTS_CACHE_CONTROL } from './playlists';

describe('GET /playlists cache', () => {
  it('allows short public caching with stale-while-revalidate', () => {
    expect(PUBLISHED_PLAYLISTS_CACHE_CONTROL).toBe(
      'public, max-age=60, stale-while-revalidate=300',
    );
  });
});
