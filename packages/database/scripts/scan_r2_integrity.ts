/**
 * Full R2 bucket integrity scan — lists every object, validates playable MP4s
 * (ffprobe duration + ffmpeg decode), and cross-checks against COMPLETED songs in DB.
 *
 * Usage:
 *   pnpm --filter @aniquizz/database r2:scan
 *   pnpm --filter @aniquizz/database r2:scan -- --concurrency=5
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import pLimit from 'p-limit';
import { createR2Client, getR2Bucket } from './lib/r2-client';
import { getVideoDurationSeconds, isPlayableMp4, safeUnlink } from './lib/media';

const TEMP_DIR = path.join(__dirname, '../data/tmp');
const REPORT_PATH = path.join(__dirname, '../data/r2-integrity-report.json');

const MIN_BYTES = 1024;

type IssueKind =
  | 'ok'
  | 'corrupt'
  | 'zero_duration'
  | 'too_small'
  | 'missing_on_r2'
  | 'download_failed';

interface SongScanResult {
  songId: number;
  videoKey: string;
  status: IssueKind;
  dbDuration: number | null;
  probedDuration: number | null;
  sizeBytes: number | null;
  detail?: string;
}

interface ScanReport {
  scannedAt: string;
  bucket: string;
  r2ObjectCount: number;
  dbCompletedCount: number;
  summary: Record<IssueKind | 'orphan_r2', number>;
  issues: SongScanResult[];
  orphanR2Keys: string[];
}

async function listAllR2Keys(client: ReturnType<typeof createR2Client>, bucket: string): Promise<Map<string, number>> {
  const keys = new Map<string, number>();
  let token: string | undefined;

  do {
    const res = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1000, ContinuationToken: token }),
    );
    for (const obj of res.Contents ?? []) {
      if (obj.Key) keys.set(obj.Key, obj.Size ?? 0);
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);

  return keys;
}

async function downloadR2Object(
  client: ReturnType<typeof createR2Client>,
  bucket: string,
  key: string,
  outPath: string,
): Promise<void> {
  const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!res.Body) throw new Error('Empty R2 response body');

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const chunks: Buffer[] = [];
  for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  fs.writeFileSync(outPath, Buffer.concat(chunks));
}

function parseConcurrency(): number {
  const arg = process.argv.find((a) => a.startsWith('--concurrency='));
  const n = arg ? Number(arg.split('=')[1]) : Number(process.env.R2_SCAN_CONCURRENCY ?? 4);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 8) : 4;
}

async function scanSong(
  client: ReturnType<typeof createR2Client>,
  bucket: string,
  song: { id: number; videoKey: string; duration: number | null },
  r2Sizes: Map<string, number>,
): Promise<SongScanResult> {
  const base: SongScanResult = {
    songId: song.id,
    videoKey: song.videoKey,
    status: 'ok',
    dbDuration: song.duration,
    probedDuration: null,
    sizeBytes: r2Sizes.get(song.videoKey) ?? null,
  };

  if (!r2Sizes.has(song.videoKey)) {
    return { ...base, status: 'missing_on_r2', detail: 'COMPLETED in DB but object absent from R2' };
  }

  const size = r2Sizes.get(song.videoKey)!;
  if (size < MIN_BYTES) {
    return { ...base, status: 'too_small', sizeBytes: size, detail: `Object size ${size} B` };
  }

  const localPath = path.join(TEMP_DIR, `scan-${song.id}-${path.basename(song.videoKey)}`);
  try {
    await downloadR2Object(client, bucket, song.videoKey, localPath);
    const probedDuration = await getVideoDurationSeconds(localPath);
    base.probedDuration = probedDuration;

    if (probedDuration <= 0) {
      return { ...base, status: 'zero_duration', detail: 'ffprobe returned 0 or unreadable container' };
    }

    const playable = await isPlayableMp4(localPath);
    if (!playable) {
      return { ...base, status: 'corrupt', detail: 'ffmpeg decode check failed' };
    }

    return base;
  } catch (err) {
    return {
      ...base,
      status: 'download_failed',
      detail: err instanceof Error ? err.message : String(err),
    };
  } finally {
    await safeUnlink(localPath);
  }
}

async function main() {
  const concurrency = parseConcurrency();
  const client = createR2Client();
  const bucket = getR2Bucket();
  const prisma = new PrismaClient();

  console.log(`\n🔍 R2 integrity scan — bucket "${bucket}" (concurrency=${concurrency})\n`);

  const r2Sizes = await listAllR2Keys(client, bucket);
  console.log(`   R2 objects: ${r2Sizes.size}`);

  const completedSongs = await prisma.song.findMany({
    where: { downloadStatus: 'COMPLETED' },
    select: { id: true, videoKey: true, duration: true },
    orderBy: { id: 'asc' },
  });
  console.log(`   DB COMPLETED songs: ${completedSongs.length}\n`);

  const dbKeys = new Set(completedSongs.map((s) => s.videoKey));
  const orphanR2Keys = [...r2Sizes.keys()].filter((k) => !dbKeys.has(k)).sort();

  fs.mkdirSync(TEMP_DIR, { recursive: true });
  const limit = pLimit(concurrency);
  let done = 0;

  const results = await Promise.all(
    completedSongs.map((song) =>
      limit(async () => {
        const result = await scanSong(client, bucket, song, r2Sizes);
        done += 1;
        if (done % 25 === 0 || done === completedSongs.length) {
          process.stdout.write(`\r   Validated ${done}/${completedSongs.length} songs…`);
        }
        if (result.status !== 'ok') {
          console.log(`\n   ⚠️  [${result.status}] ${result.videoKey} (song ${result.songId})${result.detail ? ` — ${result.detail}` : ''}`);
        }
        return result;
      }),
    ),
  );
  console.log('\n');

  const summary: ScanReport['summary'] = {
    ok: 0,
    corrupt: 0,
    zero_duration: 0,
    too_small: 0,
    missing_on_r2: 0,
    download_failed: 0,
    orphan_r2: orphanR2Keys.length,
  };

  const issues: SongScanResult[] = [];
  for (const r of results) {
    summary[r.status] += 1;
    if (r.status !== 'ok') issues.push(r);
  }

  const report: ScanReport = {
    scannedAt: new Date().toISOString(),
    bucket,
    r2ObjectCount: r2Sizes.size,
    dbCompletedCount: completedSongs.length,
    summary,
    issues,
    orphanR2Keys,
  };

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  console.log('── Summary ──');
  console.log(`   OK:              ${summary.ok}`);
  console.log(`   Corrupt:         ${summary.corrupt}`);
  console.log(`   Zero duration:   ${summary.zero_duration}`);
  console.log(`   Too small:       ${summary.too_small}`);
  console.log(`   Missing on R2:   ${summary.missing_on_r2}`);
  console.log(`   Download failed: ${summary.download_failed}`);
  console.log(`   Orphan R2 keys:  ${summary.orphan_r2}`);
  console.log(`\n   Report: ${REPORT_PATH}\n`);

  await prisma.$disconnect();

  if (issues.length > 0 || orphanR2Keys.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
