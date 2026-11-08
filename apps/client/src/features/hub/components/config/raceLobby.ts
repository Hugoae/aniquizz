import {
  TIME_ATTACK_RACE_MAX_PLAYERS,
  TIME_ATTACK_RACE_MIN_PLAYERS,
  type RoomConfig,
} from '@aniquizz/shared';

/**
 * Lobby fields a Chrono versus race forces. Mirrors the server's
 * `applyTimeAttackRules` so the form never offers what the server would undo:
 * 2 to 8 players, and no Watched (every lane must share one draw).
 */
export function raceRoomPatch(
  cfg: Pick<RoomConfig, 'maxPlayers' | 'soundSelection'>,
): Partial<RoomConfig> {
  return {
    maxPlayers: Math.min(
      TIME_ATTACK_RACE_MAX_PLAYERS,
      Math.max(TIME_ATTACK_RACE_MIN_PLAYERS, cfg.maxPlayers ?? TIME_ATTACK_RACE_MIN_PLAYERS),
    ),
    ...(cfg.soundSelection === 'watched' ? { soundSelection: 'random' as const } : {}),
    playlistWatched: false,
    watchedAllowFallback: false,
  };
}
