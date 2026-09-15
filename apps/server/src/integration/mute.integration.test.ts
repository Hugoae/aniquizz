import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@aniquizz/database';
import type { LobbyJoinedPayload, SanctionUpdatePayload } from '@aniquizz/shared';
import { env } from '../config/env';
import { createServerBundle, type ServerBundle } from '../test/createServerBundle';
import { adminMute, adminMuteStatus } from '../test/adminHttpHelpers';
import { clearModeration, setModeration } from '../test/dbHelpers';
import { hasIntegrationEnv } from '../test/env';
import { connectSocket, onceEvent, type TestSocket } from '../test/socketHelpers';
import { getTestAccessToken, signTestToken, TEST_USER_IDS } from '../test/testJwt';

const anonKey = (): string =>
  process.env.SUPABASE_ANON_KEY?.trim() || process.env.VITE_SUPABASE_ANON_KEY?.trim() || '';

/** Second player so admin API mute tests never target the staff account. */
async function provisionMuteTarget(): Promise<{
  id: string;
  username: string;
  token: string;
  cleanup: () => Promise<void>;
}> {
  const id = randomUUID();
  const username = `mt_${id.slice(0, 8)}`;
  const email = `${username}@aniquizz.test`;

  if (env.SUPABASE_JWT_SECRET) {
    await prisma.profile.create({
      data: { id, username, email, role: 'USER' },
    });
    return {
      id,
      username,
      token: signTestToken(id, username),
      cleanup: async () => {
        await prisma.profile.delete({ where: { id } }).catch(() => undefined);
      },
    };
  }

  const password = process.env.TEST_ACCOUNTS_PASSWORD?.trim();
  const key = anonKey();
  if (!password || !key) {
    throw new Error('Need SUPABASE_JWT_SECRET or anon key + TEST_ACCOUNTS_PASSWORD');
  }

  const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const created = await admin.auth.admin.createUser({
    id,
    email,
    password,
    email_confirm: true,
    user_metadata: { username },
  });
  if (created.error || !created.data.user) {
    throw created.error ?? new Error('Failed to create mute target');
  }
  const userId = created.data.user.id;
  await prisma.profile.upsert({
    where: { id: userId },
    create: { id: userId, username, email, role: 'USER' },
    update: { username, email, role: 'USER' },
  });

  const client = createClient(env.SUPABASE_URL, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) {
    await admin.auth.admin.deleteUser(userId).catch(() => undefined);
    await prisma.profile.delete({ where: { id: userId } }).catch(() => undefined);
    throw error ?? new Error('No session for mute target');
  }

  return {
    id: userId,
    username,
    token: data.session.access_token,
    cleanup: async () => {
      await prisma.profile.delete({ where: { id: userId } }).catch(() => undefined);
      await admin.auth.admin.deleteUser(userId).catch(() => undefined);
    },
  };
}

describe.skipIf(!hasIntegrationEnv)('mute at chat integration', () => {
  let bundle: ServerBundle;
  let socket: TestSocket;
  let roomId: string;
  let target: { id: string; username: string; token: string; cleanup: () => Promise<void> };
  let adminToken: string;

  beforeAll(async () => {
    bundle = await createServerBundle();
    target = await provisionMuteTarget();
    adminToken = await getTestAccessToken('admin');
    socket = await connectSocket(bundle.url, target.token, target.username);

    socket.emit('lobby:create', {
      username: target.username,
      avatar: 'player1',
      settings: { mode: 'solo', maxPlayers: 1 },
    });
    const joined = await onceEvent<LobbyJoinedPayload>(socket, 'lobby:joined');
    roomId = joined.roomId;
  }, 90_000);

  afterAll(async () => {
    await clearModeration(TEST_USER_IDS.admin).catch(() => undefined);
    if (target) await clearModeration(target.id).catch(() => undefined);
    socket?.disconnect();
    await target?.cleanup();
    await bundle?.close();
  }, 90_000);

  afterEach(async () => {
    if (target) await clearModeration(target.id);
  });

  it('delivers chat messages when the user is not muted', async () => {
    const messagePromise = onceEvent<{ content: string }>(socket, 'chat:message');
    socket.emit('chat:sendMessage', { roomId, content: 'hello integration test' });
    const message = await messagePromise;
    expect(message.content).toBe('hello integration test');
  });

  it('blocks chat when mutedUntil is active', async () => {
    await setModeration(target.id, {
      mutedUntil: new Date(Date.now() + 60 * 60_000),
    });

    socket.disconnect();
    socket = await connectSocket(bundle.url, target.token, target.username);
    socket.emit('lobby:join', {
      roomId,
      username: target.username,
      avatar: 'player1',
    });
    await onceEvent(socket, 'lobby:joined');

    const errorPromise = onceEvent<{ message: string }>(socket, 'error');
    socket.emit('chat:sendMessage', { roomId, content: 'should be blocked' });
    const err = await errorPromise;
    expect(err.message).toMatch(/silence|modération/i);
  });

  it('rejects muting the authenticated admin themselves', async () => {
    const { status, body } = await adminMuteStatus(bundle.url, adminToken, TEST_USER_IDS.admin, 60);
    expect(status).toBe(400);
    expect(body).toEqual({
      error: 'Vous ne pouvez pas appliquer cette action à votre propre compte.',
    });
  });

  it('blocks chat immediately when muted via admin API (no reconnect)', async () => {
    await adminMute(bundle.url, adminToken, target.id, 60);

    const errorPromise = onceEvent<{ message: string }>(socket, 'error');
    socket.emit('chat:sendMessage', { roomId, content: 'blocked via admin api' });
    const err = await errorPromise;
    expect(err.message).toMatch(/silence|modération/i);
  });

  it('unblocks chat immediately when mute is lifted via admin API', async () => {
    await adminMute(bundle.url, adminToken, target.id, 60);
    await adminMute(bundle.url, adminToken, target.id, null);

    const messagePromise = onceEvent<{ content: string }>(socket, 'chat:message');
    socket.emit('chat:sendMessage', { roomId, content: 'unblocked via admin api' });
    const message = await messagePromise;
    expect(message.content).toBe('unblocked via admin api');
  });

  it('emits profile:sanction_updated when muted via admin API', async () => {
    const payloadPromise = onceEvent<SanctionUpdatePayload>(socket, 'profile:sanction_updated');
    await adminMute(bundle.url, adminToken, target.id, 60);
    const payload = await payloadPromise;
    expect(payload.mutedUntil).toBeTruthy();
    await adminMute(bundle.url, adminToken, target.id, null);
  });

  it('writes MUTE and UNMUTE rows to the staff audit journal', async () => {
    await adminMute(bundle.url, adminToken, target.id, 60);
    const muteRow = await prisma.staffAuditLog.findFirst({
      where: { targetId: target.id, action: 'MUTE' },
      orderBy: { createdAt: 'desc' },
    });
    expect(muteRow?.actorId).toBe(TEST_USER_IDS.admin);
    expect(muteRow?.durationMinutes).toBe(60);
    expect(muteRow?.targetUsername).toBe(target.username);

    await adminMute(bundle.url, adminToken, target.id, null);
    const lift = await prisma.staffAuditLog.findFirst({
      where: { targetId: target.id, action: 'UNMUTE' },
      orderBy: { createdAt: 'desc' },
    });
    expect(lift?.actorId).toBe(TEST_USER_IDS.admin);
  });
});
