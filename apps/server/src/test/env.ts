/** True when the live Supabase/Postgres env is available for integration tests. */
export const hasIntegrationEnv = Boolean(
  process.env.DATABASE_URL &&
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    (process.env.SUPABASE_JWT_SECRET ||
      (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY) &&
        process.env.TEST_ACCOUNTS_PASSWORD),
);
