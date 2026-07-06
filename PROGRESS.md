# Progress — AniQuizz Refonte

## Current phase: Phase 4 ✅ complete — ready for Phase 5

## Done (Phase 4 — Code cleanup, Standard mode only)

- [x] **Removed dead game modes (server):** deleted `ChallengerGame.ts`, `TimeTrialGame.ts`; `GameManager` always instantiates `StandardGame`.
- [x] **Removed dead game modes (client):** deleted `modes/challenger/` and `modes/time-trial/`; `Game.tsx` renders `StandardGameLayout` only; simplified `GameConfigForm`, `MultiplayerLobby`, `RoomList`, `PlayerCard`, `GameOver`.
- [x] **`packages/shared` cleanup:**
  - `constants.ts`: removed `CHALLENGER`, `TIME_TRIAL`, `BATTLE_ROYALE` blocks.
  - `types.ts`: `gameType` → `'standard'` only; removed `livesCount`/`startingTime`/BattleRoyale types and mode-specific `GamePlayer` fields.
  - `utils.ts`: `getRank` now driven by `GAME_CONFIG.RANKS`; added `formatSongTypeLabel`; typed `getFuzzySuggestions` with `FuzzyAnimeCandidate`.
- [x] **Prisma schema + migration `20260706120000_phase4_schema_cleanup`** (applied on live Supabase):
  - Enums `SongType` (OP/ED/INSERT) + `Difficulty` (EASY/MEDIUM/HARD); `Song.type` split → `songType` + `sequence`.
  - Timestamps on `Song`/`Anime`/`Franchise`/`PlayerAnimeList`; `onDelete: Cascade` on `Song → Anime`.
  - Dropped `SongVote` + `VoteType`; `SongHistory` reworked to aggregate (`playCount`/`correctCount`/`lastPlayedAt`).
  - FK + hot-column indexes (advisor-confirmed); `Profile` leaderboard indexes.
  - Anglicized schema comments.
- [x] **Pipeline scripts:** `2_fetch_animethemes.ts` outputs `songType` + `sequence`; `3_load_initial_data.ts`, `seed_db.ts`, `seed_dev_catalogue.ts`, `import_edits_to_db.ts` updated; `lib/song-helpers.ts` normalizes legacy `type: "OP1"` from `data_step2.json` / `manual_edits.json`.
- [x] **`gameService.ts`:** song filters use `songType` enum; difficulty cascade uses `Difficulty` enum; `saveGameHistory` upserts aggregate `SongHistory`.
- [x] **`GameCore`:** playlist items expose `formatSongTypeLabel(songType, sequence)` for UI compatibility.
- [x] Verified: `pnpm build` OK (4/4); `prisma migrate deploy` OK on live DB.

### Phase 4 notes
- `GameSession`/`GameParticipant` kept until Phase 5 (`Match`/`MatchPlayer`/`MatchRound`/`RoundAnswer`).
- Daily/Library/Competitive placeholder pages unchanged.
- `data_step2.json` still has legacy `type` fields — scripts normalize at load time; regenerate catalogue (`pipeline:build`) when ready for fresh JSON with `songType`/`sequence`.
- Dev catalogue (10 R2 openings) survives migration via SQL type parsing (`OP1` → `songType=OP`, `sequence=1`).

## Done (Phase 3 — Observability, logs & debug)

