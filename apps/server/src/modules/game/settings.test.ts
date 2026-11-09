import { describe, expect, it } from 'vitest';
import { GAME_CONFIG, type RoomSettings } from '@aniquizz/shared';
import { mergeRoomSettings, normalizeRoomSettings } from './settings';

const meta = { hostName: 'Host', hostAvatar: 'player1' };

describe('normalizeRoomSettings', () => {
  it('keeps playlistId (Zod strip would drop unknown keys)', () => {
    const settings = normalizeRoomSettings(
      {
        soundSelection: 'playlist',
        playlistId: '11111111-1111-4111-8111-111111111111',
        playlistWatched: true,
        watchedAllowFallback: true,
      },
      meta,
    );
    expect(settings.soundSelection).toBe('playlist');
    expect(settings.playlistId).toBe('11111111-1111-4111-8111-111111111111');
    expect(settings.playlistWatched).toBe(true);
    expect(settings.watchedAllowFallback).toBe(true);
  });

  it('rejects playlist source without playlistId', () => {
    expect(() => normalizeRoomSettings({ soundSelection: 'playlist' }, meta)).toThrow(/playlist/i);
  });

  it('keeps decadePlaylistId and allows a decade-only playlist source', () => {
    const decade = '22222222-2222-4222-8222-222222222222';
    const settings = normalizeRoomSettings(
      { soundSelection: 'playlist', decadePlaylistId: decade },
      meta,
    );
    expect(settings.decadePlaylistId).toBe(decade);
    expect(settings.playlistId).toBeUndefined();
  });

  it('keeps a genre pack combined with a decade overlay', () => {
    const genre = '11111111-1111-4111-8111-111111111111';
    const decade = '22222222-2222-4222-8222-222222222222';
    const settings = normalizeRoomSettings(
      { soundSelection: 'playlist', playlistId: genre, decadePlaylistId: decade },
      meta,
    );
    expect(settings.playlistId).toBe(genre);
    expect(settings.decadePlaylistId).toBe(decade);
  });
});

describe('mergeRoomSettings', () => {
  const current = normalizeRoomSettings(
    {
      soundSelection: 'playlist',
      playlistId: '11111111-1111-4111-8111-111111111111',
      playlistWatched: true,
      watchedAllowFallback: true,
    },
    meta,
  ) as RoomSettings;

  it('keeps watchedAllowFallback when playlist overlay is on', () => {
    const next = mergeRoomSettings(current, { soundCount: 15 });
    expect(next.watchedAllowFallback).toBe(true);
    expect(next.playlistId).toBe(current.playlistId);
  });

  it('clears playlist fields when switching to random', () => {
    const next = mergeRoomSettings(current, { soundSelection: 'random' });
    expect(next.playlistId).toBeUndefined();
    expect(next.decadePlaylistId).toBeUndefined();
    expect(next.playlistWatched).toBe(false);
    expect(next.watchedAllowFallback).toBe(false);
  });

  it('clears decadePlaylistId when the host sends null', () => {
    const decade = '22222222-2222-4222-8222-222222222222';
    const withDecade = mergeRoomSettings(current, { decadePlaylistId: decade });
    expect(withDecade.decadePlaylistId).toBe(decade);
    const next = mergeRoomSettings(withDecade, { decadePlaylistId: null });
    expect(next.decadePlaylistId).toBeUndefined();
    expect(next.playlistId).toBe(current.playlistId);
  });
});

describe('speedBonusEnabled', () => {
  it('clears speedBonusEnabled when response type is not typing', () => {
    const settings = normalizeRoomSettings(
      { speedBonusEnabled: true, responseType: 'qcm', maxPlayers: 8 },
      meta,
    );
    expect(settings.speedBonusEnabled).toBe(false);
  });

  it('keeps speedBonusEnabled for typing multiplayer', () => {
    const settings = normalizeRoomSettings(
      { speedBonusEnabled: true, responseType: 'typing', maxPlayers: 8 },
      meta,
    );
    expect(settings.speedBonusEnabled).toBe(true);
  });

  it('lifts legacy gameType sprint into speedBonusEnabled', () => {
    const settings = normalizeRoomSettings({ gameType: 'sprint', maxPlayers: 8 }, meta);
    expect(settings.gameType).toBe('standard');
    expect(settings.responseType).toBe('typing');
    expect(settings.speedBonusEnabled).toBe(true);
  });
});

