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

dotenv.config({ path: path.join(__dirname, "../.env") });

const prisma = new PrismaClient();
const r2Client = createR2Client();
const r2Bucket = getR2Bucket();
const TEMP_DIR = path.join(__dirname, "../data/tmp");

const HARD_TIMEOUT = Number(process.env.WORKER_DOWNLOAD_TIMEOUT_MS ?? 60_000);
const WORKER_CONCURRENCY = Number(process.env.WORKER_CONCURRENCY ?? 3);
const RESET_ERRORS_ON_START = process.env.RESET_ERRORS_ON_START === "true";

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

async function processNextSong(): Promise<boolean> {
  const pendingCount = await prisma.song.count({ where: { downloadStatus: "PENDING" } });
  if (pendingCount === 0) return false;

  const errorCount = await prisma.song.count({ where: { downloadStatus: "ERROR" } });
  const completedCount = await prisma.song.count({ where: { downloadStatus: "COMPLETED" } });

  const song = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const candidate = await tx.song.findFirst({
      where: { downloadStatus: "PENDING" },
      select: { id: true, videoKey: true, sourceUrl: true },
    });

    if (!candidate) return null;

    await tx.song.update({
      where: { id: candidate.id },
      data: { downloadStatus: "PROCESSING" },
    });

    return candidate;
  });

  if (!song) return false;

  const fileName = song.videoKey;
  const rawPath = path.join(TEMP_DIR, `${fileName}.raw`);
  const outPath = path.join(TEMP_DIR, fileName);

  console.log(`\n🔄 [WORKER] ${fileName}`);
  console.log(`   📊 RESTE: ${pendingCount} | FINIS: ${completedCount} | ERREURS: ${errorCount}`);

  try {
    if (!song.sourceUrl) throw new Error("Missing sourceUrl (AnimeThemes download URL)");

    if (await r2ObjectExists(r2Client, r2Bucket, fileName)) {
      console.log("   ☁️  Already in R2 -> SKIP DL");
      const publicUrl = getR2PublicUrl(fileName);
      await prisma.song.update({
        where: { id: song.id },
        data: { downloadStatus: "COMPLETED", sourceUrl: publicUrl },
      });
      return true;
    }

    process.stdout.write("   ⬇️  DL... ");
    await downloadToFile(song.sourceUrl, rawPath, HARD_TIMEOUT);
    console.log("OK");

    process.stdout.write("   🔨 Compress... ");
    await compressMp4(rawPath, outPath);
    console.log("OK");

    process.stdout.write("   ⬆️  Upload... ");
    const buffer = fs.readFileSync(outPath);
    await r2UploadFile(r2Client, r2Bucket, fileName, buffer);
    console.log("OK");

    const duration = await getVideoDurationSeconds(outPath);
    const publicUrl = getR2PublicUrl(fileName);

    await prisma.song.update({
      where: { id: song.id },
      data: {
        downloadStatus: "COMPLETED",
        sourceUrl: publicUrl,
        duration,
        errorLog: null,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.log(`❌ ${message}`);

    await prisma.song.update({
      where: { id: song.id },
      data: { downloadStatus: "ERROR", errorLog: message },
    });
  } finally {
    await safeUnlink(rawPath);
    await safeUnlink(outPath);
  }

  return true;
}

async function runWorkerPool() {
  const limit = pLimit(WORKER_CONCURRENCY);

  const workers = Array.from({ length: WORKER_CONCURRENCY }, (_, index) =>
    limit(async () => {
      while (await processNextSong()) {
        // keep draining the queue until empty
      }
      console.log(`   Worker ${index + 1} finished.`);
    }),
  );

  await Promise.all(workers);
}

async function main() {
  console.log(`👷 R2 WORKER (concurrency: ${WORKER_CONCURRENCY}, timeout: ${HARD_TIMEOUT / 1000}s)`);

  if (RESET_ERRORS_ON_START) {
    console.log("♻️  Resetting ERROR songs to PENDING...");
    const updated = await prisma.song.updateMany({
      where: { downloadStatus: "ERROR" },
      data: { downloadStatus: "PENDING", errorLog: null },
    });
    console.log(`   -> ${updated.count} songs re-queued.`);
  }

  await runWorkerPool();

  const finalErrors = await prisma.song.count({ where: { downloadStatus: "ERROR" } });
  const finalSuccess = await prisma.song.count({ where: { downloadStatus: "COMPLETED" } });

  console.log(`\n============================================`);
  console.log("✨ NO MORE PENDING TASKS — JOB DONE.");
  console.log(`--------------------------------------------`);
  console.log(`✅ TOTAL SUCCESS : ${finalSuccess}`);
  console.log(`❌ ERRORS        : ${finalErrors}`);
  console.log(`============================================\n`);

  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
