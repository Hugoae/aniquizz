import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { GameSyncState, LobbyJoinedPayload, RoundStartPayload } from '@aniquizz/shared';
import { createServerBundle, type ServerBundle } from '../test/createServerBundle';
import { countPlayableSongs } from '../test/dbHelpers';
import { hasIntegrationEnv } from '../test/env';
import {
  connectSocket,
  onceEvent,
  type TestSocket,
  waitForEvent,
} from '../test/socketHelpers';
import { getTestAccessToken, TEST_USER_IDS } from '../test/testJwt';

describe.skipIf(!hasIntegrationEnv)('anti-cheat integration', () => {
  let bundle: ServerBundle;
  let socket: TestSocket;
  let roomId: string;
  let hasSongs = false;

  beforeAll(async () => {
    hasSongs = (await countPlayableSongs()) >= 5;
    bundle = await createServerBundle();

    const token = await getTestAccessToken('playerOne');
    socket = await connectSocket(bundle.url, token, 'player_one');

    socket.emit('lobby:create', {
      username: 'player_one',
      avatar: 'player1',
      settings: {
        mode: 'solo',
        maxPlayers: 1,
        soundCount: 5,
        guessDuration: 5,
        soundSelection: 'random',
        responseType: 'qcm',
      },
    });
    const joined = await onceEvent<LobbyJoinedPayload>(socket, 'lobby:joined');
    roomId = joined.roomId;
  });

  afterAll(async () => {
    socket?.disconnect();
    await bundle?.close();
  });

  it('ignores answers submitted before the match starts', async () => {
    const answeredEvents: unknown[] = [];
    socket.on('game:answered', (p) => answeredEvents.push(p));

    socket.emit('game:answer', {
      roomId,
      answer: 'Too Early',
      answerType: 'qcm',
    });

    await new Promise((r) => setTimeout(r, 500));
    expect(answeredEvents).toHaveLength(0);
  });

  it.skipIf(!hasSongs)('does not leak answer content before round_reveal', async () => {
    socket.emit('start_game', { roomId });
    await onceEvent(socket, 'game_started', 60_000);

    const roundStart = await waitForEvent<RoundStartPayload>(
      socket,
      'round_start',
      (p) => Boolean(p.videoKey),
      60_000,
    );

    const firstChoice = roundStart.choices?.[0] ?? 'Unknown Anime';
    socket.emit('game:answer', { roomId, answer: firstChoice, answerType: 'qcm' });

    await onceEvent(socket, 'game:answered', 15_000);

    const syncPromise = onceEvent<GameSyncState>(socket, 'game_state_sync');
    socket.emit('get_game_state', { roomId });
    const sync = await syncPromise;

    const me = sync.players.find((p) => p.id === TEST_USER_IDS.playerOne);
    expect(me?.hasAnswered).toBe(true);
    expect(me?.currentAnswer).toBeNull();
    expect(me?.isCorrect).toBeNull();
    expect(me?.roundPoints).toBe(0);

    await onceEvent(socket, 'round_reveal', 30_000);
  });
});
