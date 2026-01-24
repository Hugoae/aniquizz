import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import axios from "axios";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";
import dotenv from "dotenv";
import https from "https";

// --- SETUP ---
dotenv.config({ path: path.join(__dirname, "../../.env") });

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

const prisma = new PrismaClient();
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET_NAME = "videos";
// Ajuste ce chemin selon ton arborescence réelle
const TEMP_DIR = path.join(__dirname, "../data/tmp");

// ⚡ RÉGLAGES ---
const HARD_TIMEOUT = 10000; // 10 secondes MAX (Fail Fast)
const RESET_ERRORS_ON_START = true; // Retente les erreurs au lancement

const httpsAgent = new https.Agent({ keepAlive: false });
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// --- UTILS ---
async function safeUnlink(p: string) {
  try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch {}
}

async function getVideoDurationSeconds(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return resolve(0);
      const d = metadata?.format?.duration;
      if (!d || !Number.isFinite(d)) return resolve(0);
      resolve(Math.round(d));
    });
  });
}

// --- CORE DOWNLOAD ---
async function downloadToFile(url: string, outPath: string) {
  const controller = new AbortController();
  const writer = fs.createWriteStream(outPath);

  const timeoutId = setTimeout(() => {
    controller.abort();
    if (writer && !writer.destroyed) writer.destroy();
  }, HARD_TIMEOUT);

  try {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
      signal: controller.signal,
      httpsAgent: httpsAgent,
      headers: { 'Connection': 'close' }
    });

    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
      response.data.on('error', reject);
    });
  } catch (err: any) {
    if (axios.isCancel(err) || controller.signal.aborted) {
      throw new Error(`TIMEOUT (${HARD_TIMEOUT/1000}s)`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function compressMp4(inputPath: string, outputPath: string) {
  return new Promise<void>((resolve, reject) => {
    const safetyTimeout = setTimeout(() => reject(new Error("Compression Timeout")), 20000);
    
    ffmpeg(inputPath)
      .outputOptions(["-c:v libx264", "-preset veryfast", "-crf 28", "-c:a aac", "-b:a 128k", "-movflags +faststart", "-vf scale=-2:720"])
      .on("end", () => { clearTimeout(safetyTimeout); resolve(); })
      .on("error", (err) => { clearTimeout(safetyTimeout); reject(err); })
      .save(outputPath);
  });
}

async function uploadFile(filePath: string, fileName: string) {
  const buffer = fs.readFileSync(filePath);
  const { error } = await supabase.storage.from(BUCKET_NAME).upload(fileName, buffer, { contentType: "video/mp4", upsert: true });
  if (error) throw error;
}

function getPublicUrl(fileName: string): string {
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
  return data.publicUrl;
}

// --- WORKER ---
async function processNextSong() {
  // 1. Stats
  const pendingCount = await prisma.song.count({ where: { downloadStatus: 'PENDING' } });
  
  // Si fini, on retourne false pour sortir de la boucle
  if (pendingCount === 0) return false;

  const errorCount = await prisma.song.count({ where: { downloadStatus: 'ERROR' } });
  const completedCount = await prisma.song.count({ where: { downloadStatus: 'COMPLETED' } });

  // 2. Prendre une tâche
  const song = await prisma.$transaction(async (tx) => {
    const candidate = await tx.song.findFirst({
      where: { downloadStatus: 'PENDING' },
      select: { id: true, videoKey: true, sourceUrl: true }
    });

    if (!candidate) return null;

    await tx.song.update({
      where: { id: candidate.id },
      data: { downloadStatus: 'PROCESSING' }
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
    if (!song.sourceUrl) throw new Error("URL manquante");

    // Check Supabase Rapide
    const { data: list } = await supabase.storage.from(BUCKET_NAME).list('', { search: fileName });
    if (list && list.length > 0 && list.find(x => x.name === fileName)) {
        console.log(`   ☁️  Existe déjà -> SKIP DL`);
        const publicUrl = getPublicUrl(fileName);
        await prisma.song.update({
            where: { id: song.id },
            data: { downloadStatus: 'COMPLETED', sourceUrl: publicUrl }
        });
        return true;
    }

    process.stdout.write(`   ⬇️  DL... `);
    await downloadToFile(song.sourceUrl, rawPath);
    console.log(`OK`);
    
    process.stdout.write(`   🔨 Compress... `);
    await compressMp4(rawPath, outPath);
    console.log(`OK`);

    process.stdout.write(`   ⬆️  Upload... `);
    await uploadFile(outPath, fileName);
    console.log(`OK`);

    const duration = await getVideoDurationSeconds(outPath);
    const publicUrl = getPublicUrl(fileName);

    await prisma.song.update({
      where: { id: song.id },
      data: { downloadStatus: 'COMPLETED', sourceUrl: publicUrl, duration: duration, errorLog: null }
    });

  } catch (error: any) {
    const msg = error.message || "Erreur";
    console.log(`❌ ${msg}`);

    await prisma.song.update({
      where: { id: song.id },
      data: { downloadStatus: 'ERROR', errorLog: msg }
    });
  } finally {
    await safeUnlink(rawPath);
    await safeUnlink(outPath);
  }

  return true;
}

async function main() {
  console.log("👷 WORKER DATABASE (Mode: 10s Timeout)");
  
  if (RESET_ERRORS_ON_START) {
      console.log("♻️  Reset des ERREURS en PENDING...");
      const updated = await prisma.song.updateMany({
          where: { downloadStatus: 'ERROR' },
          data: { downloadStatus: 'PENDING', errorLog: null }
      });
      console.log(`   -> ${updated.count} tâches réactivées pour tentative.`);
  }

  // BOUCLE PRINCIPALE
  while (true) {
    const worked = await processNextSong();
    if (!worked) {
      break; 
    }
  }

  // --- RAPPORT FINAL AVANT DE QUITTER ---
  const finalErrors = await prisma.song.count({ where: { downloadStatus: 'ERROR' } });
  const finalSuccess = await prisma.song.count({ where: { downloadStatus: 'COMPLETED' } });
  
  console.log(`\n============================================`);
  console.log(`✨ PLUS DE TÂCHES PENDING ! FIN DU JOB.`);
  console.log(`--------------------------------------------`);
  console.log(`✅ SUCCÈS TOTAL : ${finalSuccess}`);
  console.log(`❌ ERREURS      : ${finalErrors}`);
  console.log(`============================================\n`);
  
  process.exit(0);
}

main().catch(console.error);