- [x] **Migrated to pino:** `apps/server/src/utils/logger.ts` — structured JSON in prod (Render stdout), `pino-pretty` in dev. No file writes. Backward-compatible wrapper keeps existing `logger.info(msg, context, meta)` call sites. Child loggers via `logger.child({ context, userId, roomId, matchId, socketId })`.
- [x] **Redaction:** `utils/redact.ts` — `sanitizePayload()` strips passwords, tokens, JWT fields before any socket payload hits logs.
- [x] **Error taxonomy:** `utils/errors.ts` — `LobbyError`, `GameError`, `ValidationError` (+ `AppError` base) with stable `code` fields.
- [x] **Error reporter:** `utils/errorReporter.ts` — `captureError(err, context)` centralizes structured error logging (Sentry hook point for later).
- [x] **Global crash handlers:** `core/crashHandlers.ts` — `uncaughtException`, `unhandledRejection`; Socket.io `connection_error` + per-socket `error` routed through `captureError`.
- [x] **Socket instrumentation:** `core/socketInstrumentation.ts` — auto-logs every inbound event (actor `userId`, sanitized payload) + critical outbound `socket.emit` responses. Wired in `SocketManager` before handler registration.
- [x] **Lifecycle logs:** structured connect/disconnect in `SocketManager`; existing lobby/match logs in handlers unchanged (now flow through pino).
- [x] **Enriched `/health`:** `routes/health.ts` — `uptimeSeconds`, `activeRooms`, `activeMatches`, `connectedSockets`, `playersInRooms` via `GameManager.getStats()`.
- [x] **Client observability:** `ErrorBoundary` + `lib/errorReporter.ts` — React boundary, `window.error` / `unhandledrejection`, `socket connect_error`; gated by dev mode or `VITE_DEBUG_REPORTING=true`.
- [x] **Graceful shutdown:** `core/shutdown.ts` — `SIGINT`/`SIGTERM` handlers close Socket.io + HTTP server + Prisma with an 8s force-exit fallback (clean local Ctrl+C and Render restarts).
- [x] **Log noise tuning:** `summarizeSocketPayload()` collapses large blobs (anime catalogue → `count`, arrays > 5 → `{ length }`, `game_state_sync` → summary); read-only/high-volume events (`get_anime_list`, `get_rooms`, `get_game_state`, `get_my_watched`, `player_watched_ids`) forced to debug; `game_state_sync` demoted from info.
- [x] **Deps:** removed `winston` + `winston-daily-rotate-file`; added `pino` + `pino-pretty`. `LOG_LEVEL` env (optional) on server.
- [x] Verified: `pnpm build` OK (4/4), no lint errors; manual smoke test (create room → play rounds → return to lobby → Ctrl+C) with `LOG_LEVEL=info`.

### Dev environment note (Windows)
- Git Bash set as Cursor's default terminal + `~/.bashrc`/`~/.bash_profile` init `fnm` so `node`/`pnpm` resolve there.
- Root `.npmrc` sets `script-shell` to Git Bash so pnpm lifecycle scripts skip `cmd.exe` (fixes the "Terminer le programme de commandes (O/N)" Ctrl+C trap).
- Fallback if Turbo still hangs: run `pnpm dev:server` and `pnpm dev:client` in **two separate** Git Bash tabs (single process per tab → clean Ctrl+C).

## Done (Phase 2 — Security & identity)

- [x] **Boot-time env validation (zod):**
  - Server: `apps/server/src/config/env.ts` (fail-fast, typed `env`); requires `DATABASE_URL` + `SUPABASE_JWT_SECRET`. Wired into `index.ts` (imported before anything reading `process.env`) and `config/security.ts` (CORS now reads validated `CLIENT_URL`, comma-separated list supported).
  - Client: `apps/client/src/lib/env.ts` (throws on invalid config); `supabase.ts`, `socket.ts`, `video.ts` now read the validated `env` — all URLs centralized.
- [x] **Supabase JWT validation on Socket.io:** `apps/server/src/core/authMiddleware.ts` verifies `handshake.auth.token` (HS256 via `SUPABASE_JWT_SECRET`). Sets canonical `socket.data = { userId (=JWT sub), username, isAuthenticated }`. `SocketManager` registers it via `io.use(...)`; raw client `userId` is no longer trusted. Present-but-invalid token → connection rejected; no token → guest (read-only).
- [x] **Login required to play (server):** `apps/server/src/core/guards.ts` — `requireAuth()` wraps all game/lobby/chat mutation events; read-only events (`get_rooms`, `get_anime_list`, `get_game_state`, `get_my_watched`) stay open.
- [x] **Login required to play (client):** `ProtectedRoute` in `App.tsx` gates `/play` and `/game` (redirect home + open login modal). Client stops sending raw `userId` in `socket.auth` (only the token).
- [x] **Rate limiting** (per-socket, in-memory sliding window) on `game:answer` (10/5s), `chat:sendMessage` (5/3s), `lobby:create` (3/10s) via `guard()`.
- [x] **Identity schema:** removed `Profile.id @default(uuid())` (Prisma now `id String @id`). Verified live DB column already has **no default** → schema aligned with the `handle_new_user()` trigger, no DB migration needed.
- [x] **RLS cleanup** (Supabase migration `phase2_rls_cleanup`, advisor-verified):
  - Consolidated duplicate permissive `SELECT` policies on `Profile` and `SongVote`.
  - Wrapped `auth.uid()` in `(select auth.uid())` on `Profile`/`SongHistory`/`PlayerAnimeList`/`SongVote` policies (kills per-row re-eval).
  - Revoked `EXECUTE` on `handle_new_user()` from `anon`/`authenticated`/`public`.
  - Enabled RLS on `_prisma_migrations` (deny-all; Prisma bypasses as owner).
  - Advisors after: security `handle_new_user` warnings gone; performance `auth_rls_initplan` + duplicate-policy warnings gone.
