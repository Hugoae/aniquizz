# RLS & database security audit (Phase 9.2)

Complement to Phase 9.1 hardening. This document records the **current RLS posture**
after migration `20260709120000_phase9_rls_hardening` and what remains intentionally
open or deferred.

## Method

1. Reviewed every application table in `packages/database/prisma/schema.prisma`.
2. Cross-checked live Supabase advisors (`get_advisors` security) after 9.1 migration.
3. Verified the client never calls `supabase.from(...)` for privileged writes (grep audit).
4. Added integration tests for server-side moderation paths (ban/mute) in 9.2.

## Table-by-table summary

| Table | RLS | Client access | Notes |
|-------|-----|---------------|-------|
| `Profile` | ON | SELECT own row, INSERT own row | UPDATE/DELETE revoked on `anon`/`authenticated`; profile edits go through server |
| `Anime`, `Song`, `Franchise` | ON | SELECT only | INSERT/UPDATE/DELETE/TRUNCATE revoked on client roles |
| `Friendship` | ON | Deny-by-default | All friendship writes via server (Prisma service role) |
| `Match`, `MatchPlayer`, `MatchRound`, `RoundAnswer` | ON | Deny-by-default | Match history writes server-only |
| `SongHistory` | ON | SELECT own rows | Writes server-only (`20260910194500_songhistory_server_writes`) |
| `_prisma_migrations` | ON | No client policies | INFO advisor only — expected |
| Storage `avatars` | Policies on `storage.objects` | Public read, owner write | WARN: bucket listing — deferred tighten |

## Confirmed invariants (9.2 tests)

- **Ban at connect**: `socketAuthMiddleware` rejects sockets when `Profile.bannedUntil > now`.
- **Mute at chat**: `chatHandlers` drops messages when `socket.data.mutedUntil` is active.
- **Anti-cheat sync**: `toPublicPlayer` strips answer fields until reveal; verified via `get_game_state` during guessing phase.
- **Watched mode**: start aborts when no linked AniList username (no silent global fallback).

## Remaining gaps (deferred)

| Item | Risk | Plan |
|------|------|------|
| Avatars bucket public listing | Low — filenames are UUID-scoped | Tighten SELECT policy to object-level only |
| Leaked-password (HIBP) | Low — Supabase Pro+ (`password_hibp_enabled`) | Intentionally not enabled while Pro+ is unavailable; advisor WARN accepted |
| Automated RLS regression in CI | Medium | Future: SQL policy snapshot test against staging |

## Verification commands

```bash
# Unit + integration + component tests
pnpm test

# English comments in server/shared/database
node scripts/check-english-code.mjs

# Supabase security advisors (manual, via MCP or dashboard)
# get_advisors(type: security)
```

## Decision log

- **2026-07-09 (9.1)**: Enable RLS deny-by-default on server-only match/social tables; revoke catalogue writes from client roles.
- **2026-07-09 (9.2)**: Document posture; add socket integration tests for ban/mute/anti-cheat/watched abort paths.
- **2026-09-10**: Dropped `SongHistory` `"Add to history"` INSERT policy; revoked INSERT/UPDATE/DELETE/TRUNCATE on `SongHistory` and TRUNCATE on `Profile` from `anon`/`authenticated`. Client SELECT of own history remains.
- **2026-09-12 (HIBP)**: Intentionally not enabled because the project does not have Supabase Pro+. Advisor `auth_leaked_password_protection` remains WARN and is accepted; this is not an open 26.5 action.
