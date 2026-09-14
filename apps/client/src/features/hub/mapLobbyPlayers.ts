import type { GamePlayer } from '@aniquizz/shared';
import type { LobbyPlayer } from '@/features/hub/components/LobbyPlayerCard';

/** Shape the server actually sends for lobby players (wire-loose superset of GamePlayer). */
export type ServerLobbyPlayer = Partial<GamePlayer> & {
  socketId?: string;
  name?: string;
};

export function mapServerPlayersToLobby(
  serverPlayers: ServerLobbyPlayer[],
  currentHostId?: string,
): LobbyPlayer[] {
  if (!Array.isArray(serverPlayers)) return [];
  return serverPlayers.map((p) => ({
    id: p.id != null ? String(p.id) : '',
    name: p.username || p.name || `Joueur ${String(p.id).substring(0, 4)}`,
    avatar: p.avatar || 'player1',
    isReady: p.isReady || false,
    isHost: currentHostId && String(p.id) === String(currentHostId) ? true : p.isHost || false,
    isInGame: p.isInGame,
    isBot: typeof p.id === 'string' && p.id.startsWith('bot-'),
    role: p.role,
    level: p.level,
    hasWatchedList: Boolean(p.anilistUsername?.trim() || p.malUsername?.trim()),
    watchedListKey: [
      p.activeListProvider ?? '',
      p.anilistUsername?.trim() ?? '',
      p.malUsername?.trim() ?? '',
    ].join(':'),
  }));
}