- [x] **Removed dead dep:** `@tanstack/react-query` (0 usages) from client.
- [x] Verified: `pnpm build` OK (4/4), no lint errors.

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
- Identity **already wired**: `handle_new_user()` trigger; Prisma `Profile.id @default(uuid())` is drift → fixed in Phase 2.
- RLS partially set up; advisors flag unindexed FKs, duplicate policies, etc. → fixed in Phase 4 migration.

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

Phase 5 — Game engine rewrite (Standard mode): `Match`/`MatchPlayer`/`MatchRound`/`RoundAnswer`, typed socket contract, `MatchEngine` + `useGameSocket`/`useReducer`, drop `GameSession`/`GameParticipant`.

## Deferred (post–Phase 4)

- **Re-run `get_advisors`** on live Supabase after migration (SongVote RLS policies auto-dropped with table).
- **Regenerate `data_step2.json`** with native `songType`/`sequence` when running full `pipeline:build`.
- **Client bundle ~842 kB** — code-splitting in Phase 8.

## Deferred (post–Phase 3)

- **Sentry / external APM:** `captureError` / `captureClientError` are logger-only for now; wire when a project is chosen.
- **Room broadcast emit logging:** `io.to(room).emit` not auto-instrumented (handler lifecycle logs cover critical paths); revisit if needed during Phase 5 engine rewrite.
- **Socket connect churn (observed via new logs):** at boot the client connects, then `AuthContext` reconnects (`disconnect().connect()`) once the profile/session resolves → connect/disconnect/connect sequence (amplified by React `StrictMode` in dev). Benign; clean up with identity-by-`userId` + reliable reconnect in **Phase 5**.
- **Client double-subscription / double-emit (observed via new logs):** duplicate `get_home_stats` / `get_anime_list` / `game_state_sync` from double mount → also a minor race in `generalHandlers.getGlobalStats` (two calls compute before cache fills). Fix with single-subscription `useGameSocket` in **Phase 5** (+ optional in-flight guard on `getGlobalStats`).
- **AniList 403** on `getUserAnimeIds` (server blocked by AniList API): surfaced clearly now via error logs; investigate separately (not Phase 3 scope).

### Phase 2 follow-ups / deferred
- **Leaked-password protection**: still disabled — this is a Supabase **Auth** setting with no SQL/MCP toggle. Enable manually in the dashboard (Auth → Providers → Password / `password_hibp_enabled`).
- **`GameSession`/`GameParticipant`** RLS-enabled-no-policy (deny-all, harmless): tables replaced in **Phase 5**.
- **Profile email exposure**: `Profile` SELECT is public (all columns incl. `email`). RLS can't do column-level filtering; revisit with a view or column grants if needed (not in Phase 2 scope).
- Engine still keys players by `socket.id`; canonical `socket.data.userId` is now available and required — the socket.id → userId migration in the game engine lands in **Phase 5**.

## Notes

- **`manual_edits.json` still authoritative** — `isLocked` preserves curated metadata on regeneration.
- **Render MCP skipped** — dashboard used; build validated manually.
- **Vercel MCP** reads projects/deployments but cannot write env vars (dashboard used).
- **Client bundle** — dead modes removed in Phase 4; code-splitting in Phase 8.
