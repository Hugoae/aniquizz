import { vi } from 'vitest';
import { GAME_CONFIG, type RoomSettings } from '@aniquizz/shared';
import type { TypedServer } from '../../../core/socketTypes';
import { MatchEngine } from './MatchEngine';
import { RaceEngine } from './RaceEngine';
import { Room } from './Room';
import { scoringForSettings, type ScoringStrategy } from './ScoringStrategy';
import type { MatchRepository } from './MatchRepository';
import type { PlaylistBuilder } from './PlaylistBuilder';
import type { PlaylistItem } from './types';

/** `target` is the room id or socket id the emit was addressed to. */
export type EmittedEvent = { event: string; payload: unknown; target?: string };

/** Minimal TypedServer mock — records every room-channel emit. */
export function createMockIo(): { io: TypedServer; emitted: EmittedEvent[] } {
  const emitted: EmittedEvent[] = [];
  const io = {
    to: vi.fn((target: string) => ({
      emit: vi.fn((event: string, payload: unknown) => {
        emitted.push({ event, payload, target });
      }),
    })),
  } as unknown as TypedServer;
  return { io, emitted };
}

export function makeSettings(overrides: Partial<RoomSettings> = {}): RoomSettings {
  return {
    name: 'Test Room',
    roomName: 'Test Room',
    mode: 'multiplayer',
    gameType: 'standard',
    responseType: 'mix',
    soundCount: 2,
    soundTypes: ['opening', 'ending'],
    difficulty: ['easy', 'medium', 'hard'],
    guessDuration: 10,
    soundSelection: 'random',
    precision: 'franchise',
    speedBonusEnabled: false,
    isPrivate: false,
    password: '',
    maxPlayers: 4,
    ...overrides,
  };
}

export function makePlaylistItem(overrides: Partial<PlaylistItem> = {}): PlaylistItem {
  return {
    id: 1,
    anime: 'Naruto',
    franchise: 'Naruto',
    validAnswers: ['Naruto'],
    title: 'OP1',
    artist: 'Test Artist',
    typeLabel: 'OP',
    difficulty: 'medium',
    videoKey: 'videos/test.mp4',
    videoStartTime: 0,
    guessDuration: 10,
    clipDurationSeconds: 10,
    cover: null,
    animeId: 20,
    year: 2002,
    season: 'FALL',
    format: 'TV',
    episodeRange: '1-220',
    coverColor: null,
    siteUrl: 'https://anilist.co/anime/20',
    tags: [],
    choices: ['Naruto', 'Bleach', 'One Piece', 'Dragon Ball'],
    duo: ['Naruto', 'Bleach'],
    ...overrides,
  };
}

export interface EngineHarness {
  room: Room;
  engine: MatchEngine;
  emitted: EmittedEvent[];
  builder: PlaylistBuilder;
  repo: MatchRepository;
}

export function createEngineHarness(
  opts: {
    settings?: Partial<RoomSettings>;
    playlist?: PlaylistItem[];
    playerIds?: string[];
    scoring?: ScoringStrategy;
  } = {},
): EngineHarness {
  const playlist = opts.playlist ?? [
    makePlaylistItem({ id: 1 }),
    makePlaylistItem({ id: 2, anime: 'Bleach', validAnswers: ['Bleach'] }),
  ];
  const settings = makeSettings(opts.settings);
  const { io, emitted } = createMockIo();
  const room = new Room('test-room', io, 'player-1', settings);

  const playerIds = opts.playerIds ?? ['player-1', 'player-2'];
  for (let i = 0; i < playerIds.length; i++) {
    const id = playerIds[i]!;
    room.addOrReconnect(id, `Player ${i + 1}`, 'player1', `socket-${i}`, {
      asHost: i === 0,
    });
  }

  const builder = {
    build: vi.fn().mockResolvedValue({
      playlist,
      fallbackUsed: false,
      abortReason: null,
    }),
  } as unknown as PlaylistBuilder;

  const repo = {
    persistMatch: vi.fn().mockResolvedValue(undefined),
    getXpState: vi.fn().mockResolvedValue(new Map()),
  } as unknown as MatchRepository;

  const engine = new MatchEngine(room, {
    builder,
    repo,
    scoring: opts.scoring ?? scoringForSettings(settings),
  });
  room.attachEngine(engine);

  return { room, engine, emitted, builder, repo };
}

/** Advance intro + round-1 ready beats so the engine enters the guessing phase. */
export async function advanceToGuessing(engine: MatchEngine): Promise<void> {
  await engine.start();
  await vi.advanceTimersByTimeAsync(GAME_CONFIG.TIMERS.INTRO_DELAY);
  await vi.advanceTimersByTimeAsync(GAME_CONFIG.TIMERS.ROUND1_READY_DELAY);
}

export function getPlayer(room: Room, userId: string) {
  const player = room.players.get(userId);
  if (!player) throw new Error(`Missing player ${userId}`);
  return player;
}

export interface RaceHarness extends Omit<EngineHarness, 'engine'> {
  engine: RaceEngine;
}

/** Versus time-attack room: one lane per player, same playlist for everyone. */
export function createRaceHarness(
  opts: {
    settings?: Partial<RoomSettings>;
    playlist?: PlaylistItem[];
    playerIds?: string[];
  } = {},
): RaceHarness {
  const settings = makeSettings({
    gameType: 'timeAttack',
    responseType: 'typing',
    timeBudgetSeconds: 60,
    timeAttackReveal: true,
    maxPlayers: 4,
    ...opts.settings,
  });
  const base = createEngineHarness({
    settings,
    playlist: opts.playlist,
    playerIds: opts.playerIds,
  });
  const engine = new RaceEngine(base.room, {
    builder: base.builder,
    repo: base.repo,
    scoring: scoringForSettings(settings),
  });
  base.room.attachEngine(engine);
  return { ...base, engine };
}

/** Intro + ready beats elapsed: every lane is guessing its first title. */
export async function advanceRaceToGuessing(engine: RaceEngine): Promise<void> {
  await engine.start();
  await vi.advanceTimersByTimeAsync(GAME_CONFIG.TIMERS.INTRO_DELAY);
  await vi.advanceTimersByTimeAsync(GAME_CONFIG.TIMERS.ROUND1_READY_DELAY);
}
