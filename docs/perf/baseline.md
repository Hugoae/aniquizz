# Performance baseline — Phase 10.0

Captured **2026-07-09** on commit after `e7edce4` (post hotfix `StandardGameLayout`).

Use this document as the **before** reference for Phase 10 optimizations. Re-run with `pnpm perf:baseline` (bundle) and the Lighthouse commands in [`README.md`](./README.md).

## Environment

| Item | Value |
|------|-------|
| Production URL | `https://aniquizz.com` |
| Client deploy | Vercel (SPA + prerender on 7 public routes) |
| Server deploy | Render Starter |
| Catalogue | Empty at capture time (pipeline repopulation pending) |

## Lighthouse (production)

| Route | Form factor | Perf score | FCP | LCP | TBT | CLS | Speed Index |
|-------|-------------|------------|-----|-----|-----|-----|-------------|
| `/` | Mobile | **82** | 2.5 s | **4.2 s** | 70 ms | 0.033 | 2.5 s |
| `/` | Desktop | **99** | 0.6 s | 0.9 s | 0 ms | 0.01 | 0.6 s |
| `/news` | Mobile | **77** | 3.8 s | 4.0 s | 10 ms | 0 | 4.7 s |

Raw reports: `baseline-home-mobile.json`, `baseline-home-desktop.json`, `baseline-news-mobile.json`.

**Not measured here (auth-gated):** `/play`, `/game` — run manually after login (DevTools → Lighthouse or Performance panel).

### Phase 10 targets (indicative)

| Metric | Mobile target |
|--------|---------------|
| LCP | < 2.5 s |
| CLS | < 0.1 |
| INP | < 200 ms |
| Perf score | ≥ 90 on `/` mobile |

## Client bundle (`pnpm --filter aniquizz-client build`)

Build time: **~7.5 s** · Total JS emitted: **~1.58 MB** raw (all lazy + vendor chunks).

### Phase 10.3 snapshot (2026-07-09)

| Chunk | Raw | Gzip | Loaded when |
|-------|-----|------|-------------|
| `index-*.js` (app shell) | 106 kB | **32 kB** | Every page |
| `vendor-react-*.js` | 269 kB | 85 kB | Every page |
| `vendor-supabase-*.js` | 212 kB | 55 kB | Every page (auth) |
| `vendor-radix-*.js` | 89 kB | 28 kB | Shell UI primitives |
| `vendor-socket-*.js` | 42 kB | 13 kB | **After sign-in** |
| `index-*.css` | 85 kB | **14 kB** | Every page |
| `Home-*.js` | 12 kB | 4 kB | `/` |
| `GameHub-*.js` | 60 kB | 17 kB | `/play` |
| `Game-*.js` | 92 kB | **26 kB** | `/game` |
| `vendor-motion-*.js` | 123 kB | 40 kB | `/game` (with Game chunk) |
| `Admin-*.js` | 77 kB | **21 kB** | `/admin` |
| `vendor-recharts-*.js` | 348 kB | 97 kB | `/admin` (with Admin chunk) |

Analyze locally: `pnpm --filter aniquizz-client build:analyze` → `apps/client/dist/bundle-stats.html`.

### Phase 10.4 snapshot (2026-07-09)

| Change | Effect |
|--------|--------|
| Route skeletons | No full-screen spinner on lazy route / auth gate |
| Auth `authReady` | Session unblocks navigation before profile fetch |
| Async Google Fonts | Fonts removed from render-blocking (CSS only) |
| Prefetch `/play`, `/game` | Hover on home CTA + hub mount |

Local mobile Lighthouse (`pnpm preview`, throttled): score **79**, LCP **4.5 s**, **1** render-blocking resource (app CSS). Production re-measure after deploy: `docs/perf/README.md`.

Raw local report: `baseline-home-mobile-local-10.4.json`.

### Phase 10.5 snapshot (2026-07-09)

| Area | Change |
|------|--------|
| Admin catalogue songs | Virtual scroll @ 24+ rows (`VirtualScroll` + memo `CatalogueSongRow`) |
| Admin users table | Memo `AdminUserRow` — poll refreshes skip unchanged rows |
| Auth modal | `AuthModalContext` isolated from session/profile |
| Friends | State vs actions context split |
| Lobby | `LobbyPlayerCard` memoized |

Admin chunk gzip **22 kB** (+1 kB vs 10.4 from `@tanstack/react-virtual`).

### Phase 10.7 snapshot (2026-07-09)

| Area | Before | After |
|------|--------|-------|
| `rooms_update` fan-out | `io.emit` → **every** socket | `io.to('lobby:list')` → lobby browsers only |
| Room-list broadcasts | One emit per lifecycle event | Trailing debounce **150 ms** |
| `RoomListItem.settings` | Full `RoomSettings` (+ password, host dupes) | **`RoomListSettingsSummary`** (6 fields) |
| Friend presence | Immediate on every lobby/game hook | **400 ms** debounce + duplicate skip; connect/offline immediate |

