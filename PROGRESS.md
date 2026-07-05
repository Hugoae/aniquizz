# Progress — AniQuizz Refonte

## Current phase: Phase 0 (review pending)

## Done

- [x] Refactor plan agreed (Phases 0–9)
- [x] `PLAN.md`, `PROGRESS.md`, `WORKFLOW.md` created at repo root
- [x] `old-AniQuizz/` = read-only reference · `aniquizz/` = clean active workspace
- [x] Clean monorepo scaffolded: root `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.json`
- [x] Tooling config: `.gitignore`, `.gitattributes` (LF), `.editorconfig`, `.prettierrc`, `.npmrc`, `.nvmrc` (24)
- [x] Solid bricks copied from `old-AniQuizz` (apps/client, apps/server, packages/shared, packages/database) — no `node_modules`/`dist`/`.turbo`/`.git`
- [x] `packages/shared` fully anglicized (utils, constants, types) + clean `package.json` (French kept only for user-facing labels)
- [x] Prisma unified to `6.x` (server was 5.10.2 → 6.19.2, matches database)
- [x] Prisma migration baselined under version control: `20260705000000_init` + `migration_lock.toml`
- [x] Fixed broken `description` in `packages/database/package.json`; removed stray `package-lock.json`
- [x] Pro docs: `README.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md`, `LICENSE` (MIT), `.env.example` (root + per package)
- [x] Deterministic dev seed: `packages/database/scripts/seed_test_accounts.ts` (admin/mod/2 players, prod-guarded)
- [x] Single dev entry: `pnpm dev` (turbo → client + server); `pnpm db:*` helpers
- [x] Verified: `pnpm install` OK, `pnpm build` OK (4/4 packages)
- [x] `git init` on `main`, everything staged (194 files, no secrets, no heavy data)
- [ ] GitHub repo `Hugoae/aniquizz` created (blocked — see notes)
- [ ] Phase 0 commit `phase(0): ...` + push (at your go-ahead)

## Key decisions

| Topic | Decision |
|-------|----------|
| Repo | New `aniquizz` on GitHub; old → `old-aniquizz` |
| Local folders | `old-AniQuizz/` reference · `aniquizz/` active workspace |
| Stack | Vercel (client) · Render Starter (server) · Supabase (Postgres + Auth) · R2 (media) |
| Game scope | Standard mode only (solo + multi); fixed scoring; AMQ speed mode later |
| Auth | Login required to play |
| Media | Regenerate catalogue on R2 (`r2.dev`); no Supabase Storage migration |
| Code language | English code; French UI strings isolated |
| Node / pnpm | Node 24 (installed), pnpm 9 via corepack |
| Copy strategy | Full working tree copied so it builds; dead-mode pruning stays in Phase 4 |
| Dead code | Challenger/TimeTrial/BattleRoyale kept until Phase 4 (one latent TS error fixed to compile) |
| Review ritual | Pause + checklist + verify + commit (on request) at every phase boundary |
| Chat ritual | 1 chat = 1 phase (see `WORKFLOW.md`) |

## Next step

1. **You:** unblock GitHub repo creation (pick one):
   - `gh auth login` then tell me to create + push, **or**
   - create an empty `Hugoae/aniquizz` (public, no README) on github.com, **or**
   - grant the GitHub MCP token repo-creation permission.
2. **You:** approve the Phase 0 commit message.
3. **Me:** commit `phase(0): ...`, add remote, push `main`.
4. **You:** `go Phase 1` in a **new chat**.

## Notes / blockers

- **GitHub repo creation blocked** — MCP token returns `403 Resource not accessible by personal access token`; `gh` CLI not logged in. Needs one of the options above.
- **Prisma migration not yet applied to a DB** — the initial migration is version-controlled but not run against Postgres. It will be baselined against Supabase in Phase 1 (`prisma migrate resolve --applied 20260705000000_init`), avoiding an accidental reset of existing data.
- **Client bundle ~823 kB** (single chunk) — code-splitting deferred to Phase 8 UI rework.
- **`packages/database/.env`** was copied locally (gitignored) so the pipeline keeps working; never committed.
- **Render Starter** — upgrade to be done by you before/during Phase 1 (€7/mo, no cold-start).
- **Vercel/Render** — still pointed at old repo until Phase 1 reconnect.
- **Dead modes present** — Challenger/TimeTrial/BattleRoyale still in server/client/shared; removed in Phase 4 per plan.
