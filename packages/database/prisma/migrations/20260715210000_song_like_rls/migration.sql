-- Song likes (v26.4): defense-in-depth RLS on a server-only table.
-- SongLike is written exclusively by the Express API (songLikeService) over the direct
-- Prisma connection. No anon/authenticated grants exist, so PostgREST cannot reach it;
-- enabling RLS without policies keeps it deny-by-default if a grant is ever added,
-- matching the Friendship/Match/RoundAnswer posture from 20260709120000_phase9_rls_hardening.

ALTER TABLE "SongLike" ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON "SongLike" FROM anon, authenticated;
