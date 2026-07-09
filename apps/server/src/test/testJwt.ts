import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

/** Fixed UUIDs from packages/database/scripts/seed_test_accounts.ts */
export const TEST_USER_IDS = {
  admin: '00000000-0000-4000-8000-000000000001',
  playerOne: '00000000-0000-4000-8000-000000000002',
  playerTwo: '00000000-0000-4000-8000-000000000003',
  moderator: '00000000-0000-4000-8000-000000000004',
} as const;

export type TestUserKey = keyof typeof TEST_USER_IDS;

export const TEST_USERNAMES = {
  [TEST_USER_IDS.admin]: 'admin_dev',
  [TEST_USER_IDS.playerOne]: 'player_one',
  [TEST_USER_IDS.playerTwo]: 'player_two',
  [TEST_USER_IDS.moderator]: 'moderator_dev',
} as const;

export const TEST_EMAILS: Record<TestUserKey, string> = {
  admin: 'admin@aniquizz.test',
  playerOne: 'player1@aniquizz.test',
  playerTwo: 'player2@aniquizz.test',
  moderator: 'moderator@aniquizz.test',
};

/** Sign an HS256 Supabase-compatible access token (when SUPABASE_JWT_SECRET is set). */
export function signTestToken(userId: string, username: string): string {
  if (!env.SUPABASE_JWT_SECRET) {
    throw new Error('SUPABASE_JWT_SECRET is required for HS256 test tokens');
  }
  return jwt.sign(
    { sub: userId, user_metadata: { username } },
    env.SUPABASE_JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '1h' },
  );
}

const anonKey = (): string =>
  process.env.SUPABASE_ANON_KEY?.trim() ||
  process.env.VITE_SUPABASE_ANON_KEY?.trim() ||
  '';

/** Real Supabase access token via sign-in (preferred — no JWT secret needed). */
export async function getTestAccessToken(userKey: TestUserKey): Promise<string> {
  const userId = TEST_USER_IDS[userKey];
  const username = TEST_USERNAMES[userId];

  if (env.SUPABASE_JWT_SECRET) {
    return signTestToken(userId, username);
  }

  const key = anonKey();
  const password = process.env.TEST_ACCOUNTS_PASSWORD?.trim();
  if (!key || !password) {
    throw new Error(
      'Set SUPABASE_ANON_KEY + TEST_ACCOUNTS_PASSWORD (or SUPABASE_JWT_SECRET) for integration tests',
    );
  }

  const client = createClient(env.SUPABASE_URL, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await client.auth.signInWithPassword({
    email: TEST_EMAILS[userKey],
    password,
  });

  if (error || !data.session?.access_token) {
    throw error ?? new Error(`No session for ${TEST_EMAILS[userKey]}`);
  }

  return data.session.access_token;
}
