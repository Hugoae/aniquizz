export type PlayConfigIntent = 'solo' | 'create' | 'edit';

const INTENTS = new Set<PlayConfigIntent>(['solo', 'create', 'edit']);

export function parsePlayConfigSearch(search: string): {
  intent: PlayConfigIntent | null;
  roomId: string | null;
} {
  const raw = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  const intentRaw = params.get('intent');
  const intent =
    intentRaw && INTENTS.has(intentRaw as PlayConfigIntent)
      ? (intentRaw as PlayConfigIntent)
      : null;
  const roomId = params.get('roomId')?.trim() || null;
  return { intent, roomId };
}

export function resolvePlayConfigIntent(
  search: string,
  stateIntent?: PlayConfigIntent | null,
): PlayConfigIntent {
  return parsePlayConfigSearch(search).intent ?? stateIntent ?? 'create';
}

/** Path that survives a refresh (intent is not only in location.state). */
export function playCreatePath(intent: PlayConfigIntent, roomId?: string): string {
  const params = new URLSearchParams({ intent });
  if (intent === 'edit' && roomId) params.set('roomId', roomId);
  return `/play/create?${params.toString()}`;
}

export type LobbySettingsAction = 'create' | 'update' | 'missing-room';

/**
 * Only an explicit `edit` intent with a room id patches the live lobby.
 * `create` / `solo` always emit `lobby:create`, even if a leftover room id
 * is still in memory — otherwise F5 on the create form would mutate the old room.
 */
export function resolveLobbySettingsAction(
  intent: PlayConfigIntent,
  roomId: string,
): LobbySettingsAction {
  if (intent === 'edit') return roomId ? 'update' : 'missing-room';
  return 'create';
}
