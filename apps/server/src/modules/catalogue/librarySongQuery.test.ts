import { describe, expect, it, vi } from 'vitest';

vi.mock('@aniquizz/database', () => ({ prisma: {} }));
vi.mock('./librarySearch', () => ({ resolveMatchingAnimeIdsForQuery: vi.fn() }));
vi.mock('./songLikeService', () => ({ resolveLikedIds: vi.fn() }));

import { buildLibrarySongWhere } from './librarySongQuery';

describe('buildLibrarySongWhere', () => {
  it('parses bleach ED5 into anime text, ending, and sequence', () => {
    const where = buildLibrarySongWhere({ q: 'bleach ED5' });
    expect(where).toMatchObject({
      downloadStatus: 'COMPLETED',
      songType: { in: ['ED'] },
    });
    expect(where.AND).toEqual(
      expect.arrayContaining([
        { sequence: 5 },
        {
          OR: expect.arrayContaining([
            { title: { contains: 'bleach', mode: 'insensitive' } },
            { anime: { name: { contains: 'bleach', mode: 'insensitive' } } },
          ]),
        },
      ]),
    );
  });

  it('does not match when type chips conflict with the query token', () => {
    const where = buildLibrarySongWhere({ q: 'bleach ED5', songType: ['OP'] });
    expect(where.AND).toEqual(expect.arrayContaining([{ id: { in: [-1] } }]));
    expect(where.songType).toBeUndefined();
  });

  it('keeps a plain anime query unchanged', () => {
    const where = buildLibrarySongWhere({ q: 'one piece' });
    expect(where.songType).toBeUndefined();
    expect(where.AND).toEqual(
      expect.arrayContaining([
        {
          OR: expect.arrayContaining([
            { anime: { name: { contains: 'one piece', mode: 'insensitive' } } },
          ]),
        },
      ]),
    );
  });
});
