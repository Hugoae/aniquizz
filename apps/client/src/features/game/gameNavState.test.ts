import { describe, expect, it } from 'vitest';
import { gamePath, parseGameNavState } from './gameNavState';

describe('parseGameNavState', () => {
  it('reads a valid room id from the query so a refresh can resync', () => {
    expect(parseGameNavState(undefined, '?roomId=A3K9ZQ').roomId).toBe('A3K9ZQ');
    expect(parseGameNavState({}, 'roomId=A3K9ZQ').roomId).toBe('A3K9ZQ');
  });

  it('prefers the URL over leftover location.state', () => {
    expect(parseGameNavState({ roomId: 'OLDCOD' }, '?roomId=A3K9ZQ').roomId).toBe('A3K9ZQ');
  });

  it('falls back to location.state when the query is empty (first navigation)', () => {
    expect(parseGameNavState({ roomId: 'A3K9ZQ', mode: 'solo' }, '').roomId).toBe('A3K9ZQ');
  });

  it('drops missing, empty, or malformed room ids so Game can show the empty state', () => {
    expect(parseGameNavState(undefined, '').roomId).toBeUndefined();
    expect(parseGameNavState({ roomId: '' }, '?roomId=').roomId).toBeUndefined();
    expect(parseGameNavState({ roomId: 'AB-12' }, '?roomId=AB-12').roomId).toBeUndefined();
  });

  it('still reads lobby handover fields from location.state', () => {
    const parsed = parseGameNavState(
      {
        roomId: 'A3K9ZQ',
        mode: 'solo',
        settings: { soundCount: 10 },
        gameData: { firstVideo: 'clip.mp4' },
      },
      '?roomId=A3K9ZQ',
    );
    expect(parsed.mode).toBe('solo');
    expect(parsed.settings).toEqual({ soundCount: 10 });
    expect(parsed.gameData).toEqual({ firstVideo: 'clip.mp4' });
  });
});

describe('gamePath', () => {
  it('puts a valid room id in the query so F5 keeps identity', () => {
    expect(gamePath('A3K9ZQ')).toBe('/game?roomId=A3K9ZQ');
  });

  it('returns a bare /game path when the id is not a lobby code', () => {
    expect(gamePath('')).toBe('/game');
    expect(gamePath('AB-12')).toBe('/game');
  });
});
