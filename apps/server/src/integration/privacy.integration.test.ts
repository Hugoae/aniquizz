import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@aniquizz/database';
import { createServerBundle, type ServerBundle } from '../test/createServerBundle';
import { hasIntegrationEnv } from '../test/env';
import { connectSocket, onceEvent, type TestSocket } from '../test/socketHelpers';
import { getTestAccessToken, TEST_USER_IDS } from '../test/testJwt';
import {
  ACCOUNT_PRIVACY_DEFAULTS,
  type AccountPrivacy,
  type PublicProfile,
} from '@aniquizz/shared';

describe.skipIf(!hasIntegrationEnv)('account privacy', () => {
  let bundle: ServerBundle;
  let socket: TestSocket;
  let previous: AccountPrivacy | null = null;

  beforeAll(async () => {
    bundle = await createServerBundle();
    const token = await getTestAccessToken('admin');
    socket = await connectSocket(bundle.url, token, 'admin_dev');
    previous = await prisma.profile.findUnique({
      where: { id: TEST_USER_IDS.admin },
      select: {
        onlineStatusAudience: true,
        matchHistoryAudience: true,
        lobbyInviteAudience: true,
        showFavoriteSongs: true,
        allowFriendRequests: true,
      },
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

  it('echoes a privacy patch and keeps the self public profile complete', async () => {
    const ack = onceEvent<AccountPrivacy>(socket, 'profile:privacy', 8_000);
    socket.emit('profile:update_privacy', {
      onlineStatusAudience: 'nobody',
      matchHistoryAudience: 'nobody',
      lobbyInviteAudience: 'nobody',
    });
    const stored = await ack;
    expect(stored.onlineStatusAudience).toBe('nobody');
    expect(stored.matchHistoryAudience).toBe('nobody');
    expect(stored.lobbyInviteAudience).toBe('nobody');

    const publicAck = onceEvent<PublicProfile>(socket, 'profile:public', 8_000);
    socket.emit('profile:get_public', { userId: TEST_USER_IDS.admin });
    const pub = await publicAck;
    expect(pub.unavailable).toBeFalsy();
    expect(pub.historyRedacted).toBeFalsy();
    expect(pub).not.toHaveProperty('audioVolume');
    expect(pub).not.toHaveProperty('anilistUsername');
    expect(pub).not.toHaveProperty('activeListProvider');
  });

  it('rejects invite audience everyone', async () => {
    const ack = onceEvent<AccountPrivacy>(socket, 'profile:privacy', 8_000);
    socket.emit('profile:update_privacy', { lobbyInviteAudience: 'everyone' });
    const stored = await ack;
    expect(stored.lobbyInviteAudience).toBe('friends');
  });
});
