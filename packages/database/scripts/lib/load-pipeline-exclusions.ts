/**
 * Permanent blocklist for pipeline steps 1–3 (anime + song level).
 */
import fs from 'fs';
import path from 'path';

const DEFAULT_FILENAME = 'pipeline_exclusions.json';

export interface PipelineExclusionsFile {
  animeIds?: unknown;
  songIds?: unknown;
  videoKeys?: unknown;
  /** Optional human notes keyed by id/key — ignored by the loader. */
  _comments?: Record<string, string>;
}

export interface PipelineExclusions {
  animeIds: Set<number>;
  songIds: Set<number>;
  videoKeys: Set<string>;
}

export const emptyPipelineExclusions = (): PipelineExclusions => ({
  animeIds: new Set(),
  songIds: new Set(),
  videoKeys: new Set(),
});

export function defaultExclusionsPath(dataDir: string): string {
  return path.join(dataDir, DEFAULT_FILENAME);
}

export function parseExclusionIds(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))];
}

export function parseExclusionVideoKeys(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((k) => String(k).trim()).filter(Boolean))];
}

export function parsePipelineExclusionsFile(raw: unknown): PipelineExclusions {
  if (!raw || typeof raw !== 'object') return emptyPipelineExclusions();
  const file = raw as PipelineExclusionsFile;
  return {
    animeIds: new Set(parseExclusionIds(file.animeIds)),
    songIds: new Set(parseExclusionIds(file.songIds)),
    videoKeys: new Set(parseExclusionVideoKeys(file.videoKeys)),
  };
}

export function loadAllPipelineExclusions(dataDir: string): PipelineExclusions {
  const filePath = defaultExclusionsPath(dataDir);
  if (!fs.existsSync(filePath)) return emptyPipelineExclusions();

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return parsePipelineExclusionsFile(parsed);
  } catch {
    console.warn(`⚠️  Could not parse ${filePath} — no exclusions applied.`);
    return emptyPipelineExclusions();
  }
}

/** @deprecated Use loadAllPipelineExclusions — anime ids only. */
export function loadPipelineExclusions(dataDir: string): Set<number> {
  return loadAllPipelineExclusions(dataDir).animeIds;
}

export function isSongExcluded(
  exclusions: PipelineExclusions,
  opts: { songId?: number | null; videoKey?: string | null },
): boolean {
  if (opts.songId != null && exclusions.songIds.has(opts.songId)) return true;
  if (opts.videoKey && exclusions.videoKeys.has(opts.videoKey)) return true;
  return false;
}

/** Drop excluded seasons from a franchise tree (locked export or merged output). */
export function stripExcludedFromFranchiseAnimes<T extends { id: number }>(
  animes: T[],
  excludedAnimeIds: Set<number>,
): T[] {
  if (excludedAnimeIds.size === 0) return animes;
  return animes.filter((a) => !excludedAnimeIds.has(a.id));
}

/** Remove excluded songs from manual-export / step-2 anime nodes. */
export function stripExcludedSongsFromAnime<T extends { id?: number; songs?: Array<{ id?: number; videoKey?: string }> }>(
  anime: T,
  exclusions: PipelineExclusions,
  resolveVideoKey?: (song: NonNullable<T['songs']>[number]) => string | null,
): T {
  if (!anime.songs?.length) return anime;
  const songs = anime.songs.filter((song) => {
    const key = song.videoKey ?? resolveVideoKey?.(song) ?? null;
    return !isSongExcluded(exclusions, { songId: song.id, videoKey: key });
  });
  return { ...anime, songs };
}
