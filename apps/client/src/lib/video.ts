import { env } from "./env";

const R2_PUBLIC_URL = env.VITE_R2_PUBLIC_URL;

export function getVideoUrl(key: string | undefined | null): string {
  if (!key) return "";
  if (key.startsWith("http")) return key;

  if (!R2_PUBLIC_URL) {
    console.warn("VITE_R2_PUBLIC_URL is not set — video playback will fail.");
    return "";
  }

  const base = R2_PUBLIC_URL.replace(/\/$/, "");
  return `${base}/${key}`;
}
