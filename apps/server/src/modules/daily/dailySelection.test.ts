import { describe, expect, it } from 'vitest';
import { DAILY_RELAXATION_STEPS } from '@aniquizz/shared';
import {
  dailyTypeMix,
  franchiseKeyFor,
  mulberry32,
  pickDailyClipStart,
  pickDailyReplacement,
  selectDailySongs,
  type DailySongCandidate,
} from './dailySelection';

const song = (
  id: number,
  opts: Partial<DailySongCandidate> & Pick<DailySongCandidate, 'difficulty' | 'songType'>,
): DailySongCandidate => ({
  songId: id,
  animeId: opts.animeId ?? id,
  franchiseId: opts.franchiseId ?? id,
  franchiseKey: franchiseKeyFor(opts.franchiseId ?? id, opts.animeId ?? id),
  difficulty: opts.difficulty,
  songType: opts.songType,
  popularity: opts.popularity ?? id * 10,
});

const balancedPool = (): DailySongCandidate[] => {
  const pool: DailySongCandidate[] = [];
  const diffs = ['EASY', 'MEDIUM', 'HARD'] as const;
  const types = ['OP', 'ED'] as const;
  let id = 1;
  for (const difficulty of diffs) {
    for (const songType of types) {
      for (let n = 0; n < 8; n += 1) {
        pool.push(
          song(id, {
            difficulty,
            songType,
            popularity: difficulty === 'HARD' ? 20 + n : difficulty === 'MEDIUM' ? 200 + n : 2000 + n,
          }),
        );
        id += 1;
      }
    }
  }
  return pool;
};

