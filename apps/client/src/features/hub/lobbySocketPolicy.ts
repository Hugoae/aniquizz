import type { GameStatus } from '@aniquizz/shared';

export type LobbyView = 'modes' | 'lobby';

/** Rejoin the Socket.IO channel after a namespace replace — only while waiting. */
export function shouldRejoinLobbyOnConnect(roomId: string, status: GameStatus): boolean {
  return Boolean(roomId) && status === 'waiting';
}

/** Join/create failures that should dump the client back to mode select. */
export function isLobbyJoinRejectedMessage(message: string): boolean {
  const msg = message.toLowerCase();
  return (
    msg.includes('introuvable') ||
    msg.includes('fermé') ||
    msg.includes('complet') ||
    msg.includes('déjà en cours')
  );
}

export function resolveLobbyJoinedKind(input: {
  isHost: boolean;
  isSameRoom: boolean;
}): 'created' | 'joined' {
  return input.isHost && !input.isSameRoom ? 'created' : 'joined';
}

/** Home-stats teaser is only useful on the mode-select landing, not join/config/lobby. */
export function shouldPollHubHomeStats(pathname: string, view: 'modes' | 'lobby'): boolean {
  const onPlayIndex = pathname === '/play' || /\/play\/?$/.test(pathname);
  return onPlayIndex && view === 'modes';
}
