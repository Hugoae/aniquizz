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
  PORT: z.coerce.number().int().positive().default(3001),

  // Client origin(s) used for CORS. Comma-separated list allowed.
  CLIENT_URL: z.string().url().optional(),

  // Database (consumed by Prisma via @aniquizz/database).
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Supabase identity: JWT secret is required to verify Socket.io handshakes.
  SUPABASE_JWT_SECRET: z
    .string()
    .min(1, 'SUPABASE_JWT_SECRET is required to verify auth tokens'),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
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

export const env = parsed.data;
export type Env = typeof env;
