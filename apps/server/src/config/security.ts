import { CorsOptions } from "cors";
import { env } from "./env";

// CLIENT_URL may hold a comma-separated list of allowed origins.
const clientOrigins = (env.CLIENT_URL ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS = [
  ...new Set(
    [
      ...clientOrigins,
      "https://aniquizz.vercel.app",
      ...(env.NODE_ENV !== "production"
        ? ["http://localhost:5173", "http://localhost:3000"]
        : []),
    ].filter(Boolean),
  ),
] as string[];

export const securityConfig: CorsOptions = {
  origin: ALLOWED_ORIGINS,
  methods: ["GET", "POST"],
  credentials: true,
};
