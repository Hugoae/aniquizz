/**
 * Read-only Profile vs MatchPlayer aggregate drift report.
 * Usage:
 *   pnpm --filter aniquizz-server exec ts-node scripts/report-leaderboard-consistency.ts
 *   pnpm --filter aniquizz-server exec ts-node scripts/report-leaderboard-consistency.ts --fail-on-drift
 *   pnpm --filter aniquizz-server exec ts-node scripts/report-leaderboard-consistency.ts --explain
 */
import { reportLeaderboardAggregateDrift } from '../src/modules/profile/leaderboardConsistency';
import { explainLeaderboardQuery } from '../src/modules/profile/leaderboardService';
import { prisma } from '@aniquizz/database';

const failOnDrift = process.argv.includes('--fail-on-drift');
const explain = process.argv.includes('--explain');

async function main(): Promise<void> {
  const report = await reportLeaderboardAggregateDrift();
  console.log(`Sampled ${report.sampled} profiles with match activity.`);
  console.log(`Drifted fields: ${report.drifted.length}`);
  for (const row of report.drifted.slice(0, 20)) {
    console.log(
      `  ${row.username} ${row.field}: stored=${row.stored} computed=${row.computed}`,
    );
  }
  if (report.drifted.length > 20) {
    console.log(`  … ${report.drifted.length - 20} more`);
  }

  if (explain) {
    console.log('\nEXPLAIN metric=discoveries');
    console.log(await explainLeaderboardQuery('discoveries'));
    console.log('\nEXPLAIN metric=accuracy');
    console.log(await explainLeaderboardQuery('accuracy'));
  }

  if (failOnDrift && report.drifted.length > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
