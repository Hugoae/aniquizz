import fs from "fs";
import axios from "axios";
import https from "https";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

const httpsAgent = new https.Agent({ keepAlive: false });

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

export async function downloadToFile(
  url: string,
  outPath: string,
  timeoutMs = 60_000,
): Promise<void> {
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

export async function compressMp4(
  inputPath: string,
  outputPath: string,
  timeoutMs = 60_000,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const safetyTimeout = setTimeout(() => reject(new Error("Compression Timeout")), timeoutMs);

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
