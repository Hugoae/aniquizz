import 'dotenv/config';
import { z } from 'zod';

/**
 * Boot-time environment validation for the server.
 * Fails fast with a readable error instead of crashing later with an obscure
 * `undefined` deep in the request path. Import this module before anything that
 * reads `process.env`.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .optional(),
  PORT: z.coerce.number().int().positive().default(3001),

  // Client origin(s) used for CORS. Comma-separated list allowed.
  CLIENT_URL: z.string().url().optional(),

  // Database (consumed by Prisma via @aniquizz/database).
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Supabase identity: used to verify Socket.io handshakes via auth.getUser().
  SUPABASE_URL: z.string().url('SUPABASE_URL is required'),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  // Optional legacy fallback for HS256 tokens (not needed with JWT Signing Keys).
  // CI/hosting often inject unset secrets as empty strings, so coerce '' → undefined.
  SUPABASE_JWT_SECRET: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().min(1).optional(),
  ),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
  // eslint-disable-next-line no-console
  console.error(`\n[env] Invalid server environment configuration:\n${issues}\n`);
  process.exit(1);
}

const data = parsed.data;

export const env = {
  ...data,
  LOG_LEVEL:
    data.LOG_LEVEL ?? (data.NODE_ENV === 'production' ? 'info' : 'debug'),
};
export type Env = typeof env;
