import { describe, expect, it } from 'vitest';
import { buildListsStatus, type ListStatusRow } from './listStatus';

const row = (patch: Partial<ListStatusRow> = {}): ListStatusRow => ({
  anilistUsername: null,
  malUsername: null,
  activeListProvider: null,
  anilistLastSync: null,
  malLastSync: null,
  ...patch,
});

describe('buildListsStatus', () => {
  it('uses the same canonical active provider as gameplay', () => {
    const status = buildListsStatus(
      row({
        anilistUsername: 'AniUser',
        malUsername: 'MalUser',
        activeListProvider: 'mal',
      }),
    );

    expect(status.active).toBe('mal');
    expect(status.anilist).toMatchObject({ linked: true, active: false, state: 'idle' });
    expect(status.mal).toMatchObject({ linked: true, active: true, state: 'idle' });
  });

  it('falls back when the stored active provider is no longer linked', () => {
    const status = buildListsStatus(row({ malUsername: 'MalUser', activeListProvider: 'anilist' }));

    expect(status.active).toBe('mal');
    expect(status.mal.active).toBe(true);
  });

  it('only enriches the provider represented by the resolved list', () => {
    const status = buildListsStatus(
      row({
        anilistUsername: 'AniUser',
        malUsername: 'MalUser',
        activeListProvider: 'anilist',
      }),
      {
        ids: [1, 2],
        provider: 'anilist',
        state: 'cache',
        fromNetwork: false,
      },
    );

    expect(status.anilist).toMatchObject({ animeCount: 2, state: 'cache' });
    expect(status.mal).toMatchObject({ animeCount: null, state: 'idle' });
  });
});
