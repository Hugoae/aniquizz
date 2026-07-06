/**
 * Seeds the deterministic bot profiles used by the DEV-only simulated players.
 *
 * Bots are plain Profile rows (no Supabase auth user) with stable `bot-*` ids so
 * match persistence has valid foreign keys. They never receive a socket.
 *
 * DEV ONLY: refuses to run when NODE_ENV=production.
 */
import { PrismaClient } from '@prisma/client';
import path from 'path';
import dotenv from 'dotenv';
import { BOT_PROFILES } from '../src/bots';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to seed bot profiles in production.');
    process.exit(1);
  }

  console.log('Seeding bot profiles...');

  for (const bot of BOT_PROFILES) {
    await prisma.profile.upsert({
      where: { id: bot.id },
      update: { username: bot.username, email: bot.email, avatar: bot.avatar },
      create: {
        id: bot.id,
        username: bot.username,
        email: bot.email,
        avatar: bot.avatar,
      },
    });
    console.log(`  upserted ${bot.username} (${bot.id})`);
  }

  console.log(`Done. ${BOT_PROFILES.length} bot profiles ready.`);
}

main()
  .catch((error) => {
    console.error('Failed to seed bot profiles:');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
