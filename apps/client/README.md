# AniQuizz Client

React + Vite front-end for [aniquizz.com](https://aniquizz.com). Deployed on **Vercel**
(project root: `apps/client`).

## Stack

- React 18, TypeScript, Vite
- shadcn/ui + Tailwind CSS (dark theme)
- Framer Motion for transitions
- Supabase Auth (JWT → Socket.io auth)
- Self-hosted fonts (`@fontsource/*`) — no Google Fonts round-trip

## Structure

```
src/
├── pages/           Route entry points (lazy-loaded)
├── features/        Domain modules
│   ├── auth/        Session, login modal, suspension badge
│   ├── hub/         Lobby, room list, game config
│   ├── game/        Standard mode UI, socket hook, video playback
│   ├── friends/     Friends panel, presence, invites
│   ├── profile/     Stats, history, AniList link
│   ├── admin/       Moderation, catalogue, rooms, stats
│   ├── home/        Landing hero, news teaser
│   ├── settings/    Global settings + legal links
│   └── legal/       Cookie consent
├── components/      Shared layout (Header, skeletons) + ui/
└── lib/             supabase, socket, adminApi, env, routePrefetch
```

## Routes

| Path | Page | Auth |
| ---- | ---- | ---- |
| `/` | Home | — |
| `/play` | Game hub (lobby) | ✓ |
| `/game` | Active match | ✓ |
| `/profile`, `/profile/:userId` | Profile | ✓ |
| `/admin` | Admin panel | ✓ (MODERATOR+) |
| `/library` | Music catalogue browse | prefetch |
| `/news` | News & roadmap | — |
| `/leaderboard` | Community rankings (XP, victories, games, Pokédex, accuracy) | — |
| `/suggestions` | Community ideas board | — |
| `/legal/*` | CGU, privacy, mentions | — |

## Scripts

```bash
pnpm dev          # Vite dev server :5173
pnpm build        # Production build → dist/
pnpm test         # Vitest component/unit tests
pnpm typecheck    # tsc --noEmit
```

## Environment

Copy `.env.example` → `.env`:

| Variable | Purpose |
| -------- | ------- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_SERVER_URL` | Socket.io / API origin (prod: Render URL) |
| `VITE_R2_PUBLIC_URL` | Public R2 bucket base URL for video MP4s |

## Deploy (Vercel)

- **Root directory:** `apps/client`
- **Build:** `pnpm build` (via Turborepo from monorepo root or Vercel monorepo settings)
- **Output:** `dist`
- Redirects and cache headers: `vercel.json` (apex domain, immutable `/assets/*`)

## Performance notes

- Route-based code splitting with skeleton fallbacks
- Supabase chunk deferred until auth init
- `modulepreload` for Home chunk + critical font (build plugin in `vite.config.ts`)
- See [`docs/perf/baseline.md`](../../docs/perf/baseline.md)
