/**
 * Seeds a small set of deterministic test accounts for local development.
 *
 * These are Profile rows with fixed UUIDs so tests and manual QA can rely on
 * stable ids. Supabase Auth users are ensured via apps/server/scripts/ensureTestAuthUsers.ts.
 *
 * DEV ONLY: refuses to run when NODE_ENV=production.
 */
import { PrismaClient, UserRole } from '@prisma/client';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

interface TestAccount {
  id: string;
  username: string;
  email: string;
  role: UserRole;
}

const TEST_ACCOUNTS: TestAccount[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    username: 'admin_dev',
    email: 'admin@aniquizz.test',
    role: UserRole.ADMIN,
  },
];

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to seed test accounts in production.');
    process.exit(1);
  }

  console.log('Seeding deterministic test accounts...');

  for (const account of TEST_ACCOUNTS) {
    await prisma.profile.upsert({
      where: { id: account.id },
      update: { username: account.username, email: account.email, role: account.role },
      create: {
        id: account.id,
        username: account.username,
        email: account.email,
        role: account.role,
      },
    });
    console.log(`  upserted ${account.username} (${account.role})`);
  }

  console.log(`Done. ${TEST_ACCOUNTS.length} test accounts ready.`);
}

main()
  .catch((error) => {
    console.error('Failed to seed test accounts:');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
