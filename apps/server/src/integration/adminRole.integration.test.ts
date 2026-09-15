import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@aniquizz/database';
import { createServerBundle, type ServerBundle } from '../test/createServerBundle';
import { adminSetRole } from '../test/adminHttpHelpers';
import { hasIntegrationEnv } from '../test/env';
import { getTestAccessToken, TEST_USER_IDS } from '../test/testJwt';

describe.skipIf(!hasIntegrationEnv)('admin PATCH /users/:id/role', () => {
  let bundle: ServerBundle;
  let token: string;

  beforeAll(async () => {
    bundle = await createServerBundle();
    token = await getTestAccessToken('admin');
  });

  afterAll(async () => {
    await bundle.close();
  });

  it('rejects changing your own role', async () => {
    const { status, body } = await adminSetRole(bundle.url, token, TEST_USER_IDS.admin, 'USER');
    expect(status).toBe(400);
    expect(body).toEqual({ error: 'Vous ne pouvez pas modifier votre propre rôle.' });
    const row = await prisma.profile.findUnique({
      where: { id: TEST_USER_IDS.admin },
      select: { role: true },
    });
    expect(row?.role).toBe('ADMIN');
  });

  it('rejects demoting an owner-protected account', async () => {
    const existing = await prisma.profile.findFirst({
      where: { username: { equals: 'kirikou', mode: 'insensitive' } },
      select: { id: true, role: true },
    });
    let targetId = existing?.id;
    let created = false;
    const previousRole = existing?.role ?? 'USER';
    if (!targetId) {
      targetId = randomUUID();
      created = true;
      await prisma.profile.create({
        data: {
          id: targetId,
          username: 'kirikou',
          email: `kirikou-role-guard-${targetId}@aniquizz.test`,
        },
      });
    }

    try {
      const { status, body } = await adminSetRole(bundle.url, token, targetId, 'USER');
      expect(status).toBe(403);
      expect(body).toEqual({
        error: 'Ce compte est protégé contre les actions de modération.',
      });
      const row = await prisma.profile.findUnique({
        where: { id: targetId },
        select: { role: true },
      });
      expect(row?.role).toBe(previousRole);
    } finally {
      if (created && targetId) {
        await prisma.profile.delete({ where: { id: targetId } });
      }
    }
  });

  it('lets an admin change role on a non-protected account', async () => {
    const id = randomUUID();
    await prisma.profile.create({
      data: {
        id,
        username: `role_tgt_${id.slice(0, 8)}`,
        email: `role-tgt-${id}@aniquizz.test`,
      },
    });
    try {
      const { status, body } = await adminSetRole(bundle.url, token, id, 'MODERATOR');
      expect(status).toBe(200);
      expect(body).toEqual({ id, role: 'MODERATOR' });
    } finally {
      await prisma.profile.delete({ where: { id } });
    }
  });
});
