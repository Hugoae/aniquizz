import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@aniquizz/database';
import { createServerBundle, type ServerBundle } from '../test/createServerBundle';
import { hasIntegrationEnv } from '../test/env';
import { connectSocket, onceEvent, type TestSocket } from '../test/socketHelpers';
import { getTestAccessToken, TEST_USER_IDS } from '../test/testJwt';
import { PLAYER_PREFS_DEFAULTS, type PlayerPrefs, type PublicProfile } from '@aniquizz/shared';

const PREFS_SELECT = {
  audioVolume: true,
  audioMuted: true,
  motionMode: true,
  autofocusAnswer: true,
  submitOnEnter: true,
  soloAutoReveal: true,
  showShortcutReminder: true,
  friendRequestVisual: true,
  friendRequestSound: true,
  lobbyInviteVisual: true,
  lobbyInviteSound: true,
} as const;

describe.skipIf(!hasIntegrationEnv)('player prefs', () => {
  let bundle: ServerBundle;
  let socket: TestSocket;
  let previous: PlayerPrefs | null = null;

  beforeAll(async () => {
    bundle = await createServerBundle();
    const token = await getTestAccessToken('admin');
    socket = await connectSocket(bundle.url, token, 'admin_dev');
    previous = await prisma.profile.findUnique({
      where: { id: TEST_USER_IDS.admin },
      select: PREFS_SELECT,
    });
  });

  afterAll(async () => {
    if (previous) {
      await prisma.profile.update({
        where: { id: TEST_USER_IDS.admin },
        data: previous,
      });
    }
    socket.disconnect();
    await bundle.close();
  });

  it('clamps volume, persists mute, and echoes the stored prefs', async () => {
    const ack = onceEvent<PlayerPrefs>(socket, 'profile:prefs', 8_000);
    socket.emit('profile:update_prefs', { audioVolume: 150, audioMuted: true });
    const stored = await ack;
    expect(stored).toEqual({
      ...PLAYER_PREFS_DEFAULTS,
      audioVolume: 100,
      audioMuted: true,
    });

    const row = await prisma.profile.findUnique({
      where: { id: TEST_USER_IDS.admin },
      select: PREFS_SELECT,
    });
    expect(row).toEqual({
      ...PLAYER_PREFS_DEFAULTS,
      audioVolume: 100,
      audioMuted: true,
    });
  });

  it('keeps omitted keys and does not leak prefs on the public profile', async () => {
    const ack = onceEvent<PlayerPrefs>(socket, 'profile:prefs', 8_000);
    socket.emit('profile:update_prefs', { audioVolume: 42, motionMode: 'full' });
    const stored = await ack;
    expect(stored).toEqual({
      ...PLAYER_PREFS_DEFAULTS,
      audioVolume: 42,
      audioMuted: true,
      motionMode: 'full',
    });

    const publicAck = onceEvent<PublicProfile>(socket, 'profile:public', 8_000);
    socket.emit('profile:get_public', { userId: TEST_USER_IDS.admin });
    const pub = await publicAck;
    expect(pub).not.toHaveProperty('audioVolume');
    expect(pub).not.toHaveProperty('audioMuted');
    expect(pub).not.toHaveProperty('motionMode');
    expect(pub).not.toHaveProperty('friendRequestSound');
  });
});
