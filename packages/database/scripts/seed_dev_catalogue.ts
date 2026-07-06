/**
 * DEV-ONLY: seeds a tiny playable catalogue on Cloudflare R2.
 *
 * Picks a handful of openings (default 10, `DEV_SEED_LIMIT`) from
 * `data/data_step2.json`, downloads each from AnimeThemes, compresses to MP4,
 * uploads to R2, and inserts the matching Franchise/Anime/Song rows as
 * COMPLETED — enough to test the game loop without regenerating the full
 * catalogue. One song per anime to maximize QCM variety.
 *
 * Refuses to run when NODE_ENV=production.
 */
import { PrismaClient, DownloadStatus } from "@prisma/client";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { createR2Client, getR2Bucket, getR2PublicUrl, r2UploadFile } from "./lib/r2-client";
import { compressMp4, downloadToFile, getVideoDurationSeconds, safeUnlink } from "./lib/media";
import { buildVideoKey, normalizePipelineSong, parsePipelineDifficulty } from "./lib/song-helpers";
import { formatSongTypeLabel } from "@aniquizz/shared";

dotenv.config({ path: path.join(__dirname, "../.env") });

if (process.env.NODE_ENV === "production") {
  console.error("❌ Refusing to run the dev seed in production.");
  process.exit(1);
}

const prisma = new PrismaClient();
const r2Client = createR2Client();
const r2Bucket = getR2Bucket();

const DATA_FILE = path.join(__dirname, "../data/data_step2.json");
const TEMP_DIR = path.join(__dirname, "../data/tmp");
const LIMIT = Number(process.env.DEV_SEED_LIMIT ?? 10);
const DOWNLOAD_TIMEOUT = Number(process.env.WORKER_DOWNLOAD_TIMEOUT_MS ?? 60_000);
const COMPRESS_TIMEOUT = 120_000;

interface RawSong {
  title: string;
  artist: string;
  songType?: string;
  type?: string;
  sequence?: number;
  sourceUrl?: string;
  videoKey?: string;
  difficulty?: string;
  tags?: string[];
}

interface RawAnime {
  id: number;
  name: string;
  altNames?: string[];
  siteUrl?: string;
  coverImage?: string;
  studio?: string;
  popularity?: number;
  tags?: string[];
  format?: string;
  status?: string;
  year?: number;
  songs?: RawSong[];
}

interface RawFranchise {
  franchiseName: string;
  genres?: string[];
  animes?: RawAnime[];
}

interface Candidate {
  franchiseName: string;
  genres: string[];
  anime: RawAnime;
  song: RawSong;
  source: string;
}

function buildVideoKeyFromSong(animeName: string, animeId: number, song: RawSong): string {
  const { songType, sequence } = normalizePipelineSong(song);
  return buildVideoKey(animeName, animeId, songType, sequence);
}

function isPlayableUrl(url: string | undefined): url is string {
  return !!url && url.startsWith("http") && url.includes("animethemes.moe");
}

function collectCandidates(franchises: RawFranchise[]): Candidate[] {
  const candidates: Candidate[] = [];
  const usedAnime = new Set<number>();

  for (const franchise of franchises) {
    for (const anime of franchise.animes ?? []) {
      if (usedAnime.has(anime.id)) continue;

      for (const song of anime.songs ?? []) {
        const source = song.sourceUrl ?? song.videoKey;
        if (isPlayableUrl(source)) {
          candidates.push({
            franchiseName: franchise.franchiseName,
            genres: franchise.genres ?? [],
            anime,
            song,
            source,
          });
          usedAnime.add(anime.id);
          break;
        }
      }

      if (candidates.length >= LIMIT) return candidates;
    }
  }

  return candidates;
}

async function seedOne(candidate: Candidate): Promise<boolean> {
  const { anime, song } = candidate;
  const videoKey = buildVideoKeyFromSong(anime.name, anime.id, song);
  const rawPath = path.join(TEMP_DIR, `${videoKey}.raw`);
  const outPath = path.join(TEMP_DIR, videoKey);

  const existing = await prisma.song.findUnique({
    where: { videoKey },
    select: { downloadStatus: true, sourceUrl: true },
  });
  const alreadyOnR2 =
    existing?.downloadStatus === DownloadStatus.COMPLETED &&
    !!existing.sourceUrl?.includes("r2.dev");
  if (alreadyOnR2) {
    console.log("   ⏭️  Already on R2 — skipping.");
    return true;
  }

  try {
    const franchise = await prisma.franchise.upsert({
      where: { name: candidate.franchiseName },
      create: { name: candidate.franchiseName, genres: candidate.genres },
      update: {},
    });

    await prisma.anime.upsert({
      where: { id: anime.id },
      create: {
        id: anime.id,
        name: anime.name,
        altNames: anime.altNames ?? [],
        siteUrl: anime.siteUrl,
        coverImage: anime.coverImage,
        studio: anime.studio,
        popularity: anime.popularity ?? 0,
        tags: anime.tags ?? [],
        format: anime.format,
        status: anime.status,
        seasonYear: anime.year,
        franchiseId: franchise.id,
      },
      update: { franchiseId: franchise.id },
    });

    await downloadToFile(candidate.source, rawPath, DOWNLOAD_TIMEOUT);
    await compressMp4(rawPath, outPath, COMPRESS_TIMEOUT);
    const duration = await getVideoDurationSeconds(outPath);
    const buffer = fs.readFileSync(outPath);
    await r2UploadFile(r2Client, r2Bucket, videoKey, buffer);
    const publicUrl = getR2PublicUrl(videoKey);

    const { songType, sequence } = normalizePipelineSong(song);

    await prisma.song.upsert({
      where: { videoKey },
      create: {
        title: song.title,
        artist: song.artist,
        songType,
        sequence,
        videoKey,
        tags: song.tags ?? [],
        sourceUrl: publicUrl,
        duration,
        difficulty: parsePipelineDifficulty(song.difficulty),
        animeId: anime.id,
        downloadStatus: DownloadStatus.COMPLETED,
      },
      update: {
        sourceUrl: publicUrl,
        duration,
        downloadStatus: DownloadStatus.COMPLETED,
        errorLog: null,
      },
    });

    console.log(`   ✅ ${publicUrl}`);
    return true;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`   ❌ ${message}`);
    return false;
  } finally {
    await safeUnlink(rawPath);
    await safeUnlink(outPath);
  }
}

async function main() {
  if (!fs.existsSync(DATA_FILE)) {
    console.error(`❌ Missing ${DATA_FILE}. Run pipeline steps 1-2 first, or restore data_step2.json.`);
    process.exit(1);
  }
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

  const franchises = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as RawFranchise[];
  const candidates = collectCandidates(franchises);

  console.log(`🌱 DEV SEED — uploading ${candidates.length} opening(s) to R2 '${r2Bucket}'`);

  let ok = 0;
  for (const [index, candidate] of candidates.entries()) {
    console.log(`\n[${index + 1}/${candidates.length}] ${candidate.anime.name} — ${formatSongTypeLabel(normalizePipelineSong(candidate.song).songType, normalizePipelineSong(candidate.song).sequence)}`);
    if (await seedOne(candidate)) ok++;
  }

  console.log(`\n============================================`);
  console.log(`✨ DEV SEED DONE — ${ok}/${candidates.length} openings live on R2.`);
  console.log(`============================================\n`);

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
