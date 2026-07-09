import { PrismaClient, Prisma } from "@prisma/client";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import pLimit from "p-limit";
import {
  createR2Client,
  getR2Bucket,
  getR2PublicUrl,
  r2ObjectExists,
  r2UploadFile,
} from "./lib/r2-client";
import { compressMp4, downloadToFile, getVideoDurationSeconds, safeUnlink } from "./lib/media";
import { formatDuration, Progress, Tally } from "./lib/progress";

dotenv.config({ path: path.join(__dirname, "../.env") });

const prisma = new PrismaClient();
const r2Client = createR2Client();
const r2Bucket = getR2Bucket();
const TEMP_DIR = path.join(__dirname, "../data/tmp");

const HARD_TIMEOUT = Number(process.env.WORKER_DOWNLOAD_TIMEOUT_MS ?? 60_000);
const COMPRESS_TIMEOUT = Number(process.env.WORKER_COMPRESS_TIMEOUT_MS ?? 120_000);
const WORKER_CONCURRENCY = Number(process.env.WORKER_CONCURRENCY ?? 3);
const RESET_ERRORS_ON_START = process.env.RESET_ERRORS_ON_START === "true";
// Download retry tuning (AnimeThemes' CDN 503s on bursts — retry with backoff).
const DOWNLOAD_RETRIES = Number(process.env.WORKER_DOWNLOAD_RETRIES ?? 4);
const RETRY_BASE_MS = Number(process.env.WORKER_RETRY_BASE_MS ?? 2000);
// Optional: only process songs whose sourceUrl contains this substring. Useful to
// skip stale/dead sources (e.g. the old Supabase bucket) and only download freshly
// resolved AnimeThemes URLs — set `WORKER_SOURCE_INCLUDE=animethemes.moe`.
const SOURCE_INCLUDE = process.env.WORKER_SOURCE_INCLUDE?.trim() || null;

const pendingWhere: Prisma.SongWhereInput = {
  downloadStatus: "PENDING",
  ...(SOURCE_INCLUDE ? { sourceUrl: { contains: SOURCE_INCLUDE } } : {}),
};

// Shared run state (module-level so the worker pool + SIGINT handler can see it).
const inFlight = new Set<number>();
const tally = new Tally();
let stopping = false;
let progress: Progress | null = null;

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

/** Claim the next PENDING song (atomically flips it to PROCESSING). */
async function claimNext(): Promise<{ id: number; videoKey: string; sourceUrl: string | null } | null> {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const candidate = await tx.song.findFirst({
      where: pendingWhere,
      select: { id: true, videoKey: true, sourceUrl: true },
    });
    if (!candidate) return null;
    await tx.song.update({
      where: { id: candidate.id },
      data: { downloadStatus: "PROCESSING" },
    });
    return candidate;
  });
}

async function processNextSong(): Promise<boolean> {
  if (stopping) return false;

  const song = await claimNext();
  if (!song) return false;

  inFlight.add(song.id);

  const fileName = song.videoKey;
  const rawPath = path.join(TEMP_DIR, `${fileName}.raw`);
  const outPath = path.join(TEMP_DIR, fileName);

  try {
    if (!song.sourceUrl) throw new Error("Missing sourceUrl (AnimeThemes download URL)");

    if (await r2ObjectExists(r2Client, r2Bucket, fileName)) {
      await prisma.song.update({
        where: { id: song.id },
        data: { downloadStatus: "COMPLETED", sourceUrl: getR2PublicUrl(fileName) },
      });
      tally.add("Déjà sur R2");
      return true;
    }

    await downloadToFile(song.sourceUrl, rawPath, HARD_TIMEOUT, {
      retries: DOWNLOAD_RETRIES,
      baseDelayMs: RETRY_BASE_MS,
      onRetry: ({ attempt, status, waitMs }) => {
        tally.add("Retries download");
        if (progress) {
          progress.line(
            `⏳ retry ${attempt}/${DOWNLOAD_RETRIES}${status ? ` (${status})` : ""} in ${Math.round(waitMs / 1000)}s | ${fileName}`,
          );
        }
      },
    });
    await compressMp4(rawPath, outPath, COMPRESS_TIMEOUT);
    const buffer = fs.readFileSync(outPath);
    await r2UploadFile(r2Client, r2Bucket, fileName, buffer);
    const duration = await getVideoDurationSeconds(outPath);

    await prisma.song.update({
      where: { id: song.id },
      data: {
        downloadStatus: "COMPLETED",
        sourceUrl: getR2PublicUrl(fileName),
        duration,
        errorLog: null,
      },
    });
    tally.add("Téléchargés");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    // If we're stopping, leave the row for the SIGINT handler to re-queue.
    if (!stopping) {
      process.stdout.write(`\n   ❌ ${fileName}: ${message}\n`);
      await prisma.song.update({
        where: { id: song.id },
        data: { downloadStatus: "ERROR", errorLog: message },
      });
      tally.add("Erreurs");
    }
  } finally {
    inFlight.delete(song.id);
    await safeUnlink(rawPath);
    await safeUnlink(outPath);
    if (!stopping && progress) {
      progress.tick();
      progress.line(`↯${inFlight.size} | ${fileName}`);
    }
  }

  return true;
}

