# AniQuizz Server

Express 5 + Socket.io back-end. Deployed on **Render** (`render.yaml` at repo root).

## Stack

- Express 5, Socket.io 4, TypeScript
- Prisma → Supabase Postgres
- Supabase Auth JWT verification (handshake + HTTP admin routes)
- Pino structured logging

## Structure

```
src/
├── index.ts              Bootstrap, warm catalogue caches
├── core/
│   ├── Server.ts         Express + HTTP server
│   ├── SocketManager.ts  Registers all socket handlers
│   ├── authMiddleware.ts JWT → socket.data (userId, role, mutedUntil)
│   ├── httpAuth.ts       Admin REST auth (requireRole)
│   └── guards.ts         Rate limits (chat, answers, anime search, …)
├── modules/
│   ├── game/             GameManager, handlers, engine/ (MatchEngine, PlaylistBuilder)
│   ├── lobby/            Rooms, join/create, settings
│   ├── chat/             In-game messages
│   ├── profile/          Stats, public profile, leaderboard
│   ├── friends/          Friend graph + presence
│   ├── admin/            REST /admin/* (users, rooms, catalogue, stats)
│   └── anilist/          Watched-list resolution
├── routes/               /health, /leaderboard, /library, /suggestions
├── integration/          Vitest integration tests (real DB + socket)
└── config/               CORS, env validation
```

## HTTP endpoints

| Route | Purpose |
| ----- | ------- |
| `GET /health` | Render health check + live stats |
| `GET /leaderboard` | Public five-metric rankings (`xp`, `victories`, `games`, `discoveries`, `accuracy`) |
| `/admin/*` | Admin API (Bearer JWT, role-gated) |

All game logic runs over **Socket.io** — see `packages/shared/src/events.ts` for the typed contract.

## Scripts

```bash
pnpm dev          # nodemon + ts-node :3001
pnpm build        # tsc → dist/
pnpm start        # node dist/index.js (production)
pnpm test         # Vitest (unit + integration)
pnpm test:ensure-auth   # Ensure @aniquizz.test Supabase users exist
```

## Environment

Copy `.env.example` → `.env`. Required in production:

| Variable | Purpose |
| -------- | ------- |
| `PORT` | HTTP port (Render sets automatically) |
| `DATABASE_URL` | Postgres connection string |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | JWT verification + admin ops |
| `CLIENT_URL` | CORS origin (`https://aniquizz.com`) |
| `R2_*` | Optional on server unless admin uploads |

## Deploy (Render)

Configured in root `render.yaml`:

- **Build:** `pnpm install && pnpm db:generate && pnpm --filter aniquizz-server... build`
- **Start:** `node apps/server/dist/index.js`
- **Health:** `/health`
- **Region:** Frankfurt, Starter plan

Bind address: `0.0.0.0:$PORT` (Render requirement).

## Testing

Integration tests spin up an isolated Express + Socket.io stack on a random port.
Requires `DATABASE_URL` and Supabase test credentials — see root `pnpm test:setup`.

```bash
pnpm exec vitest run src/integration/
```

## Related docs

- [`docs/admin/moderation.md`](../../docs/admin/moderation.md) — mute/ban flows
- [`docs/security/rls-audit.md`](../../docs/security/rls-audit.md) — Postgres RLS
