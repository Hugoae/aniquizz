import { describe, expect, it } from 'vitest';
import {
  hasEnoughQcmNames,
  qcmPoolTooSmallReason,
  matchPlaylistPersistence,
  nextPlaylistPublishState,
  playlistChipsFromRecipe,
  PLAYLIST_RECIPE_LIMITS,
  PLAYLIST_UNAVAILABLE_REASON,
  primaryPackStaleDropped,
  publishedPlaylistSourceError,
  recipeHasPositiveConstraint,
  recipesAreEqual,
  recipeYearRangeIsValid,
  resolveRecipeMembership,
  songMatchesRecipeDimensions,
  withPlaylistPoolSoundCount,
  toWatchedPoolStatsView,
  intersectPlaylistSongIds,
  playlistSourceIds,
  hasPlaylistSource,
  playlistSourceDisplayName,
  type PlaylistMembershipSong,
  type PlaylistPoolStats,
  type PlaylistRecipe,
} from './playlist';

const baseSong = (overrides: Partial<PlaylistMembershipSong> & { id: number }): PlaylistMembershipSong => {
  const animeOverrides = overrides.anime;
  return {
    downloadStatus: 'COMPLETED',
    tags: ['Shounen'],
    songType: 'OP',
    difficulty: 'MEDIUM',
    ...overrides,
    anime: {
      seasonYear: 2007,
      format: 'TV',
      franchise: { genres: ['Action', 'Adventure'] },
      ...animeOverrides,
    },
  };
};

describe('songMatchesRecipeDimensions', () => {
  it('treats empty arrays as no constraint', () => {
    const song = baseSong({ id: 1 });
    expect(songMatchesRecipeDimensions(song, {})).toBe(true);
    expect(songMatchesRecipeDimensions(song, { genres: [], tags: [] })).toBe(true);
  });

  it('matches franchise genres with hasSome (OR within the dimension)', () => {
    const song = baseSong({ id: 1 });
    expect(songMatchesRecipeDimensions(song, { genres: ['Drama'] })).toBe(false);
    expect(songMatchesRecipeDimensions(song, { genres: ['Action', 'Drama'] })).toBe(true);
  });

  it('matches song tags with hasSome — Shounen is a tag, not a genre', () => {
    const song = baseSong({ id: 1, tags: ['Shounen'] });
    expect(songMatchesRecipeDimensions(song, { tags: ['Shounen'] })).toBe(true);
    expect(songMatchesRecipeDimensions(song, { genres: ['Shounen'] })).toBe(false);
    expect(songMatchesRecipeDimensions(song, { tags: ['Seinen'] })).toBe(false);
  });

  it('uses the song anime seasonYear, not a franchise origin year', () => {
    const shippudenOp = baseSong({
      id: 2,
      anime: { seasonYear: 2007, format: 'TV', franchise: { genres: ['Action'] } },
    });
    const nineties: PlaylistRecipe = { yearMin: 1990, yearMax: 1999 };
    expect(songMatchesRecipeDimensions(shippudenOp, nineties)).toBe(false);
    expect(songMatchesRecipeDimensions(shippudenOp, { yearMin: 2000, yearMax: 2009 })).toBe(true);
  });

  it('rejects a null seasonYear when a year bound is set', () => {
    const song = baseSong({
      id: 3,
      anime: { seasonYear: null, format: 'TV', franchise: { genres: ['Action'] } },
    });
    expect(songMatchesRecipeDimensions(song, { yearMin: 2010 })).toBe(false);
  });

  it('ANDs across dimensions', () => {
    const song = baseSong({ id: 4, tags: ['Mecha'] });
    expect(
      songMatchesRecipeDimensions(song, { genres: ['Action'], tags: ['Mecha'], formats: ['TV'] }),
    ).toBe(true);
    expect(
      songMatchesRecipeDimensions(song, { genres: ['Action'], tags: ['Mecha'], formats: ['MOVIE'] }),
    ).toBe(false);
  });
});

