import { CorsOptions } from "cors";
import { env } from "./env";

// CLIENT_URL may hold a comma-separated list of allowed origins.
const clientOrigins = (env.CLIENT_URL ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const IS_DEV = env.NODE_ENV !== "production";

const ALLOWED_ORIGINS = [
  ...new Set([...clientOrigins, "https://aniquizz.vercel.app"].filter(Boolean)),
] as string[];

/** Any localhost / 127.0.0.1 origin (any port) — used in dev only. */
const isLocalhostOrigin = (origin: string): boolean =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

/**
 * Origin check: the fixed whitelist always applies; in dev we additionally allow
 * any localhost port so the Vite dev server (whatever port) is never blocked.
 */
const originCheck: CorsOptions["origin"] = (origin, callback) => {
  // Non-browser clients / same-origin requests have no Origin header.
  if (!origin) return callback(null, true);
  if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
  if (IS_DEV && isLocalhostOrigin(origin)) return callback(null, true);
  return callback(new Error(`Origin not allowed by CORS: ${origin}`));
};

export const securityConfig: CorsOptions = {
  origin: originCheck,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};
