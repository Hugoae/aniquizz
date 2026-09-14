// Pure daily song pick: injectable RNG, documented relaxation order, no I/O.

import {
  DAILY_RELAXATION_STEPS,
  DAILY_ROUND_COUNT,
  type DailyRelaxationStep,
} from '@aniquizz/shared';

export interface Rng {
  next(): number;
}

export interface DailySongCandidate {
  songId: number;
  animeId: number;
  franchiseKey: string;
  franchiseId: number | null;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  songType: 'OP' | 'ED';
  popularity: number;
}

export type DailyPopularityBand = 'high' | 'mid' | 'low';

export interface DailySlotPlan {
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  songType: 'OP' | 'ED';
  popularity: DailyPopularityBand;
}

export interface DailySelectionResult {
  songs: DailySongCandidate[];
  appliedRelaxation: DailyRelaxationStep[];
  slots: DailySlotPlan[];
}

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return {
    next() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

export function shuffleWith<T>(items: T[], rng: Rng): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function dailyTypeMix(challengeNumber: number): { OP: number; ED: number } {
  return challengeNumber % 2 === 1 ? { OP: 3, ED: 2 } : { OP: 2, ED: 3 };
}

export function franchiseKeyFor(franchiseId: number | null, animeId: number): string {
  return franchiseId != null ? `f:${franchiseId}` : `a:${animeId}`;
}

export function pickDailyClipStart(
  totalDuration: number | null,
  guessSeconds: number,
  revealSeconds: number,
  rng: Rng,
): number {
  const total = totalDuration ?? 0;
  // Same tail as Standard random starts: guess + reveal + 2s so the clip never hits EOF.
  const maxStart = total - (guessSeconds + revealSeconds + 2);
  return maxStart > 1 ? Math.floor(rng.next() * maxStart) : 0;
}

export function buildDailySlotPlan(challengeNumber: number, rng: Rng): DailySlotPlan[] {
  const mix = dailyTypeMix(challengeNumber);
  const types: Array<'OP' | 'ED'> = [
    ...Array.from({ length: mix.OP }, () => 'OP' as const),
    ...Array.from({ length: mix.ED }, () => 'ED' as const),
  ];
  const diffs: Array<'EASY' | 'MEDIUM' | 'HARD'> = ['EASY', 'EASY', 'MEDIUM', 'MEDIUM', 'HARD'];
  const pops: DailyPopularityBand[] = ['high', 'high', 'mid', 'mid', 'low'];
  const shuffledTypes = shuffleWith(types, rng);
  const shuffledDiffs = shuffleWith(diffs, rng);
  const shuffledPops = shuffleWith(pops, rng);
  return shuffledTypes.map((songType, index) => ({
    difficulty: shuffledDiffs[index],
    songType,
    popularity: shuffledPops[index],
  }));
}

const sortedPopularities = (pool: DailySongCandidate[]): number[] =>
  [...pool].map((song) => song.popularity).sort((a, b) => a - b);

export function popularityBand(value: number, sorted: number[]): DailyPopularityBand {
  if (sorted.length < 3) return 'mid';
  const lowCut = sorted[Math.floor(sorted.length / 3)] ?? 0;
  const highCut = sorted[Math.floor((sorted.length * 2) / 3)] ?? 0;
  if (value >= highCut) return 'high';
  if (value < lowCut) return 'low';
  return 'mid';
}

interface RelaxFlags {
  dropDiscovery: boolean;
  dropPopularity: boolean;
  dropFranchiseLookback: boolean;
  dropSongLookback: boolean;
  allowDuplicateFranchise: boolean;
  relaxDifficulty: boolean;
  relaxType: boolean;
}

const flagsFor = (applied: DailyRelaxationStep[]): RelaxFlags => ({
  dropDiscovery: applied.includes('drop_discovery_bucket'),
  dropPopularity: applied.includes('drop_popularity_buckets'),
  dropFranchiseLookback: applied.includes('drop_franchise_lookback'),
  dropSongLookback: applied.includes('drop_song_lookback'),
  allowDuplicateFranchise: applied.includes('allow_duplicate_franchise'),
  relaxDifficulty: applied.includes('relax_difficulty_mix'),
  relaxType: applied.includes('relax_type_mix'),
});

const filterPool = (
  pool: DailySongCandidate[],
  recentSongIds: Set<number>,
  recentFranchiseKeys: Set<string>,
  flags: RelaxFlags,
): DailySongCandidate[] =>
  pool.filter((song) => {
    if (!flags.dropSongLookback && recentSongIds.has(song.songId)) return false;
    if (!flags.dropFranchiseLookback && recentFranchiseKeys.has(song.franchiseKey)) return false;
    return song.songType === 'OP' || song.songType === 'ED';
  });

const scoreMatch = (
  song: DailySongCandidate,
  slot: DailySlotPlan,
  band: DailyPopularityBand,
  flags: RelaxFlags,
): number => {
  let score = 0;
  if (song.difficulty === slot.difficulty) score += 8;
  else if (flags.relaxDifficulty) score += 1;
  else return -1;
  if (song.songType === slot.songType) score += 4;
  else if (flags.relaxType) score += 1;
  else return -1;
  if (flags.dropPopularity) score += 1;
  else if (band === slot.popularity) score += 2;
  else if (flags.dropDiscovery && slot.popularity === 'low') score += 1;
  else return -1;
  return score;
};

const pickForSlot = (
  slot: DailySlotPlan,
  remaining: DailySongCandidate[],
  usedFranchises: Set<string>,
  sorted: number[],
  flags: RelaxFlags,
  rng: Rng,
): DailySongCandidate | null => {
  const eligible = remaining.filter((song) => {
    if (!flags.allowDuplicateFranchise && usedFranchises.has(song.franchiseKey)) return false;
    const band = popularityBand(song.popularity, sorted);
    return scoreMatch(song, slot, band, flags) >= 0;
  });
  if (!eligible.length) return null;
  const ranked = eligible
    .map((song) => ({
      song,
      score: scoreMatch(song, slot, popularityBand(song.popularity, sorted), flags),
    }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0]?.score ?? -1;
  const top = ranked.filter((row) => row.score === best).map((row) => row.song);
  return shuffleWith(top, rng)[0] ?? null;
};

const tryFill = (
  pool: DailySongCandidate[],
  slots: DailySlotPlan[],
  flags: RelaxFlags,
  rng: Rng,
): DailySongCandidate[] | null => {
  const sorted = sortedPopularities(pool);
  const remaining = [...pool];
  const usedFranchises = new Set<string>();
  const picked: DailySongCandidate[] = [];
  for (const slot of slots) {
    const song = pickForSlot(slot, remaining, usedFranchises, sorted, flags, rng);
    if (!song) return null;
    picked.push(song);
    usedFranchises.add(song.franchiseKey);
    const index = remaining.findIndex((row) => row.songId === song.songId);
    if (index >= 0) remaining.splice(index, 1);
  }
  return picked.length === DAILY_ROUND_COUNT ? picked : null;
};

export function toDailySongCandidate(row: {
  id: number;
  difficulty: DailySongCandidate['difficulty'];
  songType: string;
  anime: { id: number; franchiseId: number | null; popularity: number };
}): DailySongCandidate {
  return {
    songId: row.id,
    animeId: row.anime.id,
    franchiseId: row.anime.franchiseId,
    franchiseKey: franchiseKeyFor(row.anime.franchiseId, row.anime.id),
    difficulty: row.difficulty,
    songType: row.songType === 'ED' ? 'ED' : 'OP',
    popularity: row.anime.popularity,
  };
}

/** Equal chance per franchise, then equal chance per OP/ED inside that franchise. */
const pickUniformByFranchise = (
  songs: DailySongCandidate[],
  rng: Rng,
): DailySongCandidate | null => {
  if (!songs.length) return null;
  const groups = new Map<string, DailySongCandidate[]>();
  for (const song of songs) {
    const list = groups.get(song.franchiseKey) ?? [];
    list.push(song);
    groups.set(song.franchiseKey, list);
  }
  const franchiseKey = shuffleWith([...groups.keys()], rng)[0];
  if (!franchiseKey) return null;
  const group = groups.get(franchiseKey) ?? [];
  const types = [...new Set(group.map((row) => row.songType))];
  const songType = shuffleWith(types, rng)[0];
  const ofType = songType ? group.filter((row) => row.songType === songType) : group;
  return shuffleWith(ofType, rng)[0] ?? null;
};

/**
 * Admin "Tirer au hasard": uniform among franchises (not songs), no OP lock,
 * prefer mid/low AniList popularity so the first catalogue hits are not always
 * the same mainstream openings.
 */
export function pickDailyReplacement(input: {
  pool: DailySongCandidate[];
  rng: Rng;
  excludeSongIds: Set<number>;
  excludeFranchiseKeys: Set<string>;
  recentSongIds: Set<number>;
  recentFranchiseKeys: Set<string>;
}): DailySongCandidate | null {
  const unused = input.pool.filter((song) => !input.excludeSongIds.has(song.songId));
  const sorted = sortedPopularities(input.pool);
  const unusedFr = (row: DailySongCandidate) => !input.excludeFranchiseKeys.has(row.franchiseKey);
  const notRecentSong = (row: DailySongCandidate) => !input.recentSongIds.has(row.songId);
  const notRecentFr = (row: DailySongCandidate) => !input.recentFranchiseKeys.has(row.franchiseKey);
  const notHigh = (row: DailySongCandidate) => popularityBand(row.popularity, sorted) !== 'high';

  const tiers = [
    unused.filter((row) => unusedFr(row) && notRecentSong(row) && notRecentFr(row) && notHigh(row)),
    unused.filter((row) => unusedFr(row) && notRecentSong(row) && notRecentFr(row)),
    unused.filter((row) => unusedFr(row) && notHigh(row)),
    unused.filter((row) => unusedFr(row)),
    unused,
  ];
  for (const eligible of tiers) {
    const picked = pickUniformByFranchise(eligible, input.rng);
    if (picked) return picked;
  }
  return null;
}

export function selectDailySongs(input: {
  pool: DailySongCandidate[];
  rng: Rng;
  challengeNumber: number;
  recentSongIds: Set<number>;
  recentFranchiseKeys: Set<string>;
}): DailySelectionResult {
  const slots = buildDailySlotPlan(input.challengeNumber, input.rng);
  const applied: DailyRelaxationStep[] = [];

  for (let step = 0; step <= DAILY_RELAXATION_STEPS.length; step += 1) {
    const flags = flagsFor(applied);
    const filtered = filterPool(input.pool, input.recentSongIds, input.recentFranchiseKeys, flags);
    const songs = tryFill(filtered, slots, flags, input.rng);
    if (songs) return { songs, appliedRelaxation: applied, slots };
    const next = DAILY_RELAXATION_STEPS[step];
    if (!next) break;
    applied.push(next);
  }

  throw new Error('Daily generator: not enough playable songs after relaxation.');
}