describe('resolveRecipeMembership', () => {
  const catalogue: PlaylistMembershipSong[] = [
    baseSong({ id: 10, tags: ['Shounen'] }),
    baseSong({
      id: 11,
      tags: ['Seinen'],
      anime: { seasonYear: 1998, format: 'TV', franchise: { genres: ['Drama'] } },
    }),
    baseSong({ id: 12, downloadStatus: 'SKIPPED', tags: ['Shounen'] }),
    baseSong({
      id: 13,
      tags: [],
      anime: { seasonYear: 2015, format: 'MOVIE', franchise: { genres: ['Action'] } },
    }),
  ];

  it('keeps COMPLETED songs matching the recipe', () => {
    expect(resolveRecipeMembership(catalogue, { tags: ['Shounen'] })).toEqual([10]);
  });

  it('unions includeSongIds even when dimensions would exclude the song', () => {
    expect(resolveRecipeMembership(catalogue, { tags: ['Shounen'], includeSongIds: [13] })).toEqual([
      10, 13,
    ]);
  });

  it('does not include SKIPPED songs even via includeSongIds', () => {
    expect(resolveRecipeMembership(catalogue, { includeSongIds: [12] })).not.toContain(12);
  });

  it('drops excludeSongIds even when they match dimensions or includes', () => {
    expect(
      resolveRecipeMembership(catalogue, {
        tags: ['Shounen'],
        includeSongIds: [11],
        excludeSongIds: [10, 11],
      }),
    ).toEqual([]);
  });

  it('filters movies by format', () => {
    expect(resolveRecipeMembership(catalogue, { formats: ['MOVIE'] })).toEqual([13]);
  });
});

describe('hasEnoughQcmNames', () => {
  it('always allows typing-only rooms', () => {
    expect(hasEnoughQcmNames(1, 'typing')).toBe(true);
  });

  it('blocks QCM and mix below 4 distinct names', () => {
    expect(hasEnoughQcmNames(3, 'qcm')).toBe(false);
    expect(hasEnoughQcmNames(3, 'mix')).toBe(false);
    expect(hasEnoughQcmNames(4, 'qcm')).toBe(true);
  });
});

describe('qcmPoolTooSmallReason', () => {
  it('mentions artists in artist precision', () => {
    expect(qcmPoolTooSmallReason('artist')).toContain('artistes');
    expect(qcmPoolTooSmallReason('anime')).toContain('animes');
  });
});

describe('playlistChipsFromRecipe', () => {
  it('builds picker chips from recipe dimensions', () => {
    expect(playlistChipsFromRecipe({ tags: ['Shounen'] })).toEqual(['Shounen']);
    expect(playlistChipsFromRecipe({ genres: ['Mecha'] })).toEqual(['Mecha']);
    expect(playlistChipsFromRecipe({ yearMin: 2010, yearMax: 2019 })).toEqual(['2010–2019']);
    expect(playlistChipsFromRecipe({ formats: ['MOVIE'] })).toEqual(['Film']);
    expect(playlistChipsFromRecipe({ difficulties: ['EASY'] })).toEqual(['Facile']);
  });
});

describe('intersectPlaylistSongIds', () => {
  it('intersects several snapshots and keeps a single set unchanged', () => {
    expect(intersectPlaylistSongIds([[1, 2, 3]])).toEqual([1, 2, 3]);
    expect(intersectPlaylistSongIds([[1, 2, 3, 2], [2, 9, 3]])).toEqual([2, 3]);
    expect(intersectPlaylistSongIds([[1, 2], [3, 4]])).toEqual([]);
    expect(intersectPlaylistSongIds([])).toEqual([]);
  });
});

