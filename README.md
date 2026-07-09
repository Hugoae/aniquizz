# AniQuizz

[![CI](https://github.com/Hugoae/aniquizz/actions/workflows/ci.yml/badge.svg)](https://github.com/Hugoae/aniquizz/actions/workflows/ci.yml)

Real-time anime opening blind-test game. Guess the anime from its opening/ending
in solo or multiplayer, climb the leaderboard, level up, and play with friends.

> Refactor in progress. This is a clean rebuild of the original project
> (see [`PLAN.md`](./PLAN.md)). Business logic and the design system are reused;
> the game engine and infrastructure are rebuilt on healthy foundations.

## Tech stack

| Layer      | Technology                                                        |
| ---------- | ----------------------------------------------------------------- |
| Client     | React 18, Vite, TypeScript, shadcn/ui, Tailwind CSS, Framer Motion |
| Server     | Express 5, Socket.io 4, Prisma                                    |
| Database   | PostgreSQL (Supabase), Prisma ORM                                 |
| Auth       | Supabase Auth (JWT)                                               |
| Media      | Cloudflare R2                                                     |
| Deploy     | Vercel (client), Render (server)                                  |
| Monorepo   | pnpm workspaces + Turborepo                                       |

## Repository layout

```
aniquizz/
├── apps/
│   ├── client/      React + Vite front-end (deployed to Vercel)
│   └── server/      Express + Socket.io back-end (deployed to Render)
├── packages/
│   ├── shared/      Framework-agnostic types, constants and pure logic
│   └── database/    Prisma schema, client, and the ETL media pipeline
├── PLAN.md          Phased refactor plan
├── PROGRESS.md      Living progress log
└── WORKFLOW.md      Per-phase execution ritual (model + skills)
```

## Prerequisites

- Node.js `>=20` (see [`.nvmrc`](./.nvmrc))
- pnpm `9` (`corepack enable`)
- A PostgreSQL database (Supabase) for the server and pipeline

## Getting started

```bash
# 1. Install dependencies (whole monorepo)
pnpm install

# 2. Configure environment
#    See .env.example for the full reference, then create:
#      apps/client/.env       (from apps/client/.env.example)
#      apps/server/.env       (from apps/server/.env.example)
#      packages/database/.env (from packages/database/.env.example)

# 3. Generate the Prisma client
pnpm db:generate

# 4. Run client + server together
pnpm dev
```

- Client dev server: http://localhost:5173
- Server (HTTP + Socket.io): http://localhost:3001

## Common scripts

| Command             | Description                                    |
| ------------------- | ---------------------------------------------- |
| `pnpm dev`          | Run client and server in watch mode            |
| `pnpm build`        | Build every package                            |
| `pnpm lint`         | Lint every package                             |
| `pnpm test`         | Run unit, component & integration tests          |
| `pnpm test:e2e`     | Playwright e2e (requires `E2E_EMAIL`/`E2E_PASSWORD`) |
| `pnpm check:english`| Fail if server/shared comments contain French accents |
| `pnpm format`       | Format the codebase with Prettier              |
| `pnpm db:generate`  | Generate the Prisma client                     |
| `pnpm db:migrate`   | Create/apply a Prisma migration (dev)          |
| `pnpm db:studio`    | Open Prisma Studio                             |

## Data pipeline

The anime/opening catalogue is built by a local ETL pipeline
(AniList → AnimeThemes → PostgreSQL → media storage).
See [`packages/database/README.md`](./packages/database/README.md).

## Conventions

- **Code, comments, logs, docs, commits: English.** User-facing UI text stays
  French and is kept isolated for future i18n.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/).
- Player identity is always the `userId` from the JWT, never `socket.id`.
- Never log secrets (JWT tokens, room passwords).

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) and [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## License

[MIT](./LICENSE)
