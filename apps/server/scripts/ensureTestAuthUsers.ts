/**
 * Ensures Supabase Auth users exist for deterministic integration/e2e test accounts.
 * Profile rows are seeded separately (seed_test_accounts.ts); Auth user ids MUST match.
 *
 * DEV ONLY — refuses production.
 */
import path from 'path';
import dotenv from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '../.env') });

const TEST_ACCOUNTS = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'admin@aniquizz.test',
    username: 'admin_dev',
  },
] as const;

type TestAccount = (typeof TEST_ACCOUNTS)[number];

type AuthAdmin = SupabaseClient['auth']['admin'];

function isEmailAlreadyRegistered(error: { code?: string; message?: string }): boolean {
  return error.code === 'email_exists' || /already been registered/i.test(error.message ?? '');
}

function isMissingUser(error: { status?: number; code?: string; message?: string }): boolean {
  return (
    error.status === 404 ||
    error.code === 'user_not_found' ||
    /not found/i.test(error.message ?? '')
  );
}

/**
 * `listUsers()` returns 50 rows unless asked otherwise. The fixture is easy to miss
 * once the project has more accounts, and a blind create then fails with email_exists.
 */
async function findUserByEmail(admin: AuthAdmin, email: string) {
  const perPage = 200;
  let page = 1;

  for (let guard = 0; guard < 100; guard++) {
    const { data, error } = await admin.listUsers({ page, perPage });
    if (error) throw error;

    const found = data.users.find((user) => user.email?.toLowerCase() === email);
    if (found) return found;
    if (data.nextPage == null || data.users.length === 0) return undefined;
    page = data.nextPage;
  }

  throw new Error(`Stopped paging auth users while looking for ${email}.`);
}

async function updateFixture(admin: AuthAdmin, userId: string, account: TestAccount) {
  const { error } = await admin.updateUserById(userId, {
    password: process.env.TEST_ACCOUNTS_PASSWORD,
    email_confirm: true,
    user_metadata: { username: account.username },
  });
  if (error) throw error;
}

async function createFixture(admin: AuthAdmin, account: TestAccount) {
  const { error } = await admin.createUser({
    id: account.id,
    email: account.email,
    password: process.env.TEST_ACCOUNTS_PASSWORD,
    email_confirm: true,
    user_metadata: { username: account.username },
  });
  if (error) throw error;
}

async function ensureAccount(admin: AuthAdmin, account: TestAccount) {
  const byId = await admin.getUserById(account.id);
  if (byId.data.user) {
    await updateFixture(admin, account.id, account);
    console.log(`  updated ${account.email}`);
    return;
  }
  if (byId.error && !isMissingUser(byId.error)) throw byId.error;

  try {
    await createFixture(admin, account);
    console.log(`  created ${account.email}`);
    return;
  } catch (error) {
    if (!isEmailAlreadyRegistered(error as { code?: string; message?: string })) throw error;
  }

  // The email is registered under some other id. Tests sign in as this address and
  // expect the fixed profile id, so replace that auth row.
  const other = await findUserByEmail(admin, account.email);
  if (!other) {
    throw new Error(`${account.email} is already registered, but it was not found by id or email.`);
  }
  if (other.id === account.id) {
    await updateFixture(admin, account.id, account);
    console.log(`  updated ${account.email}`);
    return;
  }

  const { error: deleteError } = await admin.deleteUser(other.id);
  if (deleteError) throw deleteError;
  await createFixture(admin, account);
  console.log(`  replaced ${account.email}`);
}

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
    await ensureAccount(admin.auth.admin, account);
  }

  console.log('Test auth users ready.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
