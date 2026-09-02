-- HTTP rate-limit buckets are server-only: Express owns every read and mutation.

ALTER TABLE "HttpRateLimitBucket" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "HttpRateLimitBucket" FROM anon, authenticated;
