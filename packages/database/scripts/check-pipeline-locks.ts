/**
 * Print pipeline lock status without running AniList fetch.
 * Usage: pnpm --filter @aniquizz/database pipeline:check-locks
 */
import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { loadPipelineLocks, defaultManualEditsPath } from './lib/load-pipeline-locks';
import { loadAllPipelineExclusions, defaultExclusionsPath } from './lib/load-pipeline-exclusions';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const prisma = new PrismaClient();
  const manualEditsPath = defaultManualEditsPath(__dirname);

  try {
    const [franchises, animes, songs, completed] = await Promise.all([
      prisma.franchise.count(),
      prisma.anime.count(),
      prisma.song.count(),
      prisma.song.count({ where: { downloadStatus: 'COMPLETED' } }),
    ]);

    const result = await loadPipelineLocks({ manualEditsPath, prisma });
    const exclusions = loadAllPipelineExclusions(path.join(__dirname, '../data'));

    console.log('Pipeline lock check');
    console.log('====================');
    console.log(`Catalogue in DB   : ${franchises} franchise(s), ${animes} anime(s), ${songs} song(s) (${completed} playable)`);
    console.log(`manual_edits.json : ${manualEditsPath}`);
    console.log(`Lock source       : ${result.source}`);
    console.log(`Locked franchises : ${result.lockedFranchises.length}`);
    console.log(`Locked anime ids  : ${result.lockedAnimeIds.size}`);
    console.log(`Excluded anime ids  : ${exclusions.animeIds.size} (${defaultExclusionsPath(path.join(__dirname, '../data'))})`);
    console.log(`Excluded song ids   : ${exclusions.songIds.size}`);
    console.log(`Excluded videoKeys  : ${exclusions.videoKeys.size}`);

    if (exclusions.animeIds.size > 0) {
      console.log('\nPermanently excluded AniList ids (step 1 will never re-add):');
      for (const id of [...exclusions.animeIds].sort((a, b) => a - b)) {
        console.log(`  - ${id}`);
      }
    }

    if (exclusions.songIds.size > 0) {
      console.log('\nPermanently excluded song ids (steps 2–3 will never re-add):');
      for (const id of [...exclusions.songIds].sort((a, b) => a - b)) {
        console.log(`  - ${id}`);
      }
    }

    if (exclusions.videoKeys.size > 0) {
      console.log('\nPermanently excluded videoKeys (steps 2–3 will never re-add):');
      for (const key of [...exclusions.videoKeys].sort()) {
        console.log(`  - ${key}`);
      }
    }

    if (franchises > 0 && result.lockedFranchises.length === 0) {
      console.log('\nNote: your catalogue has data, but nothing is locked yet.');
      console.log('      Step 1 will not freeze existing franchises unless you set isLocked or export manual_edits.json.');
    }

    if (result.lockedFranchises.length > 0) {
      console.log('\nLocked franchise names:');
      for (const fr of result.lockedFranchises) {
        console.log(`  - ${fr.franchiseName} (${fr.animes.length} anime(s))`);
      }
    }

    if (result.warnings.length > 0) {
      console.log('\nWarnings:');
      for (const w of result.warnings) console.log(`  ⚠️  ${w}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
