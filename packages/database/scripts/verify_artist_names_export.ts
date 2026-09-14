import fs from 'fs';
import path from 'path';
import { parseArtistNames } from './lib/parse-artist-names';

type SongRow = { id?: number; artist?: string; artistNames?: string[] };
type FranchiseRow = { animes?: Array<{ songs?: SongRow[] }> };

const file = path.join(__dirname, '../data/manual_edits.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8')) as FranchiseRow[];

let songs = 0;
let missing = 0;
let collabs = 0;
let atomicKept = 0;
const mismatches: Array<{ id?: number; artist?: string; expected: string[]; got: string[] }> = [];

for (const franchise of data) {
  for (const anime of franchise.animes ?? []) {
    for (const song of anime.songs ?? []) {
      songs += 1;
      if (!Array.isArray(song.artistNames)) missing += 1;
      const expected = parseArtistNames(song.artist);
      const got = song.artistNames ?? [];
      if (JSON.stringify(got) !== JSON.stringify(expected)) {
        mismatches.push({ id: song.id, artist: song.artist, expected, got });
      }
      if (got.length > 1) collabs += 1;
      if ((song.artist ?? '').includes(',') && got.length === 1) atomicKept += 1;
    }
  }
}

console.log(
  JSON.stringify(
    {
      songs,
      missing,
      mismatchCount: mismatches.length,
      collabs,
      atomicKept,
      mismatches: mismatches.slice(0, 10),
    },
    null,
    2,
  ),
);
if (missing || mismatches.length) process.exit(1);
