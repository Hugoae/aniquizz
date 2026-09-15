# AGENTS.md

Agent entry point for AniQuizz: how to explore the codebase, ship changes safely, and use available skills. For human contributor setup, see [`CONTRIBUTING.md`](./CONTRIBUTING.md).

---

## Agent skills

### Issue tracker

Issues are tracked as GitHub issues on `Hugoae/aniquizz` via the `gh` CLI. External PRs are not a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary (label string = role name): `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Multi-context layout: [`CONTEXT-MAP.md`](./CONTEXT-MAP.md) at the root points to one
per-package `CONTEXT.md` (role, business glossary, known pitfalls). Read the context
relevant to your task before scanning the package. See `docs/agents/domain.md` for how
to consume them; [`ARCHITECTURE.md`](./ARCHITECTURE.md) has the full system detail.
Full-feature audit prompt (all lenses, **French**): [`docs/agents/feature-audit.md`](./docs/agents/feature-audit.md).

---

## Architecture (quick map)

**Monorepo** (pnpm + Turborepo):

| Package             | Role                                                        |
| ------------------- | ----------------------------------------------------------- |
| `apps/client`       | React + Vite + shadcn — SPA on Vercel                       |
| `apps/server`       | Express + Socket.io + Prisma — API/realtime on Render       |
| `packages/shared`   | Framework-agnostic types, socket contracts, pure game logic |
| `packages/database` | Prisma schema, migrations, ETL pipeline (AniList → R2)      |

**Full detail** (deploy topology, security, realtime match flow): [`ARCHITECTURE.md`](./ARCHITECTURE.md).

**Key hubs** (from graphify god nodes — start here when lost):

| Symbol / file                   | Role                                                            |
| ------------------------------- | --------------------------------------------------------------- |
| `GameManager`                   | Orchestrates rooms and matches; imported by all socket handlers |
| `Room`                          | Live lobby/match state                                          |
| `MatchEngine`                   | Round-by-round game loop                                        |
| `PlaylistBuilder`               | Song draw, Watched/AniList filters, QCM choices                 |
| `TypedServer`                   | Typed Socket.io server                                          |
| `packages/shared/src/events.ts` | Single source of truth for socket event names and payloads      |

**Realtime path (server):** `SocketManager` → `TypedServer` → `Room` → `MatchEngine`.

**Realtime path (client):** `Game.tsx` → `useGameSocket` → `socket.ts` → server handlers.

---

## Graphify first (exploration)

This project has a graphify knowledge graph at `graphify-out/`. The Cursor rule [`.cursor/rules/graphify.mdc`](./.cursor/rules/graphify.mdc) applies with `alwaysApply: true`.

**Before using Read, Grep, Glob, or shell to explore the codebase**, run graphify:

```bash
graphify query "<architecture or dependency question>"
graphify path "<SymbolA>" "<SymbolB>"
graphify explain "<concept or file hub>"
```

**After modifying code files**, keep the graph current (AST-only, no API cost):

```bash
graphify update .
```

**Navigation shortcuts:**

- `graphify-out/wiki/index.md` — **agent entry point**: crawlable per-community wiki (start here; rebuild with `graphify export wiki`)
- `graphify-out/GRAPH_REPORT.md` — god nodes, communities, surprising connections
- `graphify-out/graph.html` — interactive visual graph

**Subagents:** any prompt that involves code exploration must include the graphify-first rule explicitly.

**Only skip graphify when:**

1. Graphify has already oriented you and you need specific lines to edit or debug, or
2. `graphify-out/graph.json` does not exist yet (run `graphify extract . --code-only` then `graphify cluster-only .` first).

---

## Pass CI (no surprises)

Pipeline: [`.github/workflows/ci.yml`](./.github/workflows/ci.yml)

| Step                     | Command              |
| ------------------------ | -------------------- |
| English code check       | `pnpm check:english` |
| Format                   | `pnpm format:check`  |
| Lint                     | `pnpm lint`          |
| Prisma client            | `pnpm db:generate`   |
| Typecheck                | `pnpm typecheck`     |
| Build                    | `pnpm build`         |
| Unit + integration tests | `pnpm test`          |
| E2E (PR only)            | `pnpm test:e2e`      |

**Pre-flight before marking a task done** (run what your change touches):

```bash
pnpm check:english
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
pnpm test
# Or scoped, e.g.:
# pnpm --filter @aniquizz/shared test
# pnpm --filter aniquizz-server test
```

**Avoid runtime crashes after `packages/shared` changes:** the server resolves the package from `packages/shared/dist/`, not `src/`. `pnpm dev` / `pnpm dev:server` run `tsc --watch` on shared and nodemon restarts when `dist/` changes. If you run the server without Turbo, rebuild first:

```bash
pnpm --filter @aniquizz/shared build
```

Integration tests need Supabase test users: `pnpm test:setup` (see [`CONTRIBUTING.md`](./CONTRIBUTING.md)).

---

## Typing

- TypeScript **strict** on `packages/shared`, `apps/server`, and `apps/client`. Avoid `any`. **`pnpm typecheck` runs `tsc` on the SPA** — Vite/SWC must not be the only gate. Client `noUnusedLocals` / `noUnusedParameters` stay off.
- **Socket contract:** all cross-wire data must use types from `packages/shared/src/events.ts` and `packages/shared/src/game.ts`. Do not duplicate or weaken types on client or server.
- **Mutating socket payloads** (`game:answer`, `update_room_settings`, `start_game`, `vote_pause`, `vote_skip`, `game:skip_round`, `game:return_to_lobby`, `game:cancel`, `get_game_state`, `chat:sendMessage`, `update_profile_data`, `profile:update_prefs`, `profile:update_privacy`, `profile:delete_account`, `friends:set_privacy` as a legacy alias of `allowFriendRequests`, `lists:link`, `lists:set_active`, `lists:refresh`, `lists:unlink`) must be parsed with Zod schemas in `packages/shared/src/socketPayloads.ts` at the handler. Types on the wire are not a runtime boundary. UI writes `allowFriendRequests` via `profile:update_privacy` only.
- **ESLint (server + shared):** `eqeqeq` (`null` ignore), `@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-floating-promises`. Socket.io never awaits listeners — `requireAuth` / `guard` settle returned promises. **Client:** same `eqeqeq` + `no-explicit-any`; `no-unused-vars` stays off (shadcn / catch noise).
- **Package boundaries:** ESLint `no-restricted-imports` — client ↛ `apps/server` / `@aniquizz/database` / `express` / Prisma; shared ↛ `react` / `express` / Prisma / Socket.io runtime; server ↛ `react` / `apps/client`. Zod is allowed in shared.
- **Client a11y:** `eslint-plugin-jsx-a11y` recommended runs as **warn**. Do not flip to error until a dedicated cleanup; do not disable the plugin to silence a warning.
- **Pure logic** (scoring, medals, victory, fuzzy match, watched pool, selection) belongs in `packages/shared` with unit tests in the same package (e.g. `grading.test.ts`, `victory.test.ts`).
- **Player identity** is always JWT `userId` (`socket.data.userId`), never `socket.id`.

---

## CSS and design tokens

Design system: [`apps/client/src/index.css`](./apps/client/src/index.css) — dark-only **Encore** direction.

**Rules:**

- Use semantic tokens via Tailwind (`bg-primary`, `text-accent`, `border-border`, `text-muted-foreground`) or `hsl(var(--token))`. **No hardcoded hex/rgb** for theme colors.
- Reuse component-layer primitives: `.glass-card`, `.gradient-text`, `.stage-text`, `.hover-lift`, `.custom-scrollbar`.
- Reuse shadcn primitives under `apps/client/src/components/ui/` and `FOCUS_RING` from config primitives — do not reinvent buttons, dialogs, inputs.
- `.glass-card` owns card radius; do not override per usage.
- Motion: global `prefers-reduced-motion` is handled in `index.css` — avoid adding animations that ignore it.
- **User-facing copy stays French** (isolated for future i18n); styling tokens are language-agnostic.

Token reference (HSL custom properties): `--primary`, `--accent`, `--aqua`, `--success`, `--warning`, `--destructive`, `--card`, `--muted`, `--silver`, `--medal-bronze`, etc.

---

## File size and partitioning

**Soft cap:** ~300–400 lines per file. Beyond that, split by responsibility.

**Existing patterns to follow:**

| Area               | Pattern                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Server game engine | `apps/server/src/modules/game/engine/` — `MatchEngine`, `PlaylistBuilder`, `RoundClock`, `MatchRepository`, `Room` |
| Server handlers    | One module per domain: `lobbyHandlers`, `gameHandlers`, `profileHandlers`, …                                       |
| Client features    | `apps/client/src/features/<domain>/` — components, hooks, copy                                                     |
| Lobby copy         | Isolated builders e.g. `lobbyRulesCopy.ts` + tests                                                                 |
| Shared pure logic  | One concern per file in `packages/shared/src/`                                                                     |

**Prefer extracting:** hooks (`hooks/`), subcomponents, pure helpers in `packages/shared` — not growing a page or handler file.

**Known coupling (graphify):** import cycle `PlaylistBuilder` ↔ `watchedPoolService` ↔ `Room` — touch Watched mode carefully.

---

## Comments and language

| Context                             | Language                       |
| ----------------------------------- | ------------------------------ |
| Code, comments, logs, docs, commits | **English**                    |
| User-facing UI strings              | **French** (isolated for i18n) |

CI [`scripts/check-english-code.mjs`](./scripts/check-english-code.mjs) scans comments in `apps/server/src`, `packages/shared/src`, `packages/database/scripts` for French accents. **French string literals in server error payloads are allowed.**

**Comment quality:** explain _why_ (intent, constraint, trade-off, non-obvious invariant) — not _what_ the next line does. Link to design docs when useful (`docs/game/…`, `docs/security/…`).

---

## End-of-task loop

Per project discipline ([`PLAN.md`](./PLAN.md) / [`PROGRESS.md`](./PROGRESS.md)):

1. Work **one phase at a time** — do not jump ahead in the roadmap.
2. At phase boundary: update `PROGRESS.md` (what changed, decisions, state, next step).
3. Propose a **Conventional Commits** message before opening a new chat or merging.
4. Run the CI pre-flight commands above when the change is non-trivial.

---

## Available skills (when to load)

Read and **follow** the relevant `SKILL.md` when a task matches — do not only mention the skill name.

| Concern                       | Skill                                                                | When                                                                        |
| ----------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Codebase exploration          | `graphify`                                                           | Any architecture, dependency, or cross-file question (see § Graphify first) |
| React performance             | `vercel-react-best-practices`, `react-best-practices`                | Hooks, renders, bundle-sensitive UI work                                    |
| shadcn / components           | `shadcn`                                                             | Adding or composing UI primitives                                           |
| UI design / a11y              | `frontend-design`, `web-design-guidelines`                           | New screens, visual polish — stay consistent with design tokens             |
| Core Web Vitals               | `performance-optimizer`, `web-perf`                                  | Lighthouse, loading, client perf                                            |
| Vercel deploy                 | `deployment-expert`                                                  | Client build, preview, env on Vercel                                        |
| Render deploy / debug         | `render-deploy`, `render-web-services`, `render-debug`, `render-cli` | Server on Render, logs, env, port binding                                   |
| Supabase / Postgres           | `supabase`, `supabase-postgres-best-practices`                       | Auth, RLS, Postgres queries                                                 |
| Prisma / schema               | `prisma-database-setup`                                              | Migrations, schema changes                                                  |
| Cloudflare R2                 | `wrangler`, Cloudflare `cloudflare` skill                            | Video CDN, Workers if touched                                               |
| TDD                           | `tdd`                                                                | New pure logic in `packages/shared`                                         |
| TypeScript / monorepo         | `typescript-expert`                                                  | Advanced types, package boundaries                                          |
| GitHub Actions                | `github-actions-docs`                                                | CI workflow changes                                                         |
| PR review (bugs)              | `review-bugbot`                                                      | **User must ask explicitly**                                                |
| PR review (security)          | `review-security`                                                    | **User must ask explicitly**                                                |
| Cursor rules / hooks / skills | `create-rule`, `create-skill`, `create-hook`, `automate`             | Evolving agent tooling for this repo                                        |
| Issue / PR hygiene            | `babysit`                                                            | Keeping a PR merge-ready, CI loop                                           |
| Split large changes           | `split-to-prs`                                                       | User asks to split work into reviewable PRs                                 |

Prefer these skills over reinventing workflows. Bugbot and security review subagents run only on **explicit user request**.