async function runWorkerPool() {
  const limit = pLimit(WORKER_CONCURRENCY);
  const workers = Array.from({ length: WORKER_CONCURRENCY }, () =>
    limit(async () => {
      while (await processNextSong()) {
        // keep draining the queue until empty (or stopping)
      }
    }),
  );
  await Promise.all(workers);
}

/** Re-queue rows stuck in PROCESSING from a previously interrupted run. */
async function reclaimStale(): Promise<void> {
  const res = await prisma.song.updateMany({
    where: { downloadStatus: "PROCESSING" },
    data: { downloadStatus: "PENDING" },
  });
  if (res.count) console.log(`♻️  Reclaimed ${res.count} stale PROCESSING song(s) -> PENDING.`);
}

/** Graceful Ctrl-C: re-queue in-flight songs, clean temp, disconnect. */
function installSignalHandler(): void {
  process.on("SIGINT", async () => {
    if (stopping) return;
    stopping = true;
    if (progress) progress.done();
    console.log(`\n⏹️  Interrupted — re-queuing ${inFlight.size} in-flight song(s)...`);
    try {
      if (inFlight.size) {
        await prisma.song.updateMany({
          where: { id: { in: [...inFlight] } },
          data: { downloadStatus: "PENDING", errorLog: null },
        });
      }
    } catch (e) {
      console.error("Failed to re-queue in-flight songs:", e);
    }
    try {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    } catch {
      // ignore
    }
    await prisma.$disconnect();
    process.exit(130);
  });
}

async function main() {
  console.log(
    `👷 R2 WORKER (concurrency: ${WORKER_CONCURRENCY}, dl timeout: ${HARD_TIMEOUT / 1000}s, ` +
      `compress timeout: ${COMPRESS_TIMEOUT / 1000}s, retries: ${DOWNLOAD_RETRIES})`,
  );
  if (SOURCE_INCLUDE) console.log(`   🎯 Source filter: sourceUrl contains "${SOURCE_INCLUDE}"`);

  installSignalHandler();
  await reclaimStale();

  if (RESET_ERRORS_ON_START) {
    const updated = await prisma.song.updateMany({
      where: { downloadStatus: "ERROR" },
      data: { downloadStatus: "PENDING", errorLog: null },
    });
    console.log(`♻️  Reset ${updated.count} ERROR song(s) -> PENDING.`);
  }

  const initialPending = await prisma.song.count({ where: pendingWhere });
  console.log(`📥 ${initialPending} song(s) to process.\n`);

  if (initialPending === 0) {
    console.log("✨ Nothing to do.");
    await prisma.$disconnect();
    process.exit(0);
  }

  progress = new Progress(initialPending);
  await runWorkerPool();
  progress.done();

  const finalSuccess = await prisma.song.count({ where: { downloadStatus: "COMPLETED" } });
  const finalErrors = await prisma.song.count({ where: { downloadStatus: "ERROR" } });

  tally.print("📊 BILAN WORKER (ce run)");
  console.log(`\n✨ JOB DONE in ${formatDuration(progress.elapsedMs)}`);
  console.log(`   ✅ COMPLETED (total DB): ${finalSuccess}`);
  console.log(`   ❌ ERROR (total DB)    : ${finalErrors}`);

  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