**Sample payload (1 public room, dev):** full settings ~**355 B** → trimmed ~**131 B** per item (~63% smaller settings blob).

**SEO flash fix (same deploy window):** prerender copy moved to `#seo-content hidden`; **`app-shell`** in `#root` paints the real home hero before React (no violet blank / no raw `<h1>` flash on `/`).

### Phase 10.6 snapshot (2026-07-09)

| Area | Change |
|------|--------|
| Images | Lazy avatars/covers; eager profile hero; header `fetchPriority="high"` |
| R2 video | Hidden warmer `preload="none"` until `warmVideo()`; per-round cache reset |
| Match end | Parallel `SongHistory` upserts + profile stat updates |
| Profile stats | Parallel query batch + 10 min playable-song count cache |

### Phase 10.0 baseline (pre-10.3)

| Chunk | Raw | Gzip | Loaded when |
|-------|-----|------|-------------|
| `index-*.js` (shell) | 640 kB | **191 kB** | Every page |
| `index-*.css` | 85 kB | **14 kB** | Every page |
| `Home-*.js` | 12 kB | 4 kB | `/` |
| `GameHub-*.js` | 60 kB | 17 kB | `/play` |
| `Game-*.js` | 213 kB | **66 kB** | `/game` |
| `Profile-*.js` | 69 kB | 20 kB | `/profile` |
| `Admin-*.js` | 458 kB | **128 kB** | `/admin` |

Vite warns: shell (`index-*.js`) and `Admin-*.js` exceed 500 kB minified.

### First navigation cost (gzip, approximate)

**Phase 10.3 — logged-out `/`:** index 32 + vendor-react 85 + vendor-supabase 55 + vendor-radix 28 + Home 4 + CSS 14 ≈ **218 kB** (socket **not** loaded).

**Phase 10.0 — logged-out `/`:**

| Journey | JS + CSS (gzip) |
|---------|-----------------|
| Cold load `/` | ~191 + 14 + 4 ≈ **209 kB** |
| Navigate `/` → `/play` | +17 kB (GameHub chunk) |
| Navigate `/play` → `/game` | +66 kB (Game chunk) |

### Known heavy deps (by chunk ownership)

- **Shell:** React, React Router, Supabase client, Socket.io client, Radix primitives, `sonner`, `next-themes`.
- **Game:** `framer-motion`, game layout + socket reducer.
- **Admin:** `recharts` (~majority of Admin chunk).
- **GameHub:** lobby forms, watched-source, room list.

## Route transitions (observed behaviour)

- `App.tsx` uses `React.lazy` + full-screen `RouteFallback` spinner (`Loader2`) on every route change.
- `ProtectedRoute` adds a second spinner while auth session resolves.
- Providers (`AuthProvider`, `FriendsProvider`, `CookieConsentProvider`) wrap the full tree — remount cost on navigation is low, but auth loading blocks protected routes.

## Server & DB hot paths

| Path | When | Notes |
|------|------|-------|
| `PlaylistBuilder.build` | Match start | Song cascade **parallelized** with candidate load (10.8); timing log emitted |
| `getChoiceCandidates` | Match start (QCM/duo rooms) | Derived from shared `getAllAnimeNames` cache — **single** `anime` scan, warmed at boot (10.8) |
| `MatchRepository.finish` | Game over | Parallel `SongHistory` upserts + profile updates (10.6) |
| `profile:get_stats` | Profile page | **Single** DB round-trip wave (10.8, was two); cached playable-song count (10.6) |
| `anime:get_all` / `anime:all_names` | In-game autocomplete warm-up | One bulk fetch per game session; client caches module-side (26.2.1) |
| Client fuzzy (`useAnimeSearch`) | Every keystroke during guessing | Local `getFuzzySuggestions` over the cached catalogue — no per-keystroke socket (26.2.1) |
| `broadcastRoomList` | Lobby/match lifecycle | `rooms_update` to **`lobby:list` subscribers** (debounced 150 ms) |
| `broadcastPresence` | Connect/disconnect/lobby/game | Debounced 400 ms; duplicate skip; offline immediate |
| `game_state_sync` | Reconnect / `get_game_state` | Full room state — intentionally debug-only in logs (high volume) |

## Socket payload sizes (estimated)

Typical JSON sizes at emit time (empty catalogue / 4-player multi / 10 rounds):

