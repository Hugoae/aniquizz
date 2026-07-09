/**
 * Empties the R2 media bucket WITHOUT touching the catalogue metadata
 * (Franchise/Anime/Song rows stay), unlike `reset_all` which wipes everything.
 *
 * Because the stored videos are gone afterwards, every COMPLETED song would
 * otherwise point at a dead R2 URL — so this also re-queues COMPLETED songs back
 * to PENDING. Re-run the pipeline (steps 1-4) to repopulate.
 *
 * Refuses to run when NODE_ENV=production (media loss is destructive).
 */
import { PrismaClient } from "@prisma/client";
import path from "path";
import dotenv from "dotenv";
import { createR2Client, getR2Bucket, r2EmptyBucket } from "./lib/r2-client";

dotenv.config({ path: path.join(__dirname, "../.env") });

if (process.env.NODE_ENV === "production") {
  console.error("❌ Refusing to empty the R2 bucket in production.");
  process.exit(1);
}

const prisma = new PrismaClient();
const r2Client = createR2Client();
const r2Bucket = getR2Bucket();

async function main() {
  console.log(`🌊 EMPTYING R2 BUCKET '${r2Bucket}' (catalogue metadata preserved)...`);
  const deleted = await r2EmptyBucket(r2Client, r2Bucket);
  console.log(`✅ Bucket emptied (${deleted} objects deleted).`);

  const requeued = await prisma.song.updateMany({
    where: { downloadStatus: "COMPLETED" },
    data: { downloadStatus: "PENDING", errorLog: null },
  });
  console.log(`♻️  Re-queued ${requeued.count} COMPLETED song(s) back to PENDING.`);

  console.log(`\n✨ Done. Repopulate with the pipeline, e.g.:`);
  console.log(`   ANILIST_LIMIT=30 npx ts-node scripts/1_fetch_anilist.ts`);
  console.log(`   npx ts-node scripts/2_fetch_animethemes.ts`);
  console.log(`   npx ts-node scripts/3_load_initial_data.ts`);
  console.log(`   WORKER_SOURCE_INCLUDE=animethemes.moe npx ts-node scripts/4_sync_storage.ts`);

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
