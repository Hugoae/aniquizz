const SENSITIVE_KEY_PATTERN =
  /^(password|token|auth|authorization|secret|jwt|accesstoken|refreshtoken|apikey|api_key|service_role_key)$/i;

const MAX_DEPTH = 6;
/** Arrays longer than this are summarized to `{ _summary, length }` in logs. */
const MAX_LOGGED_ARRAY_ITEMS = 5;

/**
 * Recursively redact sensitive fields before logging socket payloads or settings.
 * Never log JWT tokens or room passwords.
 */
export function sanitizePayload(payload: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return '[max depth]';

  if (payload === null || payload === undefined) return payload;

  if (payload instanceof Error) {
    return {
      name: payload.name,
      message: payload.message,
      stack: payload.stack,
      code: (payload as NodeJS.ErrnoException).code,
    };
  }

  if (typeof payload !== 'object') return payload;

  if (Array.isArray(payload)) {
    if (payload.length > MAX_LOGGED_ARRAY_ITEMS) {
      return { _summary: 'array', length: payload.length };
    }
    return payload.map((item) => sanitizePayload(item, depth + 1));
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      result[key] = '[REDACTED]';
      continue;
    }

    if (key === 'settings' && value && typeof value === 'object') {
      result[key] = sanitizePayload(value, depth + 1);
      continue;
    }

    if (Array.isArray(value) && value.length > MAX_LOGGED_ARRAY_ITEMS) {
      result[key] = { _summary: 'array', length: value.length };
      continue;
    }

    result[key] = sanitizePayload(value, depth + 1);
  }

  return result;
}

/**
 * Event-aware payload shaping for socket logs — avoids dumping the full anime catalogue
 * or other large blobs while keeping mutation events detailed.
 */
export function summarizeSocketPayload(
  event: string,
  direction: 'inbound' | 'outbound',
  payload: unknown,
): unknown {
  if (direction === 'inbound' && event === 'anime:search') {
    const p = payload as { query?: string } | undefined;
    return { _summary: 'anime_search', queryLength: p?.query?.length };
  }

  if (direction === 'outbound' && event === 'anime:search_results') {
    const p = payload as { results?: unknown[] } | undefined;
    return { _summary: 'anime_search_results', count: Array.isArray(p?.results) ? p.results.length : undefined };
  }

  if (direction === 'outbound' && event === 'game_state_sync') {
    const state = payload as
      | { status?: string; currentRound?: number; totalRounds?: number; players?: unknown[] }
      | undefined;
    return {
      _summary: 'game_state',
      status: state?.status,
      currentRound: state?.currentRound,
      totalRounds: state?.totalRounds,
      players: Array.isArray(state?.players) ? state.players.length : undefined,
    };
  }

  if (direction === 'outbound' && event === 'rooms_update') {
    return {
      _summary: 'rooms_snapshot',
      count: Array.isArray(payload) ? payload.length : undefined,
    };
  }

  if (direction === 'outbound' && event === 'my_watched_list') {
    return {
      _summary: 'watched_ids',
      count: Array.isArray(payload) ? payload.length : undefined,
    };
  }

  if (direction === 'inbound' && event === 'get_my_watched') {
    return { _summary: 'get_my_watched' };
  }

  if (direction === 'inbound' && (event === 'get_rooms' || event === 'get_game_state')) {
    return { _summary: event, ...((payload as object) ?? {}) };
  }

  return sanitizePayload(payload);
}
