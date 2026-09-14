import { z } from 'zod';

/**
 * Boot-time validation of client environment variables (Vite `import.meta.env`).
 * Centralizes every URL/key the app depends on so a misconfiguration fails loudly
 * at startup instead of surfacing as a cryptic runtime error later.
 */
const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url('VITE_SUPABASE_URL must be a valid URL'),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, 'VITE_SUPABASE_ANON_KEY is required'),
  // Optional: falls back to localhost in dev / Render URL in prod (see serverApiBase).
  VITE_SERVER_URL: z.string().url().optional(),
  // Optional but required for media playback (Cloudflare R2 public base URL).
  VITE_R2_PUBLIC_URL: z.string().url().optional(),
  // Enable client-side error reporting outside dev (console for now).
  VITE_DEBUG_REPORTING: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(`[env] Invalid client environment configuration:\n${issues}`);
}

export const env = parsed.data;

const IS_PROD = import.meta.env.MODE === 'production';
const FALLBACK_PROD_SERVER = 'https://aniquizz-server.onrender.com';

/** Shared HTTP/socket origin for the Express API (dev localhost, prod Render). */
export const serverApiBase = (): string =>
  IS_PROD ? env.VITE_SERVER_URL || FALLBACK_PROD_SERVER : 'http://localhost:3001';
