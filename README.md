# AniQuizz

[![CI](https://github.com/Hugoae/aniquizz/actions/workflows/ci.yml/badge.svg)](https://github.com/Hugoae/aniquizz/actions/workflows/ci.yml)

**[aniquizz.com](https://aniquizz.com)** — real-time anime opening blind-test game. Guess the anime
from its OP/ED in solo or multiplayer, level up, play with friends, and explore the catalogue.

## Tech stack

| Layer    | Technology                                                         |
| -------- | ------------------------------------------------------------------ |
| Client   | React 18, Vite, TypeScript, shadcn/ui, Tailwind CSS, Framer Motion |
| Server   | Express 5, Socket.io 4, Prisma                                     |
| Database | PostgreSQL (Supabase), Prisma ORM                                  |
| Auth     | Supabase Auth (JWT)                                                |
| Media    | Cloudflare R2 (MP4 catalogue)                                      |
| Deploy   | Vercel (client), Render (server)                                   |
| Monorepo | pnpm workspaces + Turborepo                                        |

## Repository layout

```
aniquizz/
├── apps/
│   ├── client/          React SPA — Vercel (aniquizz.com)
│   └── server/          Express + Socket.io — Render
├── packages/
│   ├── shared/          Types, game logic, socket event contracts
│   └── database/        Prisma schema, ETL pipeline, R2 sync
├── docs/                Security, SEO, performance, admin guides
├── e2e/                 Playwright end-to-end tests
├── render.yaml          Render Blueprint (server)
└── ARCHITECTURE.md      System design overview
```

## Prerequisites

- Node.js **≥ 20** ([`.nvmrc`](./.nvmrc))
- pnpm **9** (`corepack enable`)
- PostgreSQL (Supabase) for the server and catalogue pipeline

## Getting started

```bash
pnpm install

# Create env files from the examples:
#   apps/client/.env
#   apps/server/.env
#   packages/database/.env

pnpm db:generate
pnpm dev
```

- Client: http://localhost:5173
- Server (HTTP + Socket.io): http://localhost:3001

For integration/e2e tests, run `pnpm test:setup` once (see [CONTRIBUTING.md](./CONTRIBUTING.md)).

## Common scripts

| Command              | Description                                      |
| -------------------- | ------------------------------------------------ |
| `pnpm dev`           | Client + server in watch mode                    |
| `pnpm build`         | Build all packages                               |
| `pnpm test`          | Unit, component & integration tests              |
| `pnpm test:e2e`      | Playwright e2e (needs `E2E_EMAIL` / `E2E_PASSWORD`) |
| `pnpm lint`          | Lint all packages                                |
| `pnpm typecheck`     | TypeScript check                                 |
| `pnpm check:english` | Fail on French accents in server/shared code     |
| `pnpm db:generate`   | Generate Prisma client                           |
| `pnpm db:migrate`    | Apply Prisma migrations (dev)                    |
| `pnpm db:studio`     | Open Prisma Studio                               |
| `pnpm perf:baseline` | Build client + summarize bundle sizes            |

## Features (current)

- **Standard mode** — solo (medals) and multiplayer (podium), server-authoritative rounds
- **Lobby** — public/private rooms, filters (difficulty, song type, precision), bots (dev)
- **Friends** — requests, presence, lobby invites
- **Profile** — XP/levels, stats, match history, AniList watched-mode link
- **Admin** (`/admin`) — users, rooms, catalogue, stats, moderation (mute/ban)
- **Legal** — CGU, privacy policy, mentions légales, cookie consent

Leaderboard and playlist presets are planned — see coming-soon placeholders in the app.

## Data pipeline

The song catalogue is built locally: **AniList → AnimeThemes → Postgres → Cloudflare R2**.
See [`packages/database/README.md`](./packages/database/README.md).

## Deployment

| Service | Platform | Config |
| ------- | -------- | ------ |
| Client  | Vercel   | `apps/client/vercel.json` — root dir `apps/client` |
| Server  | Render   | `render.yaml` — monorepo build from repo root |

Production domain: **https://aniquizz.com** (www and `*.vercel.app` redirect to apex).

## Conventions

- Code, comments, logs, docs, and commits: **English**. User-facing UI: **French** (isolated for future i18n).
- [Conventional Commits](https://www.conventionalcommits.org/).
- Player identity = JWT `userId`, never `socket.id`.
- Never log secrets (JWT tokens, room passwords).

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) and [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## License

[MIT](./LICENSE)
