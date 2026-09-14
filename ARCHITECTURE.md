# Architecture

High-level overview of AniQuizz as deployed at [aniquizz.com](https://aniquizz.com).

## System overview

```mermaid
flowchart LR
  subgraph client [Client - Vercel]
    react[React + Vite + shadcn]
  end
  subgraph server [Server - Render]
    express[Express + Socket.io]
    engine[MatchEngine + PlaylistBuilder]
    prisma[Prisma Client]
  end
  subgraph data [Data]
    pg[(Supabase Postgres)]
    auth[Supabase Auth]
    r2[(Cloudflare R2)]
  end
  react -->|WebSocket + JWT| express
  react -->|Sign-in| auth
  react -->|MP4 CDN| r2
  express --> engine
  express --> prisma --> pg
  express -->|verify JWT| auth
  pipeline[ETL pipeline] -->|upload MP4| r2
  pipeline --> pg
```

## Monorepo packages

### `apps/client`

React SPA deployed to Vercel (`apps/client` as project root).

| Area                 | Purpose                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------- |
| `src/pages/`         | Routed views — Home, GameHub, Game, Profile, Admin, Library, Leaderboard, legal pages                   |
| `src/features/`      | Feature modules — auth, game, hub, friends, profile, admin, settings, library, leaderboard, suggestions |
| `src/components/ui/` | shadcn/ui primitives                                                                                    |
| `src/lib/`           | Supabase, socket, admin API, env, route prefetch                                                        |
| `vercel.json`        | SPA rewrite, apex redirects, immutable asset cache                                                      |

Route-based code splitting (`React.lazy`) with skeleton fallbacks. Supabase and
socket helpers load on demand after first paint where possible.

### `apps/server`

Express + Socket.io on Render (Starter, Frankfurt). Binds `0.0.0.0:$PORT`.

| Area                     | Purpose                                                                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `src/core/`              | HTTP bootstrap, `SocketManager`, JWT auth middleware, rate guards                                              |
| `src/modules/game/`      | `GameManager`, `gameHandlers`, `gameService`, **engine/** (`MatchEngine`, `PlaylistBuilder`, `RoundClock`, …)  |
| `src/modules/lobby/`     | Room create/join, settings, room list fan-out                                                                  |
| `src/modules/chat/`      | In-game chat (respects mute sanctions)                                                                         |
| `src/modules/profile/`   | Stats, public profiles, five-metric community leaderboard                                                      |
| `src/modules/friends/`   | Friend graph, presence, invites                                                                                |
| `src/modules/admin/`     | REST `/admin/*` — users, rooms, catalogue, stats, dev tools                                                    |
| `src/modules/anilist/`   | Watched-list resolution for AniList mode                                                                       |
| `src/modules/mal/`       | MyAnimeList public API — username verify, animelist fetch, `idMal` catalogue mapping                           |
| `src/modules/lists/`     | `listResolver` + `listHandlers` — AniList **and** MAL may stay linked; one `activeListProvider` drives Watched |
| `src/modules/catalogue/` | `libraryService` — browse meta, franchise tree, song search/detail                                             |
| `src/modules/daily/`     | Quiz du jour — generation, HTTP play loop, admin review                                                        |
| `src/routes/`            | `/health`, `/library/*`, `/leaderboard`, `/suggestions`, `/daily/*`                                            |

Catalogue caches (`getAllAnimeNames`, choice candidates) warm at boot to reduce
cold-start latency on Render.

### `packages/shared`

Framework-agnostic types, socket event contracts (`events.ts`), game constants,
and **pure logic** — fuzzy matching, scoring, grading/medals, ranking, leveling,
Fisher–Yates selection. Unit-tested; imported by both client and server.

### `packages/database`

- `prisma/schema.prisma` + migrations — source of truth for Postgres
- `src/index.ts` — shared Prisma client, bot helpers
- `scripts/` — ETL pipeline (steps 1–4), export/import manual edits, R2 integrity scan, video repair

Media keys live in `Song.videoKey`; completed songs point at public R2 URLs.

## Identity & security

- **Socket handshake** verifies the Supabase JWT; `socket.data.userId` is the only trusted identity.
- **Banned users** are rejected at handshake; **muted users** cannot send chat (live sanction push via `profile:sanction_updated`).
- **Admin routes** require MODERATOR or ADMIN role from the database, not the client.
- **RLS** on Supabase tables — see [`docs/security/rls-audit.md`](./docs/security/rls-audit.md).

## Realtime flow: Standard match

1. Host creates/joins a lobby; settings stored server-side (`RoomSettings` / `GameConfig`).
2. Host starts — `PlaylistBuilder` selects songs (filters, difficulty, watched mode, QCM choices). In Watched + QCM/Mix, distractors use the same watched ids as the songs ([`docs/game/watched-qcm-choices.md`](./docs/game/watched-qcm-choices.md)). Watched pools resolve per player via the **active** AniList or MyAnimeList source (both usernames may stay linked), then union/intersection across the lobby.
3. Each round: server emits `round_start` (R2 key + start offset), collects `game:answer`, then `round_reveal`. Solo uses the full guess timer like multiplayer; optional early reveal via `game:skip_round` after at least one answer.
4. `MatchEngine` scores answers; anti-cheat rejects answers before reveal.
5. `game_over` persists stats/XP; solo medals computed from mastery ratio (`packages/shared` grading, integer-rounded thresholds — see [`docs/game/solo-medals.md`](./docs/game/solo-medals.md)).

## Music library (v26.2)

Read-only catalogue browse — no gameplay impact.

| Layer            | Detail                                                                                                                                              |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **HTTP**         | `GET /library/meta`, `/library/tree`, `/library/songs`, `/library/song/:id` — optional JWT (`optionalAuth`) for heard/unheard filters; rate-limited |
| **Server**       | `libraryService.ts` — playable songs = `downloadStatus: COMPLETED` only (same rule as matches)                                                      |
| **Browse modes** | Default: franchise tree paginated by `Franchise.maxPopularity`. With `q` search: flat song pagination + `Anime.altNames` GIN index                  |
| **Client**       | `/library` — filters, tree view, song drawer with video preview                                                                                     |
| **Shared**       | `packages/shared/src/library.ts` — browse params, response types, `animeMatchesLibrarySearch()`                                                     |
| **DB**           | Migration `20260712180000_library_franchise_popularity` — `Franchise.maxPopularity`, `Anime_altNames_gin_idx`                                       |

## Watched lists — AniList & MyAnimeList (v26.2, dual-link in v26.6)

| Rule                      | Behaviour                                                                                                                                                                                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dual link, one active** | `Profile.anilistUsername` and `Profile.malUsername` may both stay set. `activeListProvider` selects the Watched source; unlinking the active source falls back to the remaining link                                                                                                  |
| **AniList**               | Existing GraphQL sync → internal `Anime.id`                                                                                                                                                                                                                                           |
| **MAL**                   | Official v2 `GET /users/{name}/animelist` with `X-MAL-CLIENT-ID` (no OAuth); a profile-page HEAD disambiguates missing users from private-list 404s. Statuses: `watching`, `completed`, `on_hold` → catalogue via `Anime.idMal`                                                       |
| **Multi lobby**           | Each player's pool resolved separately; host settings apply **union** or **intersection** on catalogue ids                                                                                                                                                                            |
| **Gates**                 | Same min-pool threshold and opt-in global fallback as AniList-only Watched — see [`docs/game/watched-pool-threshold.md`](./docs/game/watched-pool-threshold.md)                                                                                                                       |
| **Env**                   | `MAL_CLIENT_ID` on server (Render prod + `apps/server/.env.example`)                                                                                                                                                                                                                  |
| **DB**                    | `Profile.malUsername` (`20260712200000`); `activeListProvider` + per-provider last-sync (`20260912161000`). `lastListSync` kept until a later contract drop                                                                                                                           |
| **Socket**                | `lists:get_status` returns persisted links immediately with `idle` health until resolved. Mutations (`link` / `set_active` / `refresh` / `unlink`) carry a request id and answer through correlated `lists:result` / `lists:error`; per-user serialization prevents link/switch races |
| **Client state**          | `ListsProvider` is the single live source for the profile badge, settings cards, active-source switch, and the auth-profile compatibility snapshot                                                                                                                                    |
| **Sync semantics**        | Linking and switching commit before any provider fetch. Manual sync updates the provider timestamp only after a successful/private-empty response; unavailable/stale responses remain explicit and do not masquerade as success                                                       |
| **Lobby coherence**       | List mutations update the live `GamePlayer` snapshot; `watched:list_changed` makes active room pool previews resolve again after source changes and successful syncs                                                                                                                  |

Shared helpers: `packages/shared/src/watchedList.ts` (`hasWatchedListLink`, `resolveActiveListProvider`). Socket payloads expose both usernames plus `activeListProvider` on `GamePlayer` / `SocketData`.

## Player settings (v26.6)

Comfort prefs (`PlayerPrefs`: audio, motion, gameplay, internal notification flags) are local-first (`aniquizz-player-prefs-v2`) and synced with `profile:update_prefs`. Privacy audiences and list links are account-only, written through Socket.io/Prisma (no Profile UPDATE RLS). Server redaction: blocked either way → generic unavailable profile; hidden status is `hidden` (never a fake `offline`); recent history can be empty with `historyRedacted` while aggregates stay.

## Environment

Each runnable package has its own `.env`. See [`.env.example`](./.env.example) and
per-package `.env.example` files for the required subset.

## Related docs

| Doc                                                                            | Topic                                                |
| ------------------------------------------------------------------------------ | ---------------------------------------------------- |
| [`docs/game/solo-medals.md`](./docs/game/solo-medals.md)                       | Solo medal tiers, mastery bar, rounding fix          |
| [`docs/game/watched-qcm-choices.md`](./docs/game/watched-qcm-choices.md)       | Watched AniList QCM/Duo distractor pool              |
| [`docs/game/artist-precision.md`](./docs/game/artist-precision.md)             | Artist answer precision (credits, QCM, autocomplete) |
| [`docs/game/watched-pool-threshold.md`](./docs/game/watched-pool-threshold.md) | Watched min-pool gates (AniList + MAL)               |
| [`docs/admin/moderation.md`](./docs/admin/moderation.md)                       | Mute/ban behaviour                                   |
| [`docs/security/delete-account.md`](./docs/security/delete-account.md)         | RGPD account deletion flow                           |
| [`docs/security/rls-audit.md`](./docs/security/rls-audit.md)                   | Postgres RLS                                         |
| [`docs/seo/google-search-console.md`](./docs/seo/google-search-console.md)     | SEO checklist                                        |
| [`docs/perf/baseline.md`](./docs/perf/baseline.md)                             | Performance snapshots                                |
| [`packages/database/README.md`](./packages/database/README.md)                 | Catalogue pipeline                                   |
