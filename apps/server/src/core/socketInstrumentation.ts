import type { TypedSocket } from './socketTypes';
import { logger } from '../utils/logger';
import { summarizeSocketPayload } from '../utils/redact';

/**
 * Outbound events worth logging at info (direct client responses).
 * `game_state_sync` is intentionally excluded: it is a high-frequency polling
 * response and would flood info-level logs with the full room state.
 */
const CRITICAL_OUTBOUND_EVENTS = new Set([
  'error',
  'password_required',
  'lobby:joined',
  'host_promoted',
  'game_over',
  'round_start',
  'round_end',
  'match_end',
]);

/** Read-only / high-volume events — always debug, summarized payload. */
const INBOUND_DEBUG_ONLY_EVENTS = new Set([
  'get_anime_list',
  'get_rooms',
  'get_game_state',
  'get_my_watched',
  'player_watched_ids',
]);

/** Inbound mutation events logged at info. */
const INBOUND_INFO_EVENTS = new Set([
  'lobby:create',
  'lobby:join',
  'leave_room',
  'transfer_host',
  'update_room_settings',
  'start_game',
  'game:answer',
  'game:skip_round',
  'game:cancel',
  'game:return_to_lobby',
  'chat:sendMessage',
  'vote_pause',
  'vote_skip',
]);

const getActor = (socket: TypedSocket) => {
  const data = socket.data;
  return {
    userId: data.userId ?? null,
    username: data.username ?? 'guest',
    isAuthenticated: data.isAuthenticated ?? false,
  };
};

const extractRoomId = (payload: unknown): string | undefined => {
  if (!payload || typeof payload !== 'object') return undefined;
  const roomId = (payload as { roomId?: string }).roomId;
  return typeof roomId === 'string' ? roomId : undefined;
};

const shouldLogInboundAtInfo = (event: string): boolean =>
  INBOUND_INFO_EVENTS.has(event) && !INBOUND_DEBUG_ONLY_EVENTS.has(event);

/**
 * Wraps a socket so every inbound event and critical outbound emit is logged
 * with actor identity and a redacted/summarized payload.
 */
export function instrumentSocket(socket: TypedSocket): void {
  const socketLogger = logger.child({
    context: 'Socket',
    socketId: socket.id,
    userId: socket.data.userId ?? undefined,
  });

  const originalOn = socket.on.bind(socket) as (
    event: string,
    listener: (...args: unknown[]) => void,
  ) => typeof socket;
  const originalEmit = socket.emit.bind(socket) as (event: string, ...args: unknown[]) => boolean;

  socket.on = ((event: string, listener: (...args: unknown[]) => void) => {
    const wrapped = (...args: unknown[]) => {
      const payload = args[0];
      const roomId = extractRoomId(payload);
      const actor = getActor(socket);
      const log = socketLogger.child({
        userId: actor.userId ?? undefined,
        roomId,
      });

      const fields = {
        direction: 'inbound' as const,
        event,
        username: actor.username,
        userId: actor.userId,
        payload: summarizeSocketPayload(event, 'inbound', payload),
      };

      if (shouldLogInboundAtInfo(event)) {
        log.info(`socket:inbound:${event}`, undefined, fields);
      } else {
        log.debug(`socket:inbound:${event}`, undefined, fields);
      }

      return listener(...args);
    };

    return originalOn(event, wrapped as (...args: unknown[]) => void);
  }) as typeof socket.on;

  socket.emit = ((event: string, ...args: unknown[]) => {
    const payload = args[0];
    const roomId = extractRoomId(payload);
    const log = socketLogger.child({ roomId });
    const fields = {
      direction: 'outbound' as const,
      event,
      payload: summarizeSocketPayload(event, 'outbound', payload),
    };

    if (CRITICAL_OUTBOUND_EVENTS.has(event)) {
      log.info(`socket:outbound:${event}`, undefined, fields);
    } else {
      log.debug(`socket:outbound:${event}`, undefined, fields);
    }

    return originalEmit(event, ...args);
  }) as typeof socket.emit;
}
