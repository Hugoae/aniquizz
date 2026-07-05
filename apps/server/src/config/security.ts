import { CorsOptions } from "cors";

const ALLOWED_ORIGINS = [
  ...new Set(
    [
      process.env.CLIENT_URL,
      "https://aniquizz.vercel.app",
      ...(process.env.NODE_ENV !== "production"
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
