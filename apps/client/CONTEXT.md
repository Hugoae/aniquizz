# Context — `aniquizz-client`

**Role:** React 18 + Vite SPA for aniquizz.com (Vercel). Renders the lobby, the
Standard game, profile, admin, and legal pages. All gameplay state is server-driven
over Socket.io; the client mirrors it and never computes authoritative results.

See [`README.md`](./README.md) for stack, routes, env, and deploy details.

## Glossary

| Term                                 | Definition                                                                                                  | Where                                             |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **feature module**                   | Self-contained domain folder (components, hooks, copy) under `src/features/<domain>/`.                      | `features/`                                       |
| **useGameSocket**                    | Hook owning the in-match socket lifecycle; feeds `gameReducer`.                                             | `features/game/`                                  |
| **useAnimeSearch / useArtistSearch** | Local fuzzy autocomplete; artist mode uses a separate catalogue (`artist:get_all`).                         | `features/game/hooks/`                            |
| **gameReducer**                      | Client mirror of match state; merges server payloads (with lobby-config fallbacks for `videoMode`).         | `features/game/`                                  |
| **useLobbyController**               | Lobby actions (create/join, settings, `addBots`, ready). Socket listeners live in `useLobbySocketBindings`. | `features/hub/`                                   |
| **gameCopy**                         | Isolated French match strings (loading, leave dialogs, toasts).                                             | `features/game/copy/gameCopy.ts`                  |
| **hubCopy**                          | Isolated French hub strings (mode select, join list, password dialog, reset).                               | `features/hub/copy/hubCopy.ts`                    |
| **lobbyRulesCopy**                   | Pure builder turning live `RoomConfig` into French rules text (unit-tested).                                | `features/hub/components/lobby/lobbyRulesCopy.ts` |
| **VideoStage**                       | Renders the guessing clip per `VideoMode` (`hidden` / `blurred` / `peek`) + timer variants.                 | `features/game/`                                  |
| **useVideoPlayback**                 | Seek-before-play pipeline; clip cache keyed `videoKey:startTime`.                                           | `features/game/`                                  |
| **SoloMasteryBar / SoloScoreCard**   | Game-over medal UI; take `precision` so labels match server thresholds.                                     | `features/game/.../gameover/solo/`                |
| **adminCopy**                        | Isolated French strings for the staff console (tabs, presence, catalogue labels, HTTP fallbacks).           | `features/admin/copy/adminCopy.ts`                |
| **adminApi**                         | Typed fetch client for `/admin/*` REST (Bearer JWT), including audit + catalogue repair.                    | `lib/adminApi.ts`                                 |
| **dailyApi**                         | Typed fetch client for `/daily/*` (Quiz du jour).                                                           | `lib/dailyApi.ts`                                 |
| **socket.ts**                        | Singleton Socket.io client wired to Supabase auth.                                                          | `lib/socket.ts`                                   |

## Known pitfalls

- **CI typechecks the SPA** (`tsc -p tsconfig.app.json --noEmit`) with
  `strict: true`. Vite/SWC does not typecheck — a green `pnpm build` is not a
  type gate. Keep `noUnusedLocals` / `noUnusedParameters` off.
- **Do not import `apps/server` or `@aniquizz/database`.** Talk to the API over
  HTTP / Socket.io. ESLint `no-restricted-imports` enforces this.
- **`jsx-a11y` recommended is error.** Fix findings; don't disable the plugin to ship.
- **User-facing copy is French; code/comments English.** Keep strings isolated
  (e.g. `gameCopy.ts`, `hubCopy.ts`, `lobbyRulesCopy.ts`, `adminCopy.ts`) for future i18n — don't inline French in logic.
- **Design tokens only** — style via Tailwind semantic classes (`bg-primary`,
  `text-muted-foreground`) or `hsl(var(--token))`; reuse `.glass-card`,
  `.gradient-text`, `FOCUS_RING`, and `components/ui/` primitives. No hardcoded hex.
- **Separate value imports from `import type`.** Vite/SWC breaks when a runtime value
  (e.g. `normalizeVideoMode`) is pulled in via an `import type` block.
- **The server can omit newer `round_start` fields** (older deploy). The client merges
  `videoMode` from lobby config as a fallback — preserve that path when editing the reducer.
- **`VideoStage` max-height is `42vh`.** Do not add a bare Tailwind `landscape:` max-height —
  that query matches desktop monitors and flattens the clip. Phone-sideways tightening must
  also require a short viewport (`max-height: 500px`).
- **`/game` identity lives in `?roomId=`.** `parseGameNavState` reads the query first so a
  refresh can still `get_game_state`. Do not rely on `location.state` alone.
- **Public profile load failures use `profile:error`.** Do not navigate home on
  `friends:error` — add/block toasts must not abort `/profile/:userId`.
- **Favorite visibility is `profile:update_privacy` only.** Do not emit
  `showFavoriteSongs` on `update_profile_data`. The same event owns
  `allowFriendRequests` (Settings Social and the profile « Demandes » switch).
  Do not emit `friends:set_privacy` from the UI.
- **Guest `/profile` and `/play` store a same-origin returnTo** in sessionStorage
  (`authReturnTo.ts`) so login restores the deep link. Canonical `SeoHead` on
  profile uses the current pathname; keep `noindex`. Static `index.html` still
  ships `canonical` `/` — `stripUnmanagedCanonicalLinks` must drop that leftover
  on inner routes.
- **Socket.io does not auto-reconnect after `io server disconnect`.** Same-tab
  handshake overlap emits `session_replaced` then kills the first socket.
  Profile/friends, **Hub**, and **Lists** wait `subscribeWhenSocketReady` / `onceWhenSocketReady`
  (settle after `connect`) before pool stats, list status, and lobby mutators (`lobby:create`,
  `start_game`, join). `registerSessionReplacementReconnect` reconnects ghosts.
  Do not call `socket.connect()` from feature hooks — Auth owns the handshake.
- **Reset the clip cache on `phase === 'loading'`** so a solo replay in the same lobby
  gets fresh offsets; the reveal (`RevealSong` by `id`) must skip reload.
  `getVideoUrl` already treats `http(s)` keys as absolute — match/daily guessing
  locators may be Worker `/v/{token}` URLs, not `Anime-id-OPx.mp4`. Keep that
  Worker origin in `vercel.json` CSP `media-src` (and `connect-src`); otherwise
  Chrome blocks the clip with no picture and no sound. Reveal re-signs the token
  — `VideoStage` must not reset paint flags on that URL change or the player
  stays `opacity-0` (sound without picture).
- **Respect `prefers-reduced-motion`** (handled globally in `index.css`) — don't add
  animations that ignore it.
- Route entry points are lazy-loaded; keep the Suspense/prefetch pattern
  (`DelayedRouteFallback`, `routePrefetch`) intact to avoid loading flashes.
- **Quiz du jour has no resume.** `GET /daily/today` is metadata (`openAttemptId`
  while in progress, never a playable round). Opening `/daily` forfeits leftover
  rounds; play payloads come only from POST start/next/answer.
