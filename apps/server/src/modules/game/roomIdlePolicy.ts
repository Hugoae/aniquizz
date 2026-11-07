import type { GameStatus } from '@aniquizz/shared';

/**
 * Idle / stale room policy. Kept pure (no timers, no sockets) so every status
 * branch is unit-testable; `GameManager.sweepIdleRooms` only executes the verdict.
 */

/** How often the idle-room sweep runs. */
export const SWEEP_INTERVAL_MS = 60_000;
/** A `waiting` lobby with no human activity for this long is closed. */
export const LOBBY_IDLE_MS = 30 * 60_000;
/** A `finished` room (game-over screen) idle for this long is closed. */
export const FINISHED_IDLE_MS = 15 * 60_000;
/** A match paused longer than this is auto-cancelled back to the lobby. */
export const PAUSE_MAX_MS = 15 * 60_000;
/** A `playing` match with no round progress for this long is force-cancelled. */
export const MATCH_STALE_MS = 5 * 60_000;
/** `starting` is a transient state (playlist build); beyond this the start is stuck. */
export const STARTING_STUCK_MS = 3 * 60_000;
/**
 * Absolute ceiling for a room that is not running a match. Idle clocks can be kept
 * alive indefinitely by a flapping client, so this cap does not depend on activity.
 */
export const MAX_IDLE_ROOM_LIFETIME_MS = 3 * 60 * 60_000;

export type RoomIdleSnapshot = {
  status: GameStatus;
  lastActivityAt: number;
  createdAt: Date;
  pausedForMs: number | null;
};

export type RoomIdleVerdict =
  | { action: 'keep' }
  /** Tear the room down and tell its members. */
  | { action: 'close'; reason: string; clientMessage: string }
  /** Abort the match and return the room to the lobby. */
  | { action: 'cancel'; reason: string; clientMessage: string };

const KEEP: RoomIdleVerdict = { action: 'keep' };

export function evaluateRoomIdle(room: RoomIdleSnapshot, now: number): RoomIdleVerdict {
  const idleMs = now - room.lastActivityAt;

  if (room.status === 'paused') {
    const pausedMs = room.pausedForMs;
    if (pausedMs !== null && pausedMs > PAUSE_MAX_MS) {
      return {
        action: 'cancel',
        reason: `paused ${Math.round(pausedMs / 60_000)}min`,
        clientMessage: 'Partie annulée : en pause depuis trop longtemps.',
      };
    }
    return KEEP;
  }

  if (room.status === 'playing') {
    if (idleMs > MATCH_STALE_MS) {
      return {
        action: 'cancel',
        reason: 'match stalled (no progress)',
        clientMessage: 'Partie interrompue : aucune activité détectée.',
      };
    }
    return KEEP;
  }

  if (room.status === 'starting') {
    if (idleMs > STARTING_STUCK_MS) {
      return {
        action: 'cancel',
        reason: 'start stuck',
        clientMessage: 'Le lancement de la partie a échoué. Veuillez réessayer.',
      };
    }
    return KEEP;
  }

  // `waiting` and `finished` hold no running match: idle limit, then hard age cap.
  const limit = room.status === 'finished' ? FINISHED_IDLE_MS : LOBBY_IDLE_MS;
  const tooOld = now - room.createdAt.getTime() > MAX_IDLE_ROOM_LIFETIME_MS;
  if (idleMs > limit || tooOld) {
    return {
      action: 'close',
      reason: `${room.status} room ${tooOld && idleMs <= limit ? 'max lifetime' : 'idle'}`,
      clientMessage: "Salon fermé pour cause d'inactivité.",
    };
  }
  return KEEP;
}
