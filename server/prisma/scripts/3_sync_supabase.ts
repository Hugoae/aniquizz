import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import axios from "axios";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";
import dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../../.env") });

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

// --- CONFIGURATION ---
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET_NAME = "videos";

const INPUT_FILE = path.join(__dirname, "../data/data_step2.json");
const OUTPUT_FILE = path.join(__dirname, "../data/final_game_data.json");

const TEMP_DIR = path.join(__dirname, "../data/tmp");
const DEDUPE_FILE = path.join(__dirname, "../data/dedupe_map.json");

const MAX_CONCURRENCY = 3; // ⚠️ Windows: si tu as encore des locks, baisse à 2
const DOWNLOAD_TIMEOUT = 60000;

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

type Task = {
  franchiseIndex: number;
  animeIndex: number;
  songIndex: number;
  animeId: number;
  animeName: string;
  songType: string;
  sourceUrl: string;
};

function sanitizeName(s: string) {
  return s.replace(/[^a-zA-Z0-9]/g, "");
}

function loadJsonSafe(file: string): any {
  try {
    if (!fs.existsSync(file)) return {};
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return {};
  }
}

function saveJsonSafe(file: string, data: any) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function isRetryableStatus(status?: number) {
  if (!status) return false;
  return status === 429 || (status >= 500 && status < 600);
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function retry<T>(fn: () => Promise<T>, tries = 4, baseDelay = 500): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;
      const status = e?.response?.status;
      const retryable = isRetryableStatus(status) || !status;
      if (!retryable || i === tries - 1) throw e;
      const wait = baseDelay * Math.pow(2, i);
      await sleep(wait);
    }
  }
  throw lastErr;
}

// ✅ ne crash jamais si le fichier n'existe pas
function safeStatMB(p: string): string {
  try {
    const st = fs.statSync(p);
    return `${(st.size / (1024 * 1024)).toFixed(2)} MB`;
  } catch {
    return "? MB";
  }
}

// ✅ Windows: unlink peut échouer (EBUSY/EPERM). On retry et sinon on ignore.
async function safeUnlink(p: string) {
  if (!p) return;
  for (let i = 0; i < 6; i++) {
    try {
      if (fs.existsSync(p)) fs.unlinkSync(p);
      return;
    } catch (e: any) {
      const code = e?.code;
      if (code === "EBUSY" || code === "EPERM") {
        await sleep(250 * (i + 1));
        continue;
      }
      return; // autres erreurs -> on ignore
    }
  }
}

// ✅ get duration via ffprobe
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

