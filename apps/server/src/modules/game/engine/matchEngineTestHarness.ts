import { vi } from 'vitest';
import { GAME_CONFIG, type RoomSettings } from '@aniquizz/shared';
import type { TypedServer } from '../../../core/socketTypes';
import { MatchEngine } from './MatchEngine';
import { Room } from './Room';
import { standardScoring, type ScoringStrategy } from './ScoringStrategy';
import type { MatchRepository } from './MatchRepository';
import type { PlaylistBuilder } from './PlaylistBuilder';
import type { PlaylistItem } from './types';

export type EmittedEvent = { event: string; payload: unknown };

/** Minimal TypedServer mock — records every room-channel emit. */
export function createMockIo(): { io: TypedServer; emitted: EmittedEvent[] } {
  const emitted: EmittedEvent[] = [];
  const channel = {
    emit: vi.fn((event: string, payload: unknown) => {
      emitted.push({ event, payload });
    }),
  };
  const io = {
    to: vi.fn(() => channel),
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
    soundTypes: ['OP', 'ED'],
    difficulty: ['easy', 'medium', 'hard'],
    guessDuration: 10,
    soundSelection: 'random',
    precision: 'franchise',
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

export function createEngineHarness(opts: {
  settings?: Partial<RoomSettings>;
  playlist?: PlaylistItem[];
  playerIds?: string[];
  scoring?: ScoringStrategy;
} = {}): EngineHarness {
  const playlist = opts.playlist ?? [makePlaylistItem({ id: 1 }), makePlaylistItem({ id: 2, anime: 'Bleach', validAnswers: ['Bleach'] })];
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
    scoring: opts.scoring ?? standardScoring,
  });

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
