/**
 * One-shot backfill of Song.artistNames from the verified display `artist` credit.
 * Never rewrites `artist`. Validates every row before writing. Idempotent.
 */
import { PrismaClient } from '@prisma/client';
import path from 'path';
import dotenv from 'dotenv';
import {
  hasArtistCreditOverride,
  isAtomicArtistCredit,
  isUnknownArtistCredit,
  parseArtistNames,
} from './lib/parse-artist-names';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();
const WRITE_BATCH = 100;

/** Naive-split leftovers. Only flagged when a credit was actually split. */
const FORBIDDEN_FRAGMENTS = new Set(
  [
    'and Loathing in Las Vegas',
    'Inc.',
    'Run!',
    'Girls!',
    "Ken'ichi",
    'Boku wa Kizuite shimatta',
  ].map((name) => name.toLowerCase()),
);

type Planned = {
  id: number;
  artist: string;
  artistNames: string[];
};

function planArtistNames(song: { id: number; artist: string }): { planned: Planned; error?: string } {
  const artistNames = parseArtistNames(song.artist);
  const planned = { id: song.id, artist: song.artist, artistNames };

  if (isUnknownArtistCredit(song.artist)) {
    if (artistNames.length !== 0) {
      return { planned, error: `#${song.id} unknown artist produced names: ${JSON.stringify(artistNames)}` };
    }
    return { planned };
  }

  if (isAtomicArtistCredit(song.artist)) {
    if (artistNames.length !== 1 || artistNames[0] !== song.artist) {
      return {
        planned,
        error: `#${song.id} atomic credit was split: "${song.artist}" → ${JSON.stringify(artistNames)}`,
      };
    }
    return { planned };
  }

  if (hasArtistCreditOverride(song.artist)) {
    if (artistNames.length < 2) {
      return { planned, error: `#${song.id} curated collaboration was not split: "${song.artist}"` };
    }
  } else if (song.artist.includes(',')) {
    if (artistNames.length < 2) {
      return { planned, error: `#${song.id} collaboration was not split: "${song.artist}"` };
    }
  } else if (artistNames.length !== 1 || artistNames[0] !== song.artist.trim()) {
    return {
      planned,
      error: `#${song.id} single artist changed: "${song.artist}" → ${JSON.stringify(artistNames)}`,
    };
  }

  const fragment =
    artistNames.length > 1
      ? artistNames.find((name) => FORBIDDEN_FRAGMENTS.has(name.toLowerCase()) || /^and\s/i.test(name))
      : undefined;
  if (fragment) {
    return {
      planned,
      error: `#${song.id} produced a forbidden fragment "${fragment}" from "${song.artist}"`,
    };
  }

  if (artistNames.length === 0) {
    return { planned, error: `#${song.id} non-unknown artist produced an empty list: "${song.artist}"` };
  }

  return { planned };
}

async function main() {
  const songs = await prisma.song.findMany({
    select: { id: true, artist: true },
    orderBy: { id: 'asc' },
  });

  const planned: Planned[] = [];
  const errors: string[] = [];
  let empty = 0;
  let atomic = 0;
  let split = 0;
  let single = 0;

  for (const song of songs) {
    const result = planArtistNames(song);
    planned.push(result.planned);
    if (result.error) errors.push(result.error);
    if (isUnknownArtistCredit(song.artist)) empty += 1;
    else if (isAtomicArtistCredit(song.artist)) atomic += 1;
    else if (song.artist.includes(',') || hasArtistCreditOverride(song.artist)) split += 1;
    else single += 1;
  }

  if (errors.length) {
    console.error(`❌ ${errors.length} artistNames check(s) failed — nothing written:`);
    for (const line of errors.slice(0, 50)) console.error(`   ${line}`);
    if (errors.length > 50) console.error(`   … ${errors.length - 50} more`);
    process.exit(1);
  }

  for (let offset = 0; offset < planned.length; offset += WRITE_BATCH) {
    const batch = planned.slice(offset, offset + WRITE_BATCH);
    // Raw SQL so this script can run even if `prisma generate` is locked locally.
    await prisma.$transaction(
      batch.map((song) =>
        prisma.$executeRawUnsafe(
          `UPDATE "Song" SET "artistNames" = $1::text[] WHERE id = $2`,
          song.artistNames,
          song.id,
        ),
      ),
    );
  }

  const written = await prisma.$queryRaw<Array<{ id: number; artist: string; artistNames: string[] }>>`
    SELECT id, artist, "artistNames" FROM "Song" ORDER BY id
  `;
  const mismatches = written.filter((row, index) => {
    const expected = planned[index];
    return (
      !expected ||
      row.id !== expected.id ||
      JSON.stringify(row.artistNames ?? []) !== JSON.stringify(expected.artistNames)
    );
  });
  if (mismatches.length) {
    console.error(`❌ ${mismatches.length} row(s) did not match the planned artistNames after write`);
    for (const row of mismatches.slice(0, 20)) {
      console.error(`   #${row.id} "${row.artist}" → ${JSON.stringify(row.artistNames)}`);
    }
    process.exit(1);
  }

  const collabPreview = planned
    .filter((song) => song.artistNames.length > 1)
    .reduce<Map<string, string[]>>((map, song) => {
      if (!map.has(song.artist)) map.set(song.artist, song.artistNames);
      return map;
    }, new Map());

  console.log('✅ artistNames backfill complete');
  console.log(`   songs     : ${songs.length}`);
  console.log(`   single    : ${single}`);
  console.log(`   collab    : ${split}`);
  console.log(`   atomic    : ${atomic}`);
  console.log(`   unknown   : ${empty}`);
  console.log(`   distinct collab credits: ${collabPreview.size}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
