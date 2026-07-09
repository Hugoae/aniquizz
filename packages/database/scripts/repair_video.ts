import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { createR2Client, getR2Bucket, getR2PublicUrl, r2UploadFile } from './lib/r2-client';
import { compressMp4, downloadToFile, getVideoDurationSeconds, safeUnlink } from './lib/media';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { execFileSync } from 'child_process';

const TEMP_DIR = path.join(__dirname, '../data/tmp');
const CACHE_FILE = path.join(__dirname, '../data/animethemes_cache.json');

interface RepairTarget {
  songId: number;
  videoKey: string;
  animeId: number;
  songType: string;
  sequence: number;
  animethemesUrl: string;
}

function loadAnimethemesUrl(animeId: number, songType: string, sequence: number): string | null {
  const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) as Record<
    string,
    {
      animethemes?: Array<{
        type: string;
        sequence: number | null;
        animethemeentries?: Array<{ videos?: Array<{ link?: string }> }>;
      }>;
    }
  >;
  const entry = cache[String(animeId)];
  if (!entry?.animethemes) return null;

  const theme = entry.animethemes.find((t) => t.type === songType && (t.sequence ?? 1) === sequence);
  const link = theme?.animethemeentries?.[0]?.videos?.[0]?.link;
  return link && link.startsWith('http') ? link : null;
}

async function decodeCheck(filePath: string): Promise<boolean> {
  try {
    execFileSync(ffmpegInstaller.path, ['-v', 'error', '-i', filePath, '-frames:v', '1', '-f', 'null', '-'], {
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

async function repairOne(target: RepairTarget): Promise<void> {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
  const rawPath = path.join(TEMP_DIR, `${target.videoKey}.raw`);
  const outPath = path.join(TEMP_DIR, target.videoKey);

  console.log(`\n🔧 ${target.videoKey}`);
  console.log(`   source: ${target.animethemesUrl}`);

  await downloadToFile(target.animethemesUrl, rawPath, 120_000);
  await safeUnlink(outPath);
  await compressMp4(rawPath, outPath, 180_000);

  const duration = await getVideoDurationSeconds(outPath);
  if (duration <= 0) throw new Error(`Invalid duration after compress: ${duration}`);

  const decodable = await decodeCheck(outPath);
  if (!decodable) throw new Error('Output fails decode check');

  const buffer = fs.readFileSync(outPath);
  const r2 = createR2Client();
  const bucket = getR2Bucket();
  await r2UploadFile(r2, bucket, target.videoKey, buffer);

  const prisma = new PrismaClient();
  await prisma.song.update({
    where: { id: target.songId },
    data: {
      duration,
      downloadStatus: 'COMPLETED',
      sourceUrl: getR2PublicUrl(target.videoKey),
      errorLog: null,
    },
  });
  await prisma.$disconnect();

  console.log(`   ✅ repaired (${duration}s)`);
  await safeUnlink(rawPath);
  await safeUnlink(outPath);
}

async function main() {
  const args = process.argv.slice(2);
  const songIds = args.length ? args.map(Number) : [9614, 9581, 9449];

  const prisma = new PrismaClient();
  const songs = await prisma.song.findMany({
    where: { id: { in: songIds } },
    select: { id: true, videoKey: true, animeId: true, songType: true, sequence: true },
  });
  await prisma.$disconnect();

  for (const song of songs) {
    const animethemesUrl = loadAnimethemesUrl(song.animeId, song.songType, song.sequence);
    if (!animethemesUrl) {
      console.warn(`⚠️  No AnimeThemes URL for song ${song.id} (${song.videoKey})`);
      continue;
    }
    await repairOne({
      songId: song.id,
      videoKey: song.videoKey,
      animeId: song.animeId,
      songType: song.songType,
      sequence: song.sequence,
      animethemesUrl,
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
