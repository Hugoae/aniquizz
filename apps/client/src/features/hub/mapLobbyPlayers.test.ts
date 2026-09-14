import { describe, expect, it } from 'vitest';
import { mapServerPlayersToLobby } from './mapLobbyPlayers';

describe('mapServerPlayersToLobby', () => {
  it('uses player id (never socket.id) and flags bots', () => {
    const mapped = mapServerPlayersToLobby(
      [
        {
          id: 'user-1',
          username: 'Hôte',
          socketId: 'sock-host',
          isHost: false,
        },
        { id: 'bot-3', username: 'Bot', isBot: true },
      ],
      'user-1',
    );
    expect(mapped[0]?.id).toBe('user-1');
    expect(mapped[0]?.isHost).toBe(true);
    expect(mapped[1]?.isBot).toBe(true);
  });
});
