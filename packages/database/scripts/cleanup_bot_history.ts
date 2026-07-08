/**
 * Purges match history, song discovery, and friendships for all bot profiles.
 *
 * DEV ONLY: refuses to run when NODE_ENV=production.
 */
import path from 'path';
import dotenv from 'dotenv';
import { cleanupBotHistory, prisma } from '../src';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to clean bot history in production.');
    process.exit(1);
  }

  console.log('Cleaning bot gameplay history...');
  const result = await cleanupBotHistory();
  console.log(
    `Done. Removed ${result.matchPlayers} match players, ${result.roundAnswers} answers, ${result.songHistory} song history rows, ${result.friendships} friendships.`,
  );
}

main()
  .catch((error) => {
    console.error('Failed to clean bot history:');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
