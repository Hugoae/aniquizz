import type { ZodType } from 'zod';
import type { TypedSocket } from './socketTypes';

/** User-facing copy when a mutating socket payload fails Zod. */
export const INVALID_SOCKET_PAYLOAD_MESSAGE = 'Requête invalide.';

/**
 * Parse a Client→Server payload. Types on `ClientToServerEvents` are compile-time
 * only — Socket.io will still deliver arbitrary JSON.
 */
export function parseSocketPayload<T>(
  socket: TypedSocket,
  schema: ZodType<T>,
  payload: unknown,
): T | null {
  const result = schema.safeParse(payload);
  if (!result.success) {
    socket.emit('error', { message: INVALID_SOCKET_PAYLOAD_MESSAGE });
    return null;
  }
  return result.data;
}
