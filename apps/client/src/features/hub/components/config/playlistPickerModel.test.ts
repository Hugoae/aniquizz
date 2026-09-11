import { describe, expect, it } from 'vitest';
import type { ThematicPlaylistSummary } from '@aniquizz/shared';
import {
  DECADE_PLAYLIST_SLUGS,
  decadeStartYear,
  defaultDecadePack,
  isDecadePlaylistSlug,
  pickerRows,
  effectivePlaylistSelection,
} from './playlistPickerModel';

const pack = (
  slug: string,
  sortOrder: number,
  extras: Partial<ThematicPlaylistSummary> = {},
): ThematicPlaylistSummary => ({
  id: `id-${slug}`,
  slug,
  name: slug,
  description: '',
  category: 'theme',
  snapshotCount: 1,
  snapshotAt: null,
  sortOrder,
  chips: [],
  ...extras,
});

describe('decade playlist grouping', () => {
  it('recognizes staff decade slugs and parses the start year', () => {
    expect(DECADE_PLAYLIST_SLUGS).toEqual(['1990s', '2000s', '2010s', '2020s']);
    expect(isDecadePlaylistSlug('2010s')).toBe(true);
    expect(isDecadePlaylistSlug('shonen')).toBe(false);
    expect(decadeStartYear('1990s')).toBe(1990);
    expect(decadeStartYear('movies')).toBe(null);
  });

  it('pins Décennie first then packs in staff picker order, hiding Hits faciles', () => {
    const rows = pickerRows([
      pack('easy-hits', 1),
      pack('sci-fi', 80),
      pack('mecha', 40),
      pack('shonen', 10),
      pack('isekai', 100),
      pack('1990s', 110, { category: 'decade' }),
      pack('2010s', 130, { category: 'decade' }),
      pack('2000s', 120, { category: 'decade' }),
      pack('slice-of-life', 30),
      pack('seinen', 20),
      pack('fantasy', 50),
      pack('romance', 60),
      pack('sports', 90),
      pack('supernatural', 70),
    ]);

    expect(rows[0]?.kind).toBe('decade');
    const decade = rows[0];
    if (decade.kind !== 'decade') throw new Error('expected decade row');
    expect(decade.packs.map((p) => p.slug)).toEqual(['1990s', '2000s', '2010s']);
    expect(rows.slice(1).map((row) => (row.kind === 'pack' ? row.pack.slug : row.kind))).toEqual([
      'shonen',
      'seinen',
      'fantasy',
      'romance',
      'sports',
      'slice-of-life',
      'isekai',
      'supernatural',
      'mecha',
      'sci-fi',
    ]);
  });

  it('defaults the slider to 2010s when that pack exists', () => {
    const decades = [
      pack('1990s', 110),
      pack('2010s', 130),
      pack('2020s', 140),
    ];
    expect(defaultDecadePack(decades)?.slug).toBe('2010s');
    expect(defaultDecadePack(decades.slice(0, 1))?.slug).toBe('1990s');
  });

  it('moves a decade stored in playlistId onto decadePlaylistId', () => {
    const playlists = [pack('shonen', 10), pack('2010s', 130, { category: 'decade' })];
    expect(
      effectivePlaylistSelection({ playlistId: 'id-2010s' }, playlists),
    ).toEqual({ playlistId: undefined, decadePlaylistId: 'id-2010s' });
    expect(
      effectivePlaylistSelection({ playlistId: 'id-shonen', decadePlaylistId: 'id-2010s' }, playlists),
    ).toEqual({ playlistId: 'id-shonen', decadePlaylistId: 'id-2010s' });
  });
});
