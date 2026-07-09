/**
 * Pipeline lock loader — safety net for step 1 (AniList fetch).
 *
 * Priority:
 * 1. Locked franchises from data/manual_edits.json (when present)
 * 2. Fallback: locked rows from Postgres (Franchise.isLocked)
 *
 * Normalizes export shapes (`name` vs `franchiseName`, `seasonYear` vs `year`).
 */
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

export type LockSource = 'file' | 'database' | 'none';

export interface PipelineLockLoadResult {
  lockedFranchises: PipelineFranchiseLock[];
  lockedAnimeIds: Set<number>;
  source: LockSource;
  warnings: string[];
}

export interface PipelineFranchiseLock {
  franchiseName: string;
  isLocked: boolean;
  genres?: string[];
  tags?: string[];
  animes: PipelineAnimeLock[];
  /** Present when loaded from DB export. */
  id?: number;
  name?: string;
}

export interface PipelineAnimeLock {
  id: number;
  name: string;
  isLocked?: boolean;
  altNames?: string[];
  tags?: string[];
  year?: number | null;
  seasonYear?: number | null;
  season?: string | null;
  episodes?: number | null;
  averageScore?: number | null;
  description?: string | null;
  format?: string | null;
  coverImage?: string | null;
  coverColor?: string | null;
  bannerImage?: string | null;
  popularity?: number;
  status?: string | null;
  siteUrl?: string | null;
  studio?: string | null;
  songs?: PipelineSongLock[];
}

export interface PipelineSongLock {
  id?: number;
  title?: string;
  artist?: string;
  isLocked?: boolean;
  [key: string]: unknown;
}

export function franchiseDisplayName(fr: { franchiseName?: string; name?: string }): string {
  const name = fr.franchiseName ?? fr.name;
  if (!name || typeof name !== 'string') {
    throw new Error('Pipeline franchise is missing franchiseName/name');
  }
  return name;
}

/** Normalize any franchise JSON (file export or step1 output) to the step1 lock shape. */
export function normalizeFranchiseLock(raw: Record<string, unknown>): PipelineFranchiseLock {
  const franchiseName = franchiseDisplayName(raw as { franchiseName?: string; name?: string });
  const animes = Array.isArray(raw.animes) ? raw.animes.map(normalizeAnimeLock) : [];

  return {
    franchiseName,
    name: franchiseName,
    isLocked: raw.isLocked === true,
    genres: Array.isArray(raw.genres) ? (raw.genres as string[]) : [],
    tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
    animes,
    id: typeof raw.id === 'number' ? raw.id : undefined,
  };
}

function normalizeAnimeLock(raw: Record<string, unknown>): PipelineAnimeLock {
  const year =
    typeof raw.year === 'number'
      ? raw.year
      : typeof raw.seasonYear === 'number'
        ? raw.seasonYear
        : null;

  const songs = Array.isArray(raw.songs)
    ? raw.songs.map((s) => (typeof s === 'object' && s ? (s as PipelineSongLock) : {}))
    : undefined;

  return {
    id: Number(raw.id),
    name: String(raw.name ?? raw.id),
    isLocked: raw.isLocked === true,
    altNames: Array.isArray(raw.altNames) ? (raw.altNames as string[]) : [],
    tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
    year,
    seasonYear: year,
    season: typeof raw.season === 'string' ? raw.season : null,
    episodes: typeof raw.episodes === 'number' ? raw.episodes : null,
    averageScore: typeof raw.averageScore === 'number' ? raw.averageScore : null,
    description: typeof raw.description === 'string' ? raw.description : null,
    format: typeof raw.format === 'string' ? raw.format : null,
    coverImage: typeof raw.coverImage === 'string' ? raw.coverImage : null,
    coverColor: typeof raw.coverColor === 'string' ? raw.coverColor : null,
    bannerImage: typeof raw.bannerImage === 'string' ? raw.bannerImage : null,
    popularity: typeof raw.popularity === 'number' ? raw.popularity : undefined,
    status: typeof raw.status === 'string' ? raw.status : null,
    siteUrl: typeof raw.siteUrl === 'string' ? raw.siteUrl : null,
    studio: typeof raw.studio === 'string' ? raw.studio : null,
    songs,
  };
}

export function extractLockedFranchises(data: unknown): PipelineFranchiseLock[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter((row) => row && typeof row === 'object' && (row as { isLocked?: boolean }).isLocked === true)
    .map((row) => normalizeFranchiseLock(row as Record<string, unknown>));
}

export function collectLockedAnimeIds(franchises: PipelineFranchiseLock[]): Set<number> {
  const ids = new Set<number>();
  for (const franchise of franchises) {
    for (const anime of franchise.animes ?? []) {
      if (Number.isFinite(anime.id)) ids.add(anime.id);
    }
  }
  return ids;
}

