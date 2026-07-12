import fs from "fs";
import axios from "axios";
import https from "https";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";
import { parseRetryAfterMs } from "./progress";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

const httpsAgent = new https.Agent({ keepAlive: false });

// AnimeThemes' video CDN rate-limits bursts with 503s; treat these (and other
// transient statuses / network errors / timeouts) as retryable.
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

export interface DownloadRetryInfo {
  attempt: number;
  status?: number;
  waitMs: number;
  error: string;
}

export interface DownloadOptions {
  /** Max retries after the first attempt (default 4). */
  retries?: number;
  /** Base backoff in ms; grows exponentially with jitter (default 2000). */
  baseDelayMs?: number;
  /** Called before each retry wait (for logging). */
  onRetry?: (info: DownloadRetryInfo) => void;
}

function classifyDownloadError(err: unknown): { retry: boolean; status?: number; headers?: unknown } {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    if (status && RETRYABLE_STATUS.has(status)) {
      return { retry: true, status, headers: err.response?.headers };
    }
    // No response = network-level failure (reset, DNS, socket hang up) -> retry.
    if (!err.response) return { retry: true };
    return { retry: false, status };
  }
  // Our own timeout marker (see attemptDownload) is transient.
  if (err instanceof Error && err.message.startsWith("TIMEOUT")) return { retry: true };
  return { retry: false };
}

async function attemptDownload(url: string, outPath: string, timeoutMs: number): Promise<void> {
  const controller = new AbortController();
  const writer = fs.createWriteStream(outPath);

  const timeoutId = setTimeout(() => {
    controller.abort();
    if (writer && !writer.destroyed) writer.destroy();
  }, timeoutMs);

  try {
    const response = await axios({
      url,
      method: "GET",
      responseType: "stream",
      signal: controller.signal,
      httpsAgent,
      headers: { Connection: "close" },
    });

    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
      response.data.on("error", reject);
    });
  } catch (err: unknown) {
    if (axios.isCancel(err) || controller.signal.aborted) {
      throw new Error(`TIMEOUT (${timeoutMs / 1000}s)`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function safeUnlink(filePath: string): Promise<void> {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // ignore cleanup errors
  }
}

export async function getVideoDurationSeconds(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err: unknown, metadata: { format?: { duration?: number } }) => {
      if (err) return resolve(0);
      const duration = metadata?.format?.duration;
      if (!duration || !Number.isFinite(duration)) return resolve(0);
      resolve(Math.round(duration));
    });
  });
}

/** True when ffprobe can read a positive duration and ffmpeg can decode at least one frame. */
export async function isPlayableMp4(filePath: string): Promise<boolean> {
  const duration = await getVideoDurationSeconds(filePath);
  if (duration <= 0) return false;

  return new Promise((resolve) => {
    ffmpeg(filePath)
      .outputOptions(['-frames:v', '1', '-f', 'null'])
      .output(process.platform === 'win32' ? 'NUL' : '/dev/null')
      .on('end', () => resolve(true))
      .on('error', () => resolve(false))
      .run();
  });
}

export async function downloadToFile(
  url: string,
  outPath: string,
  timeoutMs = 60_000,
  opts: DownloadOptions = {},
): Promise<void> {
  const retries = opts.retries ?? 4;
  const baseDelayMs = opts.baseDelayMs ?? 2000;

  for (let attempt = 0; ; attempt++) {
    try {
      await attemptDownload(url, outPath, timeoutMs);
      return;
    } catch (err: unknown) {
      const { retry, status, headers } = classifyDownloadError(err);
      // Always drop the partial file before retrying or giving up.
      await safeUnlink(outPath);

      if (!retry || attempt >= retries) throw err;

      // Exponential backoff with jitter; honor Retry-After on 429/503.
      const backoff = baseDelayMs * 2 ** attempt + Math.floor(Math.random() * 750);
      const wait =
        status === 429 || status === 503
          ? Math.max(backoff, parseRetryAfterMs(headers, backoff))
          : backoff;

      opts.onRetry?.({
        attempt: attempt + 1,
        status,
        waitMs: wait,
        error: err instanceof Error ? err.message : "Unknown error",
      });

      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
}

export async function compressMp4(
  inputPath: string,
  outputPath: string,
  timeoutMs = 60_000,
): Promise<void> {
  // VP9/Opus WebM sources (e.g. AnimeThemes) can have negative audio start_pts;
  // without a larger mux queue ffmpeg fails with "Too many packets buffered".
  const strategies: string[][] = [
    [
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "28",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      "-avoid_negative_ts",
      "make_zero",
      "-max_muxing_queue_size",
      "1024",
      "-vf",
      "scale=-2:720",
    ],
    [
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "28",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      "-avoid_negative_ts",
      "make_zero",
      "-max_muxing_queue_size",
      "1024",
    ],
  ];

  let lastError: unknown;
  for (const outputOptions of strategies) {
    await safeUnlink(outputPath);
    try {
      await runFfmpegCompress(inputPath, outputPath, outputOptions, timeoutMs);
      return;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Compression failed");
}

function runFfmpegCompress(
  inputPath: string,
  outputPath: string,
  outputOptions: string[],
  timeoutMs: number,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const safetyTimeout = setTimeout(() => reject(new Error("Compression Timeout")), timeoutMs);

    ffmpeg(inputPath)
      .outputOptions(outputOptions)
      .on("end", () => {
        clearTimeout(safetyTimeout);
        resolve();
      })
      .on("error", (err: unknown) => {
        clearTimeout(safetyTimeout);
        reject(err);
      })
      .save(outputPath);
  });
}
