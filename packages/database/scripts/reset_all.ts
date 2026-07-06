import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { createR2Client, getR2Bucket, r2EmptyBucket } from "./lib/r2-client";

dotenv.config({ path: path.join(__dirname, "../.env") });

const prisma = new PrismaClient();
const r2Client = createR2Client();
const r2Bucket = getR2Bucket();

const DATA_DIR = path.join(__dirname, "../data");
const TEMP_DIR = path.join(__dirname, "../data/tmp");

async function emptyBucket() {
  console.log(`\n🌊 EMPTYING R2 BUCKET '${r2Bucket}'...`);
  const totalDeleted = await r2EmptyBucket(r2Client, r2Bucket);
  console.log(`✅ Bucket emptied (${totalDeleted} objects deleted).`);
}

async function cleanDatabase() {
  console.log(`\n🗄️  CLEANING DATABASE...`);

  try {
    const deletedHistory = await prisma.songHistory.deleteMany({});
    console.log(`   - SongHistory deleted   : ${deletedHistory.count}`);

    const deletedLists = await prisma.playerAnimeList.deleteMany({});
    console.log(`   - PlayerAnimeLists del. : ${deletedLists.count}`);

    const deletedSongs = await prisma.song.deleteMany({});
    console.log(`   - Songs deleted         : ${deletedSongs.count}`);

    const deletedAnimes = await prisma.anime.deleteMany({});
    console.log(`   - Animes deleted        : ${deletedAnimes.count}`);

    const deletedFranchises = await prisma.franchise.deleteMany({});
    console.log(`   - Franchises deleted    : ${deletedFranchises.count}`);

    console.log("✅ Database fully cleaned.");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`❌ Database error: ${message}`);
  }
}

function cleanLocalFiles() {
  console.log(`\n📂 REMOVING LOCAL PIPELINE FILES...`);

  for (const file of ["data_step1.json", "data_step2.json"]) {
    const filePath = path.join(DATA_DIR, file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`   - Deleted: ${file}`);
    }
  }

  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    console.log("   - Temp directory cleaned.");
  }

  console.log("✅ Local files cleaned.");
}

async function main() {
  console.log(`
    🚨 WARNING: FULL RESET STARTING 🚨
    ==================================
    `);

  await emptyBucket();
  await cleanDatabase();
  cleanLocalFiles();

  console.log(`\n✨ ALL CLEAN — READY FOR A FRESH PIPELINE RUN.`);
  await prisma.$disconnect();
}

main();
