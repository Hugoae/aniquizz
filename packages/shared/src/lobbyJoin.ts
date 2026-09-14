import type { GameStatus } from './game';

/**
 * New players may sit only while the lobby is waiting.
 * Reconnects (`players.has(userId)`) bypass this — they already belong to the room.
 */
export function isLobbyOpenForNewPlayers(status: GameStatus): boolean {
  return status === 'waiting';
}

/** Public browser CTA: waiting and not full. */
export function isRoomListJoinable(room: {
  status: GameStatus;
  players: number;
  maxPlayers: number;
}): boolean {
  return isLobbyOpenForNewPlayers(room.status) && room.players < room.maxPlayers;
}

export type LobbyJoinRejectReason =
  'not-found' | 'password-required' | 'bad-password' | 'full' | 'in-progress';

export type LobbyJoinDecision = { ok: true } | { ok: false; reason: LobbyJoinRejectReason };

/**
 * Server-side join gate. `fromInvite` is not an input: invites never skip the password.
 * Returning players skip password, capacity, and waiting checks.
 */
export function evaluateLobbyJoin(input: {
  roomFound: boolean;
  isReturning: boolean;
  isPrivate: boolean;
  storedPassword: string;
  providedPassword?: string;
  playerCount: number;
  maxPlayers: number;
  status: GameStatus;
}): LobbyJoinDecision {
  if (!input.roomFound) return { ok: false, reason: 'not-found' };
  if (input.isReturning) return { ok: true };

  if (input.isPrivate && input.storedPassword && input.storedPassword !== input.providedPassword) {
    if (!input.providedPassword) return { ok: false, reason: 'password-required' };
    return { ok: false, reason: 'bad-password' };
  }

  if (input.playerCount >= input.maxPlayers) return { ok: false, reason: 'full' };
  if (!isLobbyOpenForNewPlayers(input.status)) return { ok: false, reason: 'in-progress' };
  return { ok: true };
}

/** Host kick is a waiting-lobby control: never self, never mid-match. */
export function canKickFromLobby(input: {
  actorIsHost: boolean;
  hostId: string;
  targetId: string;
  status: GameStatus;
}): boolean {
  if (!input.actorIsHost) return false;
  if (!input.targetId || input.targetId === input.hostId) return false;
  return input.status === 'waiting';
}