describe('playlistSourceIds', () => {
  it('dedupes decade-only when the same id is stored twice', () => {
    expect(playlistSourceIds({ playlistId: 'a' })).toEqual(['a']);
    expect(playlistSourceIds({ decadePlaylistId: 'd' })).toEqual(['d']);
    expect(playlistSourceIds({ playlistId: 'a', decadePlaylistId: 'd' })).toEqual(['a', 'd']);
    expect(playlistSourceIds({ playlistId: 'd', decadePlaylistId: 'd' })).toEqual(['d']);
    expect(hasPlaylistSource({})).toBe(false);
  });

  it('joins genre and decade names with an intersection mark', () => {
    const packs = [
      { id: 'a', name: 'Shonen' },
      { id: 'd', name: 'Années 2010' },
    ];
    expect(playlistSourceDisplayName(packs, { playlistId: 'a', decadePlaylistId: 'd' })).toBe(
      'Shonen ∩ Années 2010',
    );
    expect(playlistSourceDisplayName(packs, { decadePlaylistId: 'd' })).toBe('Années 2010');
  });
});

describe('recipesAreEqual', () => {
  it('treats omitted and empty dimensions as the same recipe', () => {
    expect(recipesAreEqual({}, { genres: [], tags: [] })).toBe(true);
    expect(recipesAreEqual({ tags: ['Shounen'] }, { tags: ['Shounen'] })).toBe(true);
  });

  it('ignores array order inside a dimension', () => {
    expect(recipesAreEqual({ tags: ['Mecha', 'Shounen'] }, { tags: ['Shounen', 'Mecha'] })).toBe(true);
    expect(recipesAreEqual({ includeSongIds: [2, 1] }, { includeSongIds: [1, 2] })).toBe(true);
  });

  it('detects a year bound change', () => {
    expect(recipesAreEqual({ yearMin: 2010, yearMax: 2019 }, { yearMin: 2010, yearMax: 2015 })).toBe(
      false,
    );
  });
});

describe('nextPlaylistPublishState', () => {
  const snapshot = { tags: ['Shounen'] };

  it('unpublishes when the recipe changes, even if publish is requested', () => {
    expect(
      nextPlaylistPublishState({
        previousRecipe: snapshot,
        nextRecipe: { tags: ['Seinen'] },
        requestedPublish: true,
        snapshotCount: 100,
      }),
    ).toEqual({ isPublished: false });
  });

  it('leaves publish untouched when only non-recipe fields would change', () => {
    expect(
      nextPlaylistPublishState({
        previousRecipe: snapshot,
        nextRecipe: { tags: ['Shounen'] },
        snapshotCount: 100,
      }),
    ).toEqual({});
  });

  it('honors an explicit unpublish when the recipe is unchanged', () => {
    expect(
      nextPlaylistPublishState({
        previousRecipe: snapshot,
        nextRecipe: snapshot,
        requestedPublish: false,
        snapshotCount: 100,
      }),
    ).toEqual({ isPublished: false });
  });

  it('refuses to publish a pack that has no snapshot yet', () => {
    expect(
      nextPlaylistPublishState({
        previousRecipe: snapshot,
        nextRecipe: snapshot,
        requestedPublish: true,
        snapshotCount: 0,
      }),
    ).toEqual({ isPublished: false });
  });
});

describe('recipeHasPositiveConstraint', () => {
  it('rejects an empty or exclude-only recipe', () => {
    expect(recipeHasPositiveConstraint({})).toBe(false);
    expect(recipeHasPositiveConstraint({ excludeSongIds: [1] })).toBe(false);
  });

  it('accepts a tag or a year bound', () => {
    expect(recipeHasPositiveConstraint({ tags: ['Shounen'] })).toBe(true);
    expect(recipeHasPositiveConstraint({ yearMin: 2010 })).toBe(true);
  });
});

describe('recipeYearRangeIsValid', () => {
  it('rejects inverted year bounds', () => {
    expect(recipeYearRangeIsValid({ yearMin: 2015, yearMax: 2010 })).toBe(false);
    expect(recipeYearRangeIsValid({ yearMin: 2010, yearMax: 2015 })).toBe(true);
    expect(recipeYearRangeIsValid({ yearMin: 2010 })).toBe(true);
  });
});

