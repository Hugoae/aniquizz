import type { GamePlayer, RoomSettings } from '@aniquizz/shared';
import { roomIdInputSchema } from '@aniquizz/shared';

/** Navigation state handed over by the lobby when a match starts. */
export interface GameNavState {
  roomId?: string;
  players?: GamePlayer[];
  settings?: Partial<RoomSettings>;
  mode?: 'solo' | 'multiplayer';
  gameData?: { firstVideo?: string | null };
  gameStartTime?: number;
}

function parseRoomId(value: unknown): string | undefined {
  const parsed = roomIdInputSchema.safeParse({ roomId: value });
  return parsed.success ? parsed.data.roomId : undefined;
}

function roomIdFromSearch(search: string | undefined): string | undefined {
  if (!search) return undefined;
  const raw = search.startsWith('?') ? search.slice(1) : search;
  return parseRoomId(new URLSearchParams(raw).get('roomId'));
}

/**
 * Lobby handover (`location.state`) plus `/game?roomId=` so a refresh can still
 * call `get_game_state`. The query wins when both are present.
 */
export function parseGameNavState(state: unknown, search?: string): GameNavState {
  const fromSearch = roomIdFromSearch(search);
  if (!state || typeof state !== 'object') {
    return fromSearch ? { roomId: fromSearch } : {};
  }

  const s = state as Record<string, unknown>;
  const settings = s.settings;
  const gameData = s.gameData;

  return {
    roomId: fromSearch ?? parseRoomId(s.roomId),
    players: Array.isArray(s.players) ? (s.players as GamePlayer[]) : undefined,
    settings:
      settings && typeof settings === 'object' ? (settings as Partial<RoomSettings>) : undefined,
    mode: s.mode === 'solo' || s.mode === 'multiplayer' ? s.mode : undefined,
    gameData:
      gameData && typeof gameData === 'object'
        ? {
            firstVideo:
              typeof (gameData as { firstVideo?: unknown }).firstVideo === 'string' ||
              (gameData as { firstVideo?: unknown }).firstVideo === null
                ? ((gameData as { firstVideo: string | null }).firstVideo ?? null)
                : undefined,
          }
        : undefined,
    gameStartTime: typeof s.gameStartTime === 'number' ? s.gameStartTime : undefined,
  };
}

/** In-match path that survives a refresh (room id is not only in location.state). */
export function gamePath(roomId: string): string {
  const id = parseRoomId(roomId);
  return id ? `/game?roomId=${encodeURIComponent(id)}` : '/game';
}
