# Context Map

Domain-doc index for this pnpm + Turborepo monorepo. Each context below has its
own `CONTEXT.md` (role, business glossary, known pitfalls). Read the one relevant
to your task instead of scanning the whole package.

See [`docs/agents/domain.md`](./docs/agents/domain.md) for how to consume these docs,
and [`AGENTS.md`](./AGENTS.md) for the full engineering playbook.

## Contexts

| Context | CONTEXT.md | Role |
|---------|-----------|------|
| Client | [`apps/client/CONTEXT.md`](./apps/client/CONTEXT.md) | React + Vite SPA (Vercel) — UI, socket hooks, video playback |
| Server | [`apps/server/CONTEXT.md`](./apps/server/CONTEXT.md) | Express + Socket.io + Prisma (Render) — rooms, match engine, admin REST |
| Shared | [`packages/shared/CONTEXT.md`](./packages/shared/CONTEXT.md) | Framework-agnostic types, socket contract, pure game logic |
| Database | [`packages/database/CONTEXT.md`](./packages/database/CONTEXT.md) | Prisma schema + ETL pipeline (AniList → AnimeThemes → Postgres → R2) |

## Shared vocabulary (cross-context)

These terms mean the same thing everywhere. Per-context glossaries add local detail.

| Term | Meaning |
|------|---------|
| **Room** | A live lobby/match container keyed by room id. Holds settings, roster, and the active match. |
| **MatchEngine** | Server-side round-by-round game loop for one match (song → guess → reveal → score). |
| **PlaylistBuilder** | Draws the song list + QCM distractors for a match, applying Watched/precision filters. |
| **Watched** | Music source restricted to a player's AniList list (`soundSelection === 'watched'`). |
| **Precision** | Answer granularity: `franchise` (whole franchise) vs `anime` (exact season). Legacy value `exact` normalizes to `anime`. |
| **Medal** | Solo game-over grade (Bronze → Argent → Or → Platine) from mastery ratio, adjusted by difficulty and precision. |
| **Player identity** | Always the JWT `userId` (`socket.data.userId`), never `socket.id`. |

## Decisions

System-wide ADRs live in `docs/adr/` (create lazily when a decision is resolved).
Design notes for shipped work live under `docs/game/`, `docs/security/`, `docs/admin/`.