describe('dailySelection', () => {
  it('is reproducible with an injected seed', () => {
    const pool = balancedPool();
    const a = selectDailySongs({
      pool,
      rng: mulberry32(42),
      challengeNumber: 7,
      recentSongIds: new Set(),
      recentFranchiseKeys: new Set(),
    });
    const b = selectDailySongs({
      pool,
      rng: mulberry32(42),
      challengeNumber: 7,
      recentSongIds: new Set(),
      recentFranchiseKeys: new Set(),
    });
    expect(a.songs.map((row) => row.songId)).toEqual(b.songs.map((row) => row.songId));
  });

  it('picks two easy, two medium, one hard with no duplicate franchise', () => {
    const result = selectDailySongs({
      pool: balancedPool(),
      rng: mulberry32(7),
      challengeNumber: 1,
      recentSongIds: new Set(),
      recentFranchiseKeys: new Set(),
    });
    const counts = { EASY: 0, MEDIUM: 0, HARD: 0 };
    const franchises = new Set<string>();
    for (const row of result.songs) {
      counts[row.difficulty] += 1;
      franchises.add(row.franchiseKey);
    }
    expect(counts).toEqual({ EASY: 2, MEDIUM: 2, HARD: 1 });
    expect(franchises.size).toBe(5);
  });

  it('alternates 3 OP + 2 ED and 2 OP + 3 ED', () => {
    expect(dailyTypeMix(1)).toEqual({ OP: 3, ED: 2 });
    expect(dailyTypeMix(2)).toEqual({ OP: 2, ED: 3 });
    const odd = selectDailySongs({
      pool: balancedPool(),
      rng: mulberry32(3),
      challengeNumber: 11,
      recentSongIds: new Set(),
      recentFranchiseKeys: new Set(),
    });
    const even = selectDailySongs({
      pool: balancedPool(),
      rng: mulberry32(3),
      challengeNumber: 12,
      recentSongIds: new Set(),
      recentFranchiseKeys: new Set(),
    });
    expect(odd.songs.filter((row) => row.songType === 'OP')).toHaveLength(3);
    expect(even.songs.filter((row) => row.songType === 'ED')).toHaveLength(3);
  });

  it('excludes recent songs and franchises until relaxation', () => {
    const pool = balancedPool();
    const blocked = new Set(pool.map((row) => row.songId));
    const result = selectDailySongs({
      pool,
      rng: mulberry32(9),
      challengeNumber: 5,
      recentSongIds: blocked,
      recentFranchiseKeys: new Set(),
    });
    expect(result.appliedRelaxation).toContain('drop_song_lookback');
    expect(result.songs).toHaveLength(5);
  });

  it('follows the documented relaxation order', () => {
    expect(DAILY_RELAXATION_STEPS[0]).toBe('drop_discovery_bucket');
    expect(DAILY_RELAXATION_STEPS[2]).toBe('drop_franchise_lookback');
  });

  it('keeps clip starts inside the remaining duration', () => {
    const rng = mulberry32(1);
    expect(pickDailyClipStart(null, 15, 5, rng)).toBe(0);
    const start = pickDailyClipStart(90, 15, 5, rng);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(start).toBeLessThan(90 - 15 - 5 - 2);
  });

  it('uses daily guess + reveal windows plus a 2s tail', () => {
    const start = pickDailyClipStart(90, 15, 15, { next: () => 0.999 });
    expect(start).toBe(57);
    expect(start).toBeLessThan(90 - 15 - 15 - 2);
  });

  it('picks a replacement uniformly instead of the first catalogue ids', () => {
    const pool: DailySongCandidate[] = [];
    for (let i = 1; i <= 40; i += 1) {
      pool.push(song(i, { difficulty: 'EASY', songType: 'OP', franchiseId: 1, animeId: 1 }));
    }
    for (let i = 41; i <= 80; i += 1) {
      pool.push(song(i, { difficulty: 'EASY', songType: 'OP', franchiseId: i, animeId: i }));
    }
    const franchises = new Set<number>();
    for (let seed = 1; seed <= 25; seed += 1) {
      const picked = pickDailyReplacement({
        pool,
        rng: mulberry32(seed * 17),
        excludeSongIds: new Set([1]),
        excludeFranchiseKeys: new Set(['f:99']),
        recentSongIds: new Set(),
        recentFranchiseKeys: new Set(),
      });
      expect(picked).not.toBeNull();
      expect(picked?.songId).not.toBe(1);
      franchises.add(picked!.franchiseId ?? 0);
    }
    expect(franchises.size).toBeGreaterThan(5);
  });

  it('avoids other rounds’ franchises when a substitute exists', () => {
    const pool = [
      song(1, { difficulty: 'EASY', songType: 'OP', franchiseId: 10, animeId: 10 }),
      song(2, { difficulty: 'EASY', songType: 'OP', franchiseId: 20, animeId: 20 }),
    ];
    const picked = pickDailyReplacement({
      pool,
      rng: mulberry32(3),
      excludeSongIds: new Set([1]),
      excludeFranchiseKeys: new Set(['f:10']),
      recentSongIds: new Set(),
      recentFranchiseKeys: new Set(),
    });
    expect(picked?.songId).toBe(2);
  });

  it('does not lock replacements to openings when endings exist', () => {
    const pool: DailySongCandidate[] = [];
    for (let i = 1; i <= 15; i += 1) {
      pool.push(song(i, { difficulty: 'EASY', songType: 'OP', franchiseId: i, animeId: i, popularity: 100 }));
    }
    for (let i = 16; i <= 30; i += 1) {
      pool.push(song(i, { difficulty: 'MEDIUM', songType: 'ED', franchiseId: i, animeId: i, popularity: 100 }));
    }
    const types = new Set<string>();
    for (let seed = 1; seed <= 24; seed += 1) {
      const picked = pickDailyReplacement({
        pool,
        rng: mulberry32(seed * 31),
        excludeSongIds: new Set(),
        excludeFranchiseKeys: new Set(),
        recentSongIds: new Set(),
        recentFranchiseKeys: new Set(),
      });
      expect(picked).not.toBeNull();
      types.add(picked!.songType);
    }
    expect(types.has('ED')).toBe(true);
    expect(types.has('OP')).toBe(true);
  });

  it('prefers mid and low popularity over mainstream hits', () => {
    const pool = [
      song(1, { difficulty: 'EASY', songType: 'OP', franchiseId: 1, animeId: 1, popularity: 50_000 }),
      song(2, { difficulty: 'EASY', songType: 'OP', franchiseId: 2, animeId: 2, popularity: 40_000 }),
      song(3, { difficulty: 'EASY', songType: 'ED', franchiseId: 3, animeId: 3, popularity: 20 }),
      song(4, { difficulty: 'MEDIUM', songType: 'ED', franchiseId: 4, animeId: 4, popularity: 30 }),
      song(5, { difficulty: 'HARD', songType: 'OP', franchiseId: 5, animeId: 5, popularity: 25 }),
    ];
    for (let seed = 1; seed <= 12; seed += 1) {
      const picked = pickDailyReplacement({
        pool,
        rng: mulberry32(seed * 11),
        excludeSongIds: new Set(),
        excludeFranchiseKeys: new Set(),
        recentSongIds: new Set(),
        recentFranchiseKeys: new Set(),
      });
      expect(picked?.popularity).toBeLessThan(1000);
    }
  });
});
