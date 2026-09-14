import fs from 'fs';
import path from 'path';
import { normalizeString } from '@aniquizz/shared';
import {
  artistNameKey,
  hasArtistCreditOverride,
  normalizeArtistNames,
  parseArtistNames,
} from './lib/parse-artist-names';

type Artist = { name?: string };
type Theme = {
  type?: string;
  sequence?: number | null;
  slug?: string;
  song?: { title?: string; artists?: Artist[] };
};
type CachedAnime = { animethemes?: Theme[] };
type ExportSong = {
  id: number;
  title: string;
  artist: string;
  artistNames: string[];
  songType: string;
  sequence: number;
  videoKey: string;
};
type ExportAnime = { id: number; name: string; songs?: ExportSong[] };
type ExportFranchise = { animes?: ExportAnime[] };
type SourceCredit = { title: string; artistNames: string[]; slug: string };

const dataDir = path.join(__dirname, '../data');
const manual = JSON.parse(
  fs.readFileSync(path.join(dataDir, 'manual_edits.json'), 'utf8'),
) as ExportFranchise[];
const cache = JSON.parse(
  fs.readFileSync(path.join(dataDir, 'animethemes_cache.json'), 'utf8'),
) as Record<string, CachedAnime | null>;

const sourceByKey = new Map<string, SourceCredit[]>();
for (const [animeId, anime] of Object.entries(cache)) {
  if (!anime) continue;
  const fallbackSequence: Record<string, number> = {};
  for (const theme of anime.animethemes ?? []) {
    const type = theme.type?.toUpperCase();
    if (!type) continue;
    const sequence =
      typeof theme.sequence === 'number' && theme.sequence > 0
        ? theme.sequence
        : (fallbackSequence[type] = (fallbackSequence[type] ?? 0) + 1);
    const artistNames = normalizeArtistNames(
      (theme.song?.artists ?? [])
        .map((artist) => artist.name ?? '')
        .filter(Boolean),
    );
    const key = `${animeId}|${type}|${sequence}`;
    const credits = sourceByKey.get(key) ?? [];
    credits.push({
      title: theme.song?.title ?? '',
      artistNames,
      slug: theme.slug ?? `${type}${sequence}`,
    });
    sourceByKey.set(key, credits);
  }
}

const songs = manual.flatMap((franchise) =>
  (franchise.animes ?? []).flatMap((anime) =>
    (anime.songs ?? []).map((song) => ({ anime, song })),
  ),
);

const errors: string[] = [];
const warnings: string[] = [];
const spellingVariants = new Map<string, Set<string>>();
const songIdentity = new Map<string, number[]>();
let comparedToSource = 0;
let sourceUnavailable = 0;

function editDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

for (const { anime, song } of songs) {
  const label = `#${song.id} ${anime.name} ${song.songType}${song.sequence}`;
  if (!Array.isArray(song.artistNames)) {
    errors.push(`${label}: artistNames is missing`);
    continue;
  }
  if (song.artistNames.some((name) => name !== name.trim() || name.length === 0)) {
    errors.push(`${label}: blank or untrimmed entry ${JSON.stringify(song.artistNames)}`);
  }

  const normalizedNames = song.artistNames.map(artistNameKey);
  if (new Set(normalizedNames).size !== normalizedNames.length) {
    errors.push(`${label}: duplicate entry ${JSON.stringify(song.artistNames)}`);
  }

  const parsed = parseArtistNames(song.artist);
  if (JSON.stringify(parsed) !== JSON.stringify(song.artistNames)) {
    errors.push(
      `${label}: display/parser mismatch ${JSON.stringify(song.artistNames)} != ${JSON.stringify(parsed)}`,
    );
  }

  for (const name of song.artistNames) {
    const key = artistNameKey(name);
    const variants = spellingVariants.get(key) ?? new Set<string>();
    variants.add(name);
    spellingVariants.set(key, variants);
  }

  const identity = `${anime.id}|${song.songType}|${song.sequence}|${normalizeString(song.title)}`;
  const duplicateIds = songIdentity.get(identity) ?? [];
  duplicateIds.push(song.id);
  songIdentity.set(identity, duplicateIds);

  const key = `${anime.id}|${song.songType}|${song.sequence}`;
  const candidates = sourceByKey.get(key) ?? [];
  const withArtists = candidates.filter((candidate) => candidate.artistNames.length > 0);
  if (!withArtists.length) {
    sourceUnavailable += 1;
    continue;
  }

  const titleKey = normalizeString(song.title);
  const source =
    withArtists.find((candidate) => normalizeString(candidate.title) === titleKey) ??
    withArtists.find(
      (candidate) =>
        JSON.stringify(candidate.artistNames) === JSON.stringify(song.artistNames),
    );
  if (!source) {
    warnings.push(
      `${label}: no unambiguous source candidate for "${song.title}" / "${song.artist}"; candidates ${JSON.stringify(withArtists)}`,
    );
    continue;
  }

  comparedToSource += 1;
  if (JSON.stringify(source.artistNames) !== JSON.stringify(song.artistNames)) {
    if (hasArtistCreditOverride(song.artist)) continue;
    const sourceNormalized = source.artistNames.map(artistNameKey);
    if (JSON.stringify(sourceNormalized) === JSON.stringify(normalizedNames)) {
      warnings.push(
        `${label}: source styling differs: AnimeThemes ${JSON.stringify(source.artistNames)}, export ${JSON.stringify(song.artistNames)}`,
      );
    } else {
      errors.push(
        `${label}: AnimeThemes ${source.slug} has ${JSON.stringify(source.artistNames)}, export has ${JSON.stringify(song.artistNames)}`,
      );
    }
  }
}

for (const [normalized, variants] of spellingVariants) {
  if (variants.size > 1 && normalized !== 'boa') {
    warnings.push(
      `Equivalent spellings for "${normalized}": ${JSON.stringify([...variants].sort())}`,
    );
  }
}

for (const [identity, ids] of songIdentity) {
  if (ids.length > 1) {
    warnings.push(`Duplicate song identity ${identity}: ids ${ids.join(', ')}`);
  }
}

const normalizedAtomicNames = [...spellingVariants.keys()].filter((name) => name.length >= 4);
for (let leftIndex = 0; leftIndex < normalizedAtomicNames.length; leftIndex += 1) {
  const left = normalizedAtomicNames[leftIndex];
  for (let rightIndex = leftIndex + 1; rightIndex < normalizedAtomicNames.length; rightIndex += 1) {
    const right = normalizedAtomicNames[rightIndex];
    if (left[0] !== right[0] || Math.abs(left.length - right.length) > 1) continue;
    if (editDistance(left, right) !== 1) continue;
    warnings.push(
      `Near spellings: ${JSON.stringify([...spellingVariants.get(left)!])} / ${JSON.stringify([...spellingVariants.get(right)!])}`,
    );
  }
}

console.log(
  JSON.stringify(
    {
      songs: songs.length,
      distinctDisplayCredits: new Set(songs.map(({ song }) => song.artist)).size,
      distinctAtomicNames: spellingVariants.size,
      comparedToAnimeThemes: comparedToSource,
      sourceUnavailable,
      errors: errors.length,
      warnings: warnings.length,
      errorDetails: errors,
      warningDetails: warnings,
    },
    null,
    2,
  ),
);

if (errors.length > 0) process.exit(1);