function readLocksFromFile(filePath: string): PipelineFranchiseLock[] {
  if (!fs.existsSync(filePath)) return [];
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return extractLockedFranchises(parsed);
}

async function countDbLockedRows(prisma: PrismaClient): Promise<{
  franchises: number;
  animes: number;
  songs: number;
}> {
  const [franchises, animes, songs] = await Promise.all([
    prisma.franchise.count({ where: { isLocked: true } }),
    prisma.anime.count({ where: { isLocked: true } }),
    prisma.song.count({ where: { isLocked: true } }),
  ]);
  return { franchises, animes, songs };
}

async function readLocksFromDatabase(prisma: PrismaClient): Promise<PipelineFranchiseLock[]> {
  const rows = await prisma.franchise.findMany({
    where: { isLocked: true },
    include: {
      animes: {
        orderBy: { seasonYear: 'asc' },
        include: {
          songs: {
            orderBy: [{ songType: 'asc' }, { sequence: 'asc' }],
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return rows.map((fr) =>
    normalizeFranchiseLock({
      id: fr.id,
      name: fr.name,
      franchiseName: fr.name,
      isLocked: fr.isLocked,
      genres: fr.genres,
      animes: fr.animes.map((a) => ({
        id: a.id,
        name: a.name,
        isLocked: a.isLocked,
        altNames: a.altNames,
        tags: a.tags,
        seasonYear: a.seasonYear,
        season: a.season,
        episodes: a.episodes,
        averageScore: a.averageScore,
        description: a.description,
        format: a.format,
        coverImage: a.coverImage,
        coverColor: a.coverColor,
        bannerImage: a.bannerImage,
        popularity: a.popularity,
        status: a.status,
        siteUrl: a.siteUrl,
        studio: a.studio,
        songs: a.songs,
      })),
    }),
  );
}

export interface LoadPipelineLocksOptions {
  manualEditsPath: string;
  prisma?: PrismaClient;
}

/**
 * Load locked franchises for step 1. Prefers manual_edits.json; falls back to DB.
 */
export async function loadPipelineLocks(
  options: LoadPipelineLocksOptions,
): Promise<PipelineLockLoadResult> {
  const warnings: string[] = [];
  const filePath = options.manualEditsPath;
  const fileHasPath = fs.existsSync(filePath);

  let fileLocks: PipelineFranchiseLock[] = [];
  if (fileHasPath) {
    try {
      fileLocks = readLocksFromFile(filePath);
    } catch {
      warnings.push(`Could not parse lock file: ${filePath}`);
    }
  }

  let dbLocks: PipelineFranchiseLock[] = [];
  let dbCounts = { franchises: 0, animes: 0, songs: 0 };
  const prisma = options.prisma ?? new PrismaClient();
  const ownsPrisma = !options.prisma;

  try {
    dbCounts = await countDbLockedRows(prisma);
    if (dbCounts.franchises > 0) {
      dbLocks = await readLocksFromDatabase(prisma);
    }
  } catch (err) {
    warnings.push(
      `Database lock fallback unavailable (${err instanceof Error ? err.message : String(err)}).`,
    );
  } finally {
    if (ownsPrisma) await prisma.$disconnect();
  }

  if (fileLocks.length > 0) {
    if (dbCounts.franchises > fileLocks.length) {
      warnings.push(
        `Database has ${dbCounts.franchises} locked franchise(s) but manual_edits.json only has ${fileLocks.length}. Re-run export_db_to_json.ts to refresh manual edits.`,
      );
    }
    return {
      lockedFranchises: fileLocks,
      lockedAnimeIds: collectLockedAnimeIds(fileLocks),
      source: 'file',
      warnings,
    };
  }

  if (dbLocks.length > 0) {
    if (!fileHasPath) {
      warnings.push(
        'manual_edits.json missing — loaded locked franchises from the database (safety net). Run export_db_to_json.ts to persist edits to disk.',
      );
    } else {
      warnings.push(
        'manual_edits.json has no locked franchises but the database does — using database locks. Re-export to sync the file.',
      );
    }
    return {
      lockedFranchises: dbLocks,
      lockedAnimeIds: collectLockedAnimeIds(dbLocks),
      source: 'database',
      warnings,
    };
  }

  if (!fileHasPath) {
    warnings.push(
      'No manual_edits.json on disk — step 1 will only preserve franchises explicitly marked isLocked in the database.',
    );
  } else {
    warnings.push('manual_edits.json present but contains no locked franchises.');
  }

  return {
    lockedFranchises: [],
    lockedAnimeIds: new Set(),
    source: 'none',
    warnings,
  };
}

/** Default path to manual_edits.json relative to scripts/. */
export function defaultManualEditsPath(scriptsDir: string): string {
  return path.join(scriptsDir, '../data/manual_edits.json');
}
