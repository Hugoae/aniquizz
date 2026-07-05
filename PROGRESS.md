# Progress — AniQuizz Refonte

## Current phase: Phase 1 ✅ complete — ready for Phase 2

## Done (Phase 1)

- [x] Pipeline storage migrated from Supabase Storage → Cloudflare R2 (`@aws-sdk/client-s3`)
- [x] Shared R2 client helper: `packages/database/scripts/lib/r2-client.ts` (HeadObject, PutObject, List/Delete)
- [x] `4_sync_storage.ts` rewritten: R2 upload, parallel workers (`p-limit`, `WORKER_CONCURRENCY`), env-driven `RESET_ERRORS_ON_START`
- [x] `reset_all.ts` rewritten: empty R2 bucket via `ListObjectsV2` + `DeleteObjects`
- [x] Pipeline clarity fix: `sourceUrl` = AnimeThemes download URL, `videoKey` = R2 object key (generated in step 3)
- [x] Zod validation on `data_step2.json` load (`pipeline-schemas.ts`)
- [x] Client: hardcoded Supabase URL removed → `VITE_R2_PUBLIC_URL` via `apps/client/src/lib/video.ts`
- [x] Server CORS: reads `CLIENT_URL` env (dev + prod), keeps `https://aniquizz.vercel.app`
- [x] Env examples updated with R2 + worker tuning vars
- [x] Removed `@supabase/supabase-js` from `@aniquizz/database` (no longer used by pipeline)
- [x] R2 env vars filled in `packages/database/.env` + `apps/client/.env`
- [x] Verified: `pnpm install` OK, `pnpm build` OK (4/4 packages)
- [x] Live DB explored via Supabase MCP; advisors reviewed
- [x] Target schema agreed and documented in `SCHEMA-TARGET.md`; `PLAN.md` updated (Phases 2/4/5)
- [x] Baseline resolved on live DB: `prisma migrate resolve --applied 20260705000000_init`
- [x] Fixed `.env` load path in pipeline scripts (`../../.env` → `../.env`)
- [x] Extracted media helpers → `scripts/lib/media.ts` (shared by worker + dev seed)
- [x] Dev seed script `seed_dev_catalogue.ts` (`seed:dev-catalogue`, `DEV_SEED_LIMIT`)
- [x] **Dev catalogue live**: 10 openings on R2; DB: 10 `COMPLETED` (all r2.dev), 1450 `PENDING`
- [x] **Deployments reconnected:**
  - Vercel: `VITE_R2_PUBLIC_URL` set; prod redeploy triggered
  - Render: build fixed and successful (monorepo root; see `render.yaml`)
- [x] `render.yaml` added — Render Blueprint with validated build/start commands

## Live DB findings (Supabase MCP)

- Game tables held **1460 `Song` rows** from the old pipeline run (not empty). `_prisma_migrations` was empty → baseline safely resolved.
- Media was dead: 1234 Supabase (deleted bucket) / 221 AnimeThemes / 5 R2. Server only serves `downloadStatus='COMPLETED'`.
- **Dev decision (user-approved):** non-R2 songs set to `PENDING` → only 10 R2 openings playable during dev. Reversible; `manual_edits.json` untouched.
- Identity **already wired**: `handle_new_user()` trigger; Prisma `Profile.id @default(uuid())` is drift → fix in Phase 2.
- RLS partially set up; advisors flag unindexed FKs, duplicate policies, etc. → Phase 2 cleanup.

## Schema decisions (full design in SCHEMA-TARGET.md)

| # | Decision |
|---|----------|
| MatchRound / RoundAnswer | **Yes** — full per-round detail |
| SongHistory | **Aggregate**; event detail in `RoundAnswer` |
| SongVote + VoteType | **Removed** (re-addable later) |
| Anime.format/status, PlayerAnimeList.status | **Keep String** |
| onDelete Song → Anime | **Cascade** |
| Match models | Replace `GameSession`/`GameParticipant` in Phase 5 |

## Key decisions (infra)

| Topic | Decision |
|-------|----------|
| Repo | `Hugoae/aniquizz` on GitHub; old → `old-aniquizz` |
| Stack | Vercel (client) · Render Starter (server) · Supabase · R2 (media) |
| Media | Dev: 10 openings on R2; full regen deferred |
| Render build | Root = repo root; `pnpm --filter aniquizz-server... build`; start `node apps/server/dist/index.js` |
| Pipeline worker | 3 concurrent workers; `RESET_ERRORS_ON_START=true`; timeout 60s |

## Deferred (post–Phase 1)

- **Full catalogue regeneration** (`pipeline:build`): 1450 songs `PENDING`; ~1229 need AnimeThemes relink from `animethemes_cache.json` before worker can fetch them.
- **Grow dev set:** bump `DEV_SEED_LIMIT` and re-run `seed:dev-catalogue` (idempotent).

## Next step

Phase 2 — Security & identity (JWT on Socket.io; `Profile.id` alignment; RLS cleanup; login required to play).

## Notes

- **`manual_edits.json` still authoritative** — `isLocked` preserves curated metadata on regeneration.
- **Render MCP skipped** — dashboard used; build validated manually.
- **Vercel MCP** reads projects/deployments but cannot write env vars (dashboard used).
- **Dead modes** — removed in Phase 4. **Client bundle ~823 kB** — code-splitting in Phase 8.
