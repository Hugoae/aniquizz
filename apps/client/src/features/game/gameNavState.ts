import type { GamePlayer, RoomSettings } from '@aniquizz/shared';

/** Navigation state handed over by the lobby when a match starts. */
export interface GameNavState {
  roomId?: string;
  players?: GamePlayer[];
  settings?: Partial<RoomSettings>;
  mode?: 'solo' | 'multiplayer';
  gameData?: { firstVideo?: string | null };
  gameStartTime?: number;
}

export function parseGameNavState(state: unknown): GameNavState {
  if (!state || typeof state !== 'object') return {};

  const s = state as Record<string, unknown>;
  const settings = s.settings;
  const gameData = s.gameData;

  return {
    roomId: typeof s.roomId === 'string' ? s.roomId : undefined,
    players: Array.isArray(s.players) ? (s.players as GamePlayer[]) : undefined,
    settings:
      settings && typeof settings === 'object'
        ? (settings as Partial<RoomSettings>)
        : undefined,
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
