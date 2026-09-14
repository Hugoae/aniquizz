import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient, type Difficulty } from '@prisma/client';
import {
  recalibrateEndingDifficulties,
  type RecalibrateEndingReport,
} from './lib/ending-difficulty';

dotenv.config({ path: path.join(__dirname, '../.env') });

const DATA_DIR = path.join(__dirname, '../data');
const INPUT_SETTING = process.env.ENDING_DIFFICULTY_FILE?.trim() || 'manual_edits.json';
const INPUT_FILE = path.isAbsolute(INPUT_SETTING)
  ? INPUT_SETTING
  : path.join(DATA_DIR, INPUT_SETTING);
const DRY_RUN = ['1', 'true', 'yes'].includes(process.env.DRY_RUN?.trim().toLowerCase() ?? '');
const APPLY_DB = ['1', 'true', 'yes'].includes(process.env.APPLY_DB?.trim().toLowerCase() ?? '');

const printReport = (report: RecalibrateEndingReport): void => {
  const byTransition = new Map<string, number>();
  const bySource = new Map<string, number>();
  for (const change of report.changed) {
    const key = `${change.from} → ${change.to}`;
    byTransition.set(key, (byTransition.get(key) ?? 0) + 1);
    bySource.set(change.source, (bySource.get(change.source) ?? 0) + 1);
  }

  console.log(`   Changed     : ${report.changed.length}`);
  console.log(`   Unchanged   : ${report.unchanged}`);
  console.log(`   No opening  : ${report.skippedNoOpening}`);
  if (byTransition.size) {
    console.log('   Transitions :');
    for (const [label, count] of [...byTransition.entries()].sort()) {
      console.log(`     ${label}: ${count}`);
    }
  }
  if (bySource.size) {
    console.log('   Sources     :');
    for (const [label, count] of [...bySource.entries()].sort()) {
      console.log(`     ${label}: ${count}`);
    }
  }

  const samples = report.changed.slice(0, 12);
  if (samples.length) {
    console.log('   Samples     :');
    for (const change of samples) {
      console.log(
        `     ${change.franchiseName} / ${change.animeName} — ${change.title}: ${change.from} → ${change.to} (${change.source})`,
      );
    }
    if (report.changed.length > samples.length) {
      console.log(`     … ${report.changed.length - samples.length} more`);
    }
  }
};

const applyDifficultyUpdates = async (
  report: RecalibrateEndingReport,
  prisma: PrismaClient,
): Promise<number> => {
  let updated = 0;
  for (const change of report.changed) {
    if (!change.songId) continue;
    await prisma.song.update({
      where: { id: change.songId },
      data: { difficulty: change.to as Difficulty },
    });
    updated += 1;
  }
  return updated;
};

const main = async (): Promise<void> => {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Missing ${INPUT_FILE}. Export the catalogue first (export_db_to_json.ts).`);
    process.exit(1);
  }

  const franchises = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  if (!Array.isArray(franchises)) {
    console.error('manual_edits.json must be an array of franchises.');
    process.exit(1);
  }

  console.log(
    DRY_RUN
      ? `Dry-run ending difficulty recale on ${franchises.length} franchise(s).`
      : `Recalibrating ending difficulties in ${INPUT_FILE}.`,
  );

  const report = recalibrateEndingDifficulties(franchises);
  printReport(report);

  if (DRY_RUN) {
    console.log('No file written (DRY_RUN=1).');
    return;
  }

  fs.writeFileSync(INPUT_FILE, JSON.stringify(franchises, null, 2));
  console.log(`Wrote ${INPUT_FILE}`);

  if (!APPLY_DB) return;

  const prisma = new PrismaClient();
  try {
    const updated = await applyDifficultyUpdates(report, prisma);
    console.log(`Updated ${updated} ending(s) in the database.`);
  } finally {
    await prisma.$disconnect();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