| Event | ~Size | Notes |
|-------|-------|-------|
| `round_start` | 0.3–1 kB | `videoKey`, choices, timing — no answer leak |
| `game:answered` | <0.1 kB | `{ userId }` only |
| `round_reveal` | 2–8 kB | `RevealSong` + full `players[]` with answers |
| `game_over` | 5–20 kB | Victory data + optional round history |
| `game_state_sync` | 5–30 kB | Full sync blob on reconnect |
| `rooms_update` | 0.3–3 kB | Trimmed settings; scales with public room count; targeted fan-out |
| `friends:presence` | <0.3 kB | Per friend notification |
| `anime:all_names` | 5–50 kB (scales with catalogue) | Full `FuzzyAnimeCandidate[]` once per session; replaces per-keystroke traffic |
| `anime:search_results` | *(legacy handler, unused by client)* | Server still exposes `anime:search` but the SPA no longer calls it since 26.2.1 |

The full `anime_list` transport (scaled with catalogue size) was removed in 10.8;
autocomplete now costs one small request/response per keystroke instead of one
large one-off download per game.

## Core Web Vitals summary

| Vital | Home mobile baseline | Status |
|-------|---------------------|--------|
| LCP | 4.2 s | Needs improvement |
| CLS | 0.033 | Good |
| INP | not in LH 12 JSON | Measure in field / Web Vitals extension |

## Phase 10.9 snapshot (2026-07-09)

| Metric | Pre-10.9 prod `/` mobile | 10.9 local preview | Target |
|--------|--------------------------|-------------------|--------|
| Perf score | **77** (`baseline-home-mobile-pre109.json`) | 72 | ≥ 90 |
| LCP | **4.0 s** | 5.1 s (not comparable) | < 2.5 s |
| CLS | 0 | 0 | < 0.1 |
| TBT | 20 ms | 10 ms | low |

**Structural wins:** shell entry gzip ~**20 kB** (Supabase deferred); Google Fonts removed; Vercel immutable cache on `/assets/*`; Home + Bricolage 800 woff2 preloaded at build.

Re-run prod Lighthouse after Vercel deploy to validate LCP improvement.

## Phase 10.8 — server & DB hot paths

Catalogue snapshot at measurement: **434 songs (all COMPLETED), 265 animes, 91 franchises** (repopulation in progress).

The full `anime_list` transport (scaled with catalogue size) was removed in 10.8.
**26.2.1** reverted autocomplete to a **single bulk download + local fuzzy** (see below);
the per-keystroke `anime:search` path is no longer used by the client.

### Axis 1 — autocomplete (10.8 server search → 26.2.1 client fuzzy)

**10.8 (superseded for in-game UX):** the client sent a debounced `anime:search { requestId, query, precision }`; the server ran `getFuzzySuggestions` over its cached name list and returned ≤5 ranked matches per keystroke.

**26.2.1 (current):** `useAnimeSearch` fetches the catalogue **once** per session via `anime:get_all` → `anime:all_names`, caches it module-side (with retry on reconnect), then runs `getFuzzySuggestions` **locally on every keystroke** — instant suggestions, no per-keystroke network round-trip. The fuzzy logic (`getFuzzySuggestions`) is unchanged and still fully unit-tested in `packages/shared`. The server `anime:search` handler remains for backward compatibility but is not called by the current client.

### Axis 2 — playlist build

- **Unified catalogue cache:** `getChoiceCandidates` now derives from the shared `getAllAnimeNames` cache, so autocomplete and QCM choices share a **single** `anime` scan (was two independent scans).
- **Parallelized:** song selection (`getRandomSongs`) and the QCM candidate pool now load via `Promise.all`, overlapping a cold candidate cache (full scan) with the song cascade.
- **Warm-up:** `warmCatalogueCaches()` runs at server boot so the first match / first keystroke skips the cold scan (matters on Render cold start).
- **Observability:** `PlaylistBuilder.build` logs round count + build time + flags.

### Axis 3 — profile stats

- **Single round-trip wave:** `computeRichStats` merged its two sequential `Promise.all` batches into one (9 independent queries issued together) — halves the DB latency waves on the profile page.
- **Client:** the self-stats fetch (`profile:get_stats`) is decoupled from socket subscriptions and no longer re-emits when `refreshProfile` identity changes (e.g. token refresh), avoiding redundant server-side recomputes.

### DB index

- Added composite `Song(downloadStatus, songType, difficulty)` (migration `20260709140000_perf_song_index`, applied live idempotently).
- `EXPLAIN ANALYZE` at 434 rows still shows seq scans (cheaper than index at this size) — the index is **preventive for scale** and will be preferred by the planner as the catalogue grows into the thousands.

## Next steps

1. **Deploy 10.9 to Vercel** → re-run prod Lighthouse mobile on `/` and update baseline.
2. Re-measure playlist build + candidate scan as catalogue grows.
