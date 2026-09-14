/**
 * Seeds the rolling 14-day Quiz du jour horizon (ready challenges with frozen snapshots).
 * Safe to re-run: existing dates are left untouched.
 */
import { ensureDailyHorizon } from '../src/modules/daily/dailyGenerator';
import { logger } from '../src/utils/logger';

async function main() {
  const results = await ensureDailyHorizon();
  logger.info(
    `Daily horizon: ${results.length} days (${results.filter((row) => row.created).length} created)`,
    'Daily',
  );
  for (const row of results) {
    logger.info(
      `  ${row.challengeDate} #${row.challengeNumber} ${row.status} warnings=${row.warnings.length}`,
      'Daily',
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
