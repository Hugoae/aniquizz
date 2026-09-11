-- SongHistory writes are server-only (Prisma service role).
-- Drop the client INSERT policy and revoke mutating privileges from PostgREST roles.
-- TRUNCATE on Profile was leftover hygiene (PostgREST does not expose TRUNCATE).

DROP POLICY IF EXISTS "Add to history" ON "SongHistory";

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON "SongHistory" FROM anon, authenticated;
REVOKE TRUNCATE ON "Profile" FROM anon, authenticated;
