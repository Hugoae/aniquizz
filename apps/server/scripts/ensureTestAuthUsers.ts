/**
 * Ensures Supabase Auth users exist for deterministic integration/e2e test accounts.
 * Profile rows are seeded separately (seed_test_accounts.ts); Auth user ids MUST match.
 *
 * DEV ONLY — refuses production.
 */
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '../.env') });

const TEST_ACCOUNTS = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'admin@aniquizz.test',
    username: 'admin_dev',
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    email: 'player1@aniquizz.test',
    username: 'player_one',
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    email: 'player2@aniquizz.test',
    username: 'player_two',
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    email: 'moderator@aniquizz.test',
    username: 'moderator_dev',
  },
] as const;

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to ensure test auth users in production.');
    process.exit(1);
  }

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const password = process.env.TEST_ACCOUNTS_PASSWORD;

  if (!url || !serviceKey || !password) {
    console.error('Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or TEST_ACCOUNTS_PASSWORD.');
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const account of TEST_ACCOUNTS) {
    const { data: listed, error: listError } = await admin.auth.admin.listUsers();
    if (listError) throw listError;

    const existing = listed.users.find(
      (u) => u.id === account.id || u.email?.toLowerCase() === account.email,
    );

    if (existing) {
      const { error } = await admin.auth.admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
        user_metadata: { username: account.username },
      });
      if (error) throw error;
      console.log(`  updated ${account.email}`);
      continue;
    }

    const { error } = await admin.auth.admin.createUser({
      id: account.id,
      email: account.email,
      password,
      email_confirm: true,
      user_metadata: { username: account.username },
    });
    if (error) throw error;
    console.log(`  created ${account.email}`);
  }

  console.log('Test auth users ready.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