describe('timeAttack', () => {
  it('forces typing and a pool sized from the budget, and keeps the song start', () => {
    const randomStart = normalizeRoomSettings(
      {
        gameType: 'timeAttack',
        mode: 'solo',
        maxPlayers: 1,
        responseType: 'qcm',
        songStartMode: 'random',
        timeBudgetSeconds: 180,
        speedBonusEnabled: true,
      },
      meta,
    );
    expect(randomStart.gameType).toBe('timeAttack');
    expect(randomStart.responseType).toBe('typing');
    expect(randomStart.songStartMode).toBe('random');
    expect(randomStart.speedBonusEnabled).toBe(false);
    expect(randomStart.timeBudgetSeconds).toBe(180);
    expect(randomStart.soundCount).toBe(60);
    expect(randomStart.timeAttackPunitiveSkip).toBe(true);

    const fromTheTop = normalizeRoomSettings(
      {
        gameType: 'timeAttack',
        mode: 'solo',
        maxPlayers: 1,
        songStartMode: 'beginning',
        timeBudgetSeconds: 180,
      },
      meta,
    );
    expect(fromTheTop.songStartMode).toBe('beginning');
    expect(fromTheTop.soundCount).toBe(60);
  });

  it('keeps multiplayer timeAttack as a versus race with the same forced rules', () => {
    const settings = normalizeRoomSettings(
      {
        gameType: 'timeAttack',
        mode: 'multiplayer',
        maxPlayers: 6,
        responseType: 'qcm',
        timeBudgetSeconds: 180,
      },
      meta,
    );
    expect(settings.gameType).toBe('timeAttack');
    expect(settings.responseType).toBe('typing');
    expect(settings.maxPlayers).toBe(6);
    expect(settings.timeBudgetSeconds).toBe(180);
    expect(settings.soundCount).toBe(60);
  });

  it('grows the pool when the streak prime can double the clock', () => {
    const settings = normalizeRoomSettings(
      {
        gameType: 'timeAttack',
        mode: 'solo',
        maxPlayers: 1,
        timeBudgetSeconds: 180,
        timeAttackStreakBonus: true,
        timeAttackStreakLength: 99,
        timeAttackStreakBonusSeconds: 1,
      },
      meta,
    );
    expect(settings.timeAttackStreakBonus).toBe(true);
    expect(settings.timeAttackStreakLength).toBe(10);
    expect(settings.timeAttackStreakBonusSeconds).toBe(3);
    expect(settings.soundCount).toBe(120);

    const off = normalizeRoomSettings(
      { gameType: 'timeAttack', mode: 'solo', maxPlayers: 1, timeBudgetSeconds: 180 },
      meta,
    );
    expect(off.timeAttackStreakBonus).toBe(false);
    expect(off.soundCount).toBe(60);

    const standard = normalizeRoomSettings(
      {
        mode: 'solo',
        maxPlayers: 1,
        gameType: 'standard',
        soundCount: 180,
        timeAttackStreakBonus: true,
      },
      meta,
    );
    expect(standard.timeAttackStreakBonus).toBeUndefined();
    expect(standard.soundCount).toBe(100);
  });

  it('caps a versus race at 8 players', () => {
    const settings = normalizeRoomSettings(
      { gameType: 'timeAttack', mode: 'multiplayer', maxPlayers: 40 },
      meta,
    );
    expect(settings.maxPlayers).toBe(8);
  });

  it('forbids Watched in a versus race', () => {
    const settings = normalizeRoomSettings(
      {
        gameType: 'timeAttack',
        mode: 'multiplayer',
        maxPlayers: 4,
        soundSelection: 'watched',
        playlistWatched: true,
        watchedAllowFallback: true,
      },
      meta,
    );
    expect(settings.soundSelection).not.toBe('watched');
    expect(settings.playlistWatched).toBe(false);
    expect(settings.watchedAllowFallback).toBe(false);
  });

  it('keeps instant reveal only for a solo standard room', () => {
    const on = normalizeRoomSettings(
      { mode: 'solo', maxPlayers: 1, gameType: 'standard', soloInstantReveal: true },
      meta,
    );
    expect(on.soloInstantReveal).toBe(true);

    const off = normalizeRoomSettings({ mode: 'solo', maxPlayers: 1, gameType: 'standard' }, meta);
    expect(off.soloInstantReveal).toBe(false);

    const multi = normalizeRoomSettings(
      { mode: 'multiplayer', maxPlayers: 8, gameType: 'standard', soloInstantReveal: true },
      meta,
    );
    expect(multi.soloInstantReveal).toBe(false);

    const chrono = normalizeRoomSettings(
      { mode: 'solo', maxPlayers: 1, gameType: 'timeAttack', soloInstantReveal: true },
      meta,
    );
    expect(chrono.soloInstantReveal).toBe(false);
  });

  it('keeps a test match only when the host is allowed to set one', () => {
    const denied = normalizeRoomSettings({ mode: 'solo', maxPlayers: 1, testMatch: true }, meta);
    expect(denied.testMatch).toBe(false);

    const allowed = normalizeRoomSettings(
      { mode: 'multiplayer', maxPlayers: 8, gameType: 'timeAttack', testMatch: true },
      { ...meta, allowTestMatch: true },
    );
    expect(allowed.testMatch).toBe(true);
    expect(allowed.gameType).toBe('timeAttack');
  });

  it('lets only an admin host change the test flag', () => {
    const current = normalizeRoomSettings(
      { mode: 'solo', maxPlayers: 1, testMatch: true },
      { ...meta, allowTestMatch: true },
    );
    expect(mergeRoomSettings(current, { soundCount: 10 }).testMatch).toBe(true);
    expect(
      mergeRoomSettings(current, { testMatch: false }, { allowTestMatch: true }).testMatch,
    ).toBe(false);
    expect(mergeRoomSettings(current, { testMatch: false }).testMatch).toBe(true);

    const plain = normalizeRoomSettings({ mode: 'solo', maxPlayers: 1 }, meta);
    expect(mergeRoomSettings(plain, { testMatch: true }).testMatch).toBe(false);
    expect(mergeRoomSettings(plain, { testMatch: true }, { allowTestMatch: true }).testMatch).toBe(
      true,
    );
  });

  it('does not clamp a standard multiplayer room to 8', () => {
    const settings = normalizeRoomSettings({ mode: 'multiplayer', maxPlayers: 20 }, meta);
    expect(settings.maxPlayers).toBe(20);
  });
});

describe('settings field caps', () => {
  it('rejects an oversized room name or password', () => {
    expect(() =>
      normalizeRoomSettings(
        { roomName: 'x'.repeat(GAME_CONFIG.LIMITS.MAX_ROOM_NAME_LENGTH + 1) },
        meta,
      ),
    ).toThrow();
    expect(() =>
      normalizeRoomSettings(
        { password: 'x'.repeat(GAME_CONFIG.LIMITS.MAX_ROOM_PASSWORD_LENGTH + 1) },
        meta,
      ),
    ).toThrow();
  });

  it('stores a private room with an empty password as public', () => {
    const settings = normalizeRoomSettings({ isPrivate: true, password: '', maxPlayers: 8 }, meta);
    expect(settings.isPrivate).toBe(false);
    expect(settings.password).toBe('');
  });
});
