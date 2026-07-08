/**
 * Seeds the deterministic bot profiles used by the DEV-only simulated players.
 *
 * Bots are plain Profile shells (no Supabase auth user) with stable `bot-*` ids.
 * They never receive a socket and are excluded from XP, stats, match persistence,
 * and leaderboard queries. Rows exist only so admin/dev tooling can reference a
 * stable roster; every upsert resets their counters to zero.
 *
 * DEV ONLY: refuses to run when NODE_ENV=production.
 */
import { PrismaClient } from '@prisma/client';
import path from 'path';
import dotenv from 'dotenv';
import { BOT_PROFILES } from '../src/bots';
import { cleanupBotHistory } from '../src/botCleanup';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

const BOT_STAT_DEFAULTS = {
  xp: 0,
  level: 1,
  gamesPlayed: 0,
  gamesWon: 0,
  totalGuesses: 0,
  correctGuesses: 0,
  maxStreak: 0,
  currentWinStreak: 0,
} as const;

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to seed bot profiles in production.');
    process.exit(1);
  }

  console.log('Seeding bot profiles...');

  for (const bot of BOT_PROFILES) {
    await prisma.profile.upsert({
      where: { id: bot.id },
      update: {
        username: bot.username,
        email: bot.email,
        avatar: bot.avatar,
        ...BOT_STAT_DEFAULTS,
      },
      create: {
        id: bot.id,
        username: bot.username,
        email: bot.email,
        avatar: bot.avatar,
        ...BOT_STAT_DEFAULTS,
      },
    });
    console.log(`  upserted ${bot.username} (${bot.id})`);
  }

  console.log(`Done. ${BOT_PROFILES.length} bot profiles ready.`);

  const cleaned = await cleanupBotHistory();
  if (cleaned.matchPlayers + cleaned.roundAnswers + cleaned.songHistory + cleaned.friendships > 0) {
    console.log(
      `Cleaned bot history: ${cleaned.matchPlayers} match players, ${cleaned.roundAnswers} answers, ${cleaned.songHistory} song rows, ${cleaned.friendships} friendships.`,
    );
  }
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