describe('matchPlaylistPersistence', () => {
  const genre = '11111111-1111-4111-8111-111111111111';
  const decade = '22222222-2222-4222-8222-222222222222';

  it('stores genre and decade ids independently so intersection is not collapsed', () => {
    expect(
      matchPlaylistPersistence({
        soundSelection: 'playlist',
        playlistId: genre,
        decadePlaylistId: decade,
      }),
    ).toEqual({ playlistId: genre, decadePlaylistId: decade });
  });

  it('keeps a decade-only match on decadePlaylistId', () => {
    expect(
      matchPlaylistPersistence({ soundSelection: 'playlist', decadePlaylistId: decade }),
    ).toEqual({ playlistId: null, decadePlaylistId: decade });
  });

  it('clears both ids for a non-playlist source', () => {
    expect(
      matchPlaylistPersistence({ soundSelection: 'random', playlistId: genre, decadePlaylistId: decade }),
    ).toEqual({ playlistId: null, decadePlaylistId: null });
  });
});

describe('publishedPlaylistSourceError', () => {
  it('allows published packs with a snapshot', () => {
    expect(
      publishedPlaylistSourceError(['a'], [{ id: 'a', isPublished: true, snapshotCount: 12 }]),
    ).toBeNull();
  });

  it('rejects a missing, draft, or empty snapshot id', () => {
    expect(publishedPlaylistSourceError(['a'], [])).toBe(PLAYLIST_UNAVAILABLE_REASON);
    expect(
      publishedPlaylistSourceError(['a'], [{ id: 'a', isPublished: false, snapshotCount: 12 }]),
    ).toBe(PLAYLIST_UNAVAILABLE_REASON);
    expect(
      publishedPlaylistSourceError(['a'], [{ id: 'a', isPublished: true, snapshotCount: 0 }]),
    ).toBe(PLAYLIST_UNAVAILABLE_REASON);
    expect(
      publishedPlaylistSourceError(
        ['a', 'b'],
        [{ id: 'a', isPublished: true, snapshotCount: 12 }],
      ),
    ).toBe(PLAYLIST_UNAVAILABLE_REASON);
  });
});

describe('primaryPackStaleDropped', () => {
  it('uses the primary pack only, not the sum of overlays', () => {
    expect(
      primaryPackStaleDropped([
        { snapshotCount: 100, liveCompleted: 90 },
        { snapshotCount: 80, liveCompleted: 70 },
      ]),
    ).toBe(10);
  });
});

describe('PLAYLIST_RECIPE_LIMITS', () => {
  it('caps include lists below Postgres bind-parameter blow-ups', () => {
    expect(PLAYLIST_RECIPE_LIMITS.includeSongIds).toBe(500);
    expect(PLAYLIST_RECIPE_LIMITS.excludeSongIds).toBe(500);
  });
});

describe('withPlaylistPoolSoundCount', () => {
  it('recomputes insufficient flags when the host changes round count', () => {
    const stats: PlaylistPoolStats = {
      playlistId: 'p1',
      snapshotCount: 40,
      filteredCount: 12,
      playableSongs: 8,
      animeCount: 6,
      distinctNames: 6,
      soundCount: 5,
      insufficient: false,
      packInsufficient: false,
      staleDropped: 0,
      playlistWatched: true,
      watchedMode: 'union',
    };
    const next = withPlaylistPoolSoundCount(stats, 20);
    expect(next?.insufficient).toBe(true);
    expect(next?.packInsufficient).toBe(true);
    expect(next?.soundCount).toBe(20);
  });
});

describe('toWatchedPoolStatsView', () => {
  it('forwards AniList listError onto the Watched banner view', () => {
    const stats: PlaylistPoolStats = {
      playlistId: 'p1',
      snapshotCount: 40,
      filteredCount: 12,
      playableSongs: 8,
      animeCount: 6,
      distinctNames: 6,
      soundCount: 10,
      insufficient: false,
      packInsufficient: false,
      staleDropped: 0,
      playlistWatched: true,
      watchedMode: 'union',
      listError: 'anilist_blocked',
    };
    expect(toWatchedPoolStatsView(stats).listError).toBe('anilist_blocked');
    expect(toWatchedPoolStatsView(stats).playableSongs).toBe(8);
  });
});
