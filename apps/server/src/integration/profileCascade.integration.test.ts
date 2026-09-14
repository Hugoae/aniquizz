import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { prisma } from '@aniquizz/database';
import { hasIntegrationEnv } from '../test/env';
import { TEST_USER_IDS } from '../test/testJwt';

describe.skipIf(!hasIntegrationEnv)('profile prisma cascade', () => {
  it('removes friendships when a profile row is deleted', async () => {
    const otherId = randomUUID();
    const username = `p2casc_${otherId.slice(0, 8)}`;
    await prisma.profile.create({
      data: {
        id: otherId,
        username,
        email: `${username}@aniquizz.test`,
      },
    });
    await prisma.friendship.create({
      data: {
        requesterId: TEST_USER_IDS.admin,
        addresseeId: otherId,
        status: 'ACCEPTED',
      },
    });

    await prisma.profile.delete({ where: { id: otherId } });

    expect(
      await prisma.friendship.findFirst({
        where: { OR: [{ addresseeId: otherId }, { requesterId: otherId }] },
      }),
    ).toBeNull();
    expect(await prisma.profile.findUnique({ where: { id: TEST_USER_IDS.admin } })).not.toBeNull();
  });
});