async function listAllFilesInBucket(): Promise<Set<string>> {
  const existing = new Set<string>();
  let offset = 0;
  const limit = 100;

  while (true) {
    const { data, error } = await supabase.storage.from(BUCKET_NAME).list("", {
      limit,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const f of data) {
      if (f?.name) existing.add(f.name);
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return existing;
}

async function downloadToFile(url: string, outPath: string) {
  await retry(async () => {
    const resp = await axios.get(url, {
      responseType: "stream",
      timeout: DOWNLOAD_TIMEOUT,
      headers: { Accept: "*/*" },
      maxRedirects: 5,
    });

    await new Promise<void>((resolve, reject) => {
      const stream = fs.createWriteStream(outPath);
      resp.data.pipe(stream);
      stream.on("finish", () => resolve());
      stream.on("error", reject);
    });
  }, 4, 700);
}

async function compressMp4(inputPath: string, outputPath: string) {
  await retry(
    () =>
      new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .outputOptions([
            "-c:v libx264",
            "-preset veryfast",
            "-crf 28",
            "-c:a aac",
            "-b:a 128k",
            "-movflags +faststart",
            "-vf scale=-2:720",
          ])
          .on("end", () => resolve())
          .on("error", (err) => reject(err))
          .save(outputPath);
      }),
    3,
    800
  );
}

async function uploadFile(filePath: string, fileName: string) {
  const buffer = fs.readFileSync(filePath);

  await retry(async () => {
    const { error } = await supabase.storage.from(BUCKET_NAME).upload(fileName, buffer, {
      contentType: "video/mp4",
      upsert: false,
    });
    if (error) throw error;
  }, 4, 700);
}

function getPublicUrl(fileName: string): string {
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
  return data.publicUrl;
}

async function runWithConcurrency(
  tasks: Task[],
  workerCount: number,
  handler: (t: Task, index: number, total: number) => Promise<void>
) {
  let idx = 0;
  const total = tasks.length;

  async function worker(workerId: number) {
    while (true) {
      const current = idx++;
      if (current >= total) return;
      const task = tasks[current];
      await handler(task, current + 1, total);
    }
  }

  await Promise.all(Array.from({ length: workerCount }, (_, i) => worker(i + 1)));
}

async function main() {
  console.log("\n🟢 [ÉTAPE 3/3] SYNCHRONISATION SUPABASE (BULLETPROOF WINDOWS)");
  console.log("=====================================");

  const franchises = JSON.parse(fs.readFileSync(INPUT_FILE, "utf-8"));

  console.log("📡 Vérification Supabase...");
  const existingFiles = await listAllFilesInBucket();
  console.log(`   ${existingFiles.size} fichiers existants.`);

  const dedupeMap: Record<string, string> = loadJsonSafe(DEDUPE_FILE);

  // Build tasks
  const tasks: Task[] = [];
  const totalTasks = tasks.length;
  for (let fi = 0; fi < franchises.length; fi++) {
    const franchise = franchises[fi];
    for (let ai = 0; ai < franchise.animes.length; ai++) {
      const anime = franchise.animes[ai];
      for (let si = 0; si < (anime.songs ?? []).length; si++) {
        const song = anime.songs[si];
        const sourceUrl = song?.videoKey;

        if (!sourceUrl || typeof sourceUrl !== "string" || !sourceUrl.startsWith("http")) continue;

        tasks.push({
          franchiseIndex: fi,
          animeIndex: ai,
          songIndex: si,
          animeId: anime.id,
          animeName: anime.name,
          songType: String(song.type ?? "OP").toUpperCase(),
          sourceUrl,
        });
      }
    }
  }

  console.log(`📦 Tâches à traiter : ${tasks.length}`);
  if (tasks.length === 0) {
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(franchises, null, 2));
    console.log(`⚠️ Aucune tâche. JSON final écrit : ${OUTPUT_FILE}`);
    return;
  }

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  const handle = async (t: Task, i: number, total: number) => {
    const franchise = franchises[t.franchiseIndex];
    const anime = franchise.animes[t.animeIndex];
    const song = anime.songs[t.songIndex];

    console.log(`\n[${i}/${total}] ➡️  ${t.animeName} ${t.songType}`);
    console.log(`   🔗 source: ${t.sourceUrl}`);

    song.sourceUrl = t.sourceUrl;

    // dedupe
    const dedupedFileName = dedupeMap[t.sourceUrl];
    if (dedupedFileName) {
      song.videoKey = dedupedFileName;
      song.videoUrl = getPublicUrl(dedupedFileName);
      skipCount++;
      console.log(`   ♻️  DEDUP -> ${dedupedFileName}`);
      return;
    }

    const cleanName = sanitizeName(t.animeName);
    const fileName = `${cleanName}-${t.animeId}-${t.songType}.mp4`;

    if (existingFiles.has(fileName)) {
      dedupeMap[t.sourceUrl] = fileName;
      saveJsonSafe(DEDUPE_FILE, dedupeMap);

      song.videoKey = fileName;
      song.videoUrl = getPublicUrl(fileName);
      skipCount++;
      console.log(`   ✅ Déjà sur Supabase -> ${fileName}`);
      return;
    }

    const rawPath = path.join(TEMP_DIR, `${fileName}.raw`);
    const outPath = path.join(TEMP_DIR, fileName);

    try {
      console.log(`   ⬇️  Download...`);
      await downloadToFile(t.sourceUrl, rawPath);
      console.log(`   ✅ Download OK (${safeStatMB(rawPath)})`);

      console.log(`   🎞️  Compression ffmpeg...`);
      await compressMp4(rawPath, outPath);
      console.log(`   ✅ Compression OK (${safeStatMB(outPath)})`);

      console.log(`   ⏱️  Calcul duration (ffprobe)...`);
      const duration = await getVideoDurationSeconds(outPath);
      song.duration = duration || undefined;
      console.log(`   ✅ Duration = ${duration}s`);

      console.log(`   ☁️  Upload Supabase -> ${fileName}`);
      await uploadFile(outPath, fileName);
      console.log(`   ✅ Upload OK`);

      existingFiles.add(fileName);

      dedupeMap[t.sourceUrl] = fileName;
      saveJsonSafe(DEDUPE_FILE, dedupeMap);

      song.videoKey = fileName;
      song.videoUrl = getPublicUrl(fileName);

      successCount++;

      await safeUnlink(rawPath);
      await safeUnlink(outPath);
    } catch (e: any) {
      errorCount++;
      const status = e?.response?.status;
      const msg = e?.message ?? String(e);
      console.log(`   ❌ Erreur (status=${status ?? "?"}) : ${msg}`);

      // cleanup safe
      await safeUnlink(rawPath);
      await safeUnlink(outPath);
    }
  };

  await runWithConcurrency(tasks, MAX_CONCURRENCY, handle);

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(franchises, null, 2));

  // Nettoie temp (safe)
  try {
    if (fs.existsSync(TEMP_DIR)) fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }

    const completed = successCount + skipCount;
    const percent = totalTasks > 0
    ? ((completed / totalTasks) * 100).toFixed(1)
    : "0.0";

    console.log(`\n✨ PIPELINE TERMINÉ !`);
    console.log(`   - Total sons détectés : ${totalTasks}`);
    console.log(`   - Uploadés           : ${successCount}`);
    console.log(`   - Skippés            : ${skipCount}`);
    console.log(`   - Erreurs restantes  : ${totalTasks - completed}`);
    console.log(`   - Progression        : ${percent} %`);
    console.log(`   📄 Données finales   : ${OUTPUT_FILE}`);

}

// ✅ IMPORTANT: ne plus "crash" sur une erreur de nettoyage, etc.
main().catch((e) => {
  console.error("❌ Crash étape 3:", e?.message ?? e);
  process.exit(1);
});
