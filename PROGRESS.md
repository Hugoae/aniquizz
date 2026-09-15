# Progress — AniQuizz

> Kept intentionally short (read on every onboarding). Detailed history is archived in
> [`docs/progress-archive/`](./docs/progress-archive/). Roadmap lives in [`PLAN.md`](./PLAN.md).

## Current phase: **Audit** · **v26.7 parked** (2026-09-15)

> **State:** 26.6 tagged `26.6` at `ed82c96`. This phase is the post-release audit: CI quality gates, a French feature-audit prompt, then one domain at a time. **Auth + Home is closed** (P1 + P2 + follow-ups). **Hub is closed** (P1 + P2 + follow-ups + logged-in create/launch settle). **Game is closed** (P1 + P2 + avatar Zod + VideoStage landscape hotfix + in-match pause/skip/F5 smoke). **Profile is closed** (P1 + P2 + logged-in smoke + carousel `aria-current`). **Library is closed** (P1 + P2 + logged-in likes/favorites smoke). **Settings is closed** (P1 + P2 + friend-request privacy unify + toaster/FAB + logged-in smoke). **Admin is closed** (P1 + P2). **Lists is closed** (P1 + P2; `PlayerAnimeList` drop parked). **Parked:** remaining `jsx-a11y` warnings (FriendsPanel and leftover warns) → dedicated cleanup then `error`; HIBP (Supabase Pro+); 26.7 pokédex. Feature-audit prompt now **requires** an end-to-end logged-in smoke (lens 10).

**26.1** shipped · **26.2** shipped · **26.3** shipped · **26.4** shipped · **26.5** shipped · **26.6** shipped

### Audit — method

Not a version bump. Walk the product after 26.6, encode the rules that already bit us, then audit each remaining feature with the same prompt.

| Piece                   | What it is                                                                                                                                                                                                                                                           |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Prompt**              | [`docs/agents/feature-audit.md`](./docs/agents/feature-audit.md) — French deliverable; 10 lenses (code, split, project rules, security, perf, logic, design/a11y, tests, **phone/responsive**, **SEO/alt/links**). Code/commits stay English.                        |
| **Earlier global pass** | 26.5 product-audit hardening (canvas `full-product-audit`, 10–11 Sept.): Mix scoring, `skip_round`, SongHistory RLS, votes, peek, join rate-limit, etc. Still recorded under 26.5 below. Daily / leaderboard / suggestions were audited in their own 26.4–26.6 work. |
| **This phase**          | Quality gates in CI (waves 1–2.6) · rewrite the feature prompt · Auth + Home · then Hub, Game, and the rest of the SPA.                                                                                                                                              |
| **Parked**              | Remaining `jsx-a11y` warns (FriendsPanel, …) · HIBP leaked-password · 26.7 · MatchEngine/`Game.tsx` over the soft cap (do not split getSyncState/finish unless that code is touched)                                                                                 |

**Feature queue:** Auth + Home ✅ → Hub ✅ → Game ✅ → Profile ✅ → Library ✅ → Settings ✅ → Admin ✅ → **lists** ✅ (P1 + P2). Skip domains already closed in 26.4–26.6 unless a neighbour audit surfaces a hole. Post-26.6 SPA audit queue is empty; do not start 26.7.

### Audit — quality gates ✅

Playbook and CI now match what `AGENTS.md` claimed. Shipped on `main` as `0b0685c` (ahead of origin until this push). Wave 2 remaining for toolchain: none. Do not disable `jsx-a11y` to ship; promote to error after a dedicated cleanup.

#### Wave 1

| Gate                       | What changed                                                                                                                                                                                                                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Playbook in git**        | Stopped ignoring `AGENTS.md`, `PLAN.md`, `PROGRESS.md`, `docs/agents/`. `.cursor/rules/` is tracked; the rest of `.cursor/` stays ignored. `SCHEMA-TARGET.md` and `docs/progress-archive/` stay local.                                                                                    |
| **Client `tsc`**           | `aniquizz-client` `typecheck` script (`tsc -p tsconfig.app.json --noEmit`). CI runs `pnpm typecheck` after Prisma generate. Wave 1 kept `strict: false`; wave 2.6 flipped it.                                                                                                             |
| **ESLint server + shared** | `eqeqeq` (null ignored), `no-explicit-any`, `no-floating-promises`. `requireAuth` / `guard` settle listener promises (Socket.io never awaits).                                                                                                                                            |
| **Zod mutators**           | `socketPayloads.ts`: `game:answer`, `update_room_settings`, `start_game`, `vote_pause`, `vote_skip`, `game:skip_round`, plus lobby create/join/kick/transfer/leave/toggle_ready. Invalid payload → generic `Requête invalide.` Settings patches still go through `normalizeRoomSettings`. |

#### Wave 2.1 — format

One mechanical Prettier pass, then the gate. No style debate in review.

| Gate                  | What changed                                                                                                                                  |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **`.prettierignore`** | Keep generated trees out of the check: `graphify-out`, Playwright artefacts, `skills-lock.json` (plus existing `dist` / `data` / migrations). |
| **CI**                | `pnpm format:check` after the English-code check, before lint.                                                                                |
| **Baseline**          | `pnpm format` on `**/*.{ts,tsx,js,jsx,json,md}` so a clone is green.                                                                          |

#### Wave 2.2 — package boundaries

ESLint `no-restricted-imports` so a stray import fails CI instead of rotting the monorepo.

| Package    | Forbidden                                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------------------- |
| **client** | `apps/server`, `aniquizz-server`, `@aniquizz/database`, `@prisma/client`, `express`, `socket.io` (use `socket.io-client`) |
| **shared** | `react`, `express`, Prisma, `@aniquizz/database`, Socket.io runtime (`socket.io` / `socket.io-client`)                    |
| **server** | `react`, `apps/client`, `aniquizz-client`                                                                                 |

Relative `../server` / `../client` paths are also blocked. `@aniquizz/shared` stays the only legal cross-app import. Zod remains allowed in shared.

#### Wave 2.3 — shared watch

The SPA aliases `packages/shared/src`; the server requires `dist/`. A sentence in AGENTS was not enough.

| Piece                   | What changed                                                                                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **shared `dev`**        | `tsc --watch --preserveWatchOutput` so `pnpm dev` rebuilds `dist/` on every edit. Shared `turbo.json` waits for `build` before watch (no two `tsc` on the same `dist/`). |
| **server `turbo.json`** | `dev` `dependsOn: ["^build"]` so nodemon starts after shared + database `dist/` exist.                                                                                   |
| **nodemon**             | Watches `packages/shared/dist` (500 ms debounce) and restarts the server.                                                                                                |
| **`pnpm dev:server`**   | `turbo run dev --filter=aniquizz-server --filter=@aniquizz/shared` so the watch runs with the server, not nodemon alone.                                                 |

#### Wave 2.4 — lovable-tagger

Dropped the Lovable `componentTagger` Vite plugin (`mode === 'development'` only) and the `lovable-tagger` dependency. Production build was already tagger-free.

#### Wave 2.5 — jsx-a11y warn

`eslint-plugin-jsx-a11y` recommended on the SPA, **warn** not error. CI stays green. Baseline: **14** `jsx-a11y` warnings (plus 27 existing react-refresh / exhaustive-deps).

| Rule                             | Count |
| -------------------------------- | ----- |
| `click-events-have-key-events`   | 3     |
| `no-autofocus`                   | 3     |
| `label-has-associated-control`   | 2     |
| `no-static-element-interactions` | 2     |
| `media-has-caption`              | 2     |
| `anchor-has-content`             | 1     |
| `role-has-required-aria-props`   | 1     |

Hottest files: `FriendsPanel`, `GameSidebar`, `PlayerCardBase`. Promote to error after a dedicated cleanup — not this pass.

#### Wave 2.6 — SPA strict + lint

Measured a global `strict: true` flip: **10** errors, all hub/game-over. Per-folder tsconfigs would have been weaker for the same work.

| Gate                    | What changed                                                                                                                                                                                                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`tsconfig.app.json`** | `strict: true`, `noFallthroughCasesInSwitch: true`. `noUnusedLocals` / `noUnusedParameters` stay false.                                                                                                                                                                |
| **Fixes**               | Duplicate JSX `key` spreads (`SettingChipItem`); `franchise: string \| null` in the anime prefix index; `checkWatchedPoolLaunch` accepts `undefined` stats; dead `players: []` before spread on `lobby:joined`; solo `GameConfig` vs `RoomConfig` on `PlayConfigPage`. |
| **Client ESLint**       | `eqeqeq` (`null` ignore) + `@typescript-eslint/no-explicit-any` as **error** (0 new findings). `no-unused-vars` stays off.                                                                                                                                             |

### Audit — Hub P1 ✅ (2026-09-14)

Canvas: `hub-feature-audit`. No P0. Server still owns join/start. P1 + P2 + follow-ups are closed.

| Item                       | What changed                                                                                                                                                                                       |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Join while playing**     | Shared `isLobbyOpenForNewPlayers` / `isRoomListJoinable`. `lobby:join` rejects new players unless `waiting` (reconnects still allowed). Room list CTA is `EN COURS` / disabled — no fake spectate. |
| **Config F5**              | Intent (+ edit `roomId`) lives in `/play/create?intent=…`. Refresh keeps solo vs create vs edit. Edit without a room id does not `lobby:create`. Socket rejoin runs if already connected.          |
| **Host actions on touch**  | `HOVER_REVEAL`: kick/transfer (and add-friend) stay `opacity-100` unless `(hover: hover)`. 36px tap targets.                                                                                       |
| **Socket listener rebind** | Hub socket effect binds once (`[]`). Identity/players/navigate live in refs so `game_started` is not dropped when `gameStatus` flips to `starting`.                                                |

### Audit — Hub P2 ✅ (2026-09-14)

| Item                      | What changed                                                                                                                                                                                       |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Partition**             | Socket listeners live in `useLobbySocketBindings`. Lobby chrome split into header / roster / footer / dialogs. Controller ~447 lines; `MultiplayerLobby` ~363.                                     |
| **Copy**                  | `hubCopy.ts`: `Solo de {pseudo}`, `Réinitialiser`, password dialog copy. Watched offline uses vousvoiement (`Lancez-le`).                                                                          |
| **Prefetch / poll**       | `DailyQuizCard` uses `routeIntentHandlers` (pointerdown). Hub `get_home_stats` only on `/play` mode-select. Pool hooks depend on `difficultyKey` / `typesKey`.                                     |
| **Auth list + Zod**       | `requireAuth` on `get_rooms` / `lobby:subscribe_list`. Zod create/join/kick/transfer/leave/toggle_ready. `roomName` / `password` length caps. Join catch emits `Impossible de rejoindre le salon.` |
| **Join / kick policy**    | Shared `evaluateLobbyJoin` / `canKickFromLobby`. Invites never skip the password. New players blocked while playing; returning players reconnect.                                                  |
| **start_game rate limit** | `guard(..., RATE_LIMITS.startGame)` — 5 / 10s.                                                                                                                                                     |
| **Responsive / design**   | Lobby `h-dvh` + safe-area. Chat `h-40 sm:h-48`. Mode select `min-h-dvh`. Password dialog description is no longer a label duplicate.                                                               |
| **Tests**                 | Shared join/kick + Zod schemas; lobby integration (normalize, password+invite, playing, kick, guest list); RoomList EN COURS/COMPLET; PlayConfig intent; pool-hook keys; `lobbySocketPolicy`.      |

### Audit — Hub follow-ups ✅ (2026-09-14)

Same shape as Auth + Home follow-ups: leftovers after P2, not a new severity wave.

| Item                        | What changed                                                                                                                                                                                  |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Copy leftovers**          | Toasts, SEO `/play`, fallbacks `Invité` / `Joueur` / `Salon de jeu` live in `hubCopy.ts`. SEO uses vousvoiement (`Configurez votre partie…`).                                                 |
| **SourceSection deps**      | Fallback auto-off effects keep `update` in a ref so eslint `exhaustive-deps` is clean without re-running on an unstable callback.                                                             |
| **Friends home_stats**      | Bubble still fetches once on connect. Interval poll only on `/` or while the panel is open — not every 10s on `/play` lobby.                                                                  |
| **`game:skip_round` Zod**   | Same `roomIdInputSchema` as `start_game` / votes. Neighbour Game hole closed so the mutating-event list matches AGENTS. `returnToLobby` / `cancelGame` / `get_game_state` closed in Game P1.  |
| **Left for Game / parking** | Controller still ~447 lines (cap ~400). `GameConfigForm` / `SourceSection` at the limit. 14 `jsx-a11y` warns. Logged-in lobby QA (tool cannot fill credentials). Landscape / physical iPhone. |

### Audit — Game P1 ✅ (2026-09-14)

Canvas: `game-feature-audit`. No P0. Server still owns score / skip / cancel. P2 is closed in the next section.

| Item                  | What changed                                                                                                                                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Zod match events**  | `game:return_to_lobby`, `game:cancel`, `get_game_state` go through `roomIdInputSchema` + `parseSocketPayload`. Missing payload emits `Requête invalide.` instead of throwing in `requireAuth`.                                  |
| **Return membership** | `Room.playerReturnToLobby` no-ops unless `players.has(userId)` — outsiders cannot pollute `returnedPlayers`.                                                                                                                    |
| **F5 `/game`**        | Identity in `/game?roomId=`. `parseGameNavState` prefers the query, then `location.state`. Hub `game_started` navigates with `gamePath`. Missing/invalid id shows `MissingGameRoom` (link `/play`) instead of infinite loading. |
| **Tests**             | `gameNavState` query/state; `Room.playerReturnToLobby`; `parseSocketPayload(undefined)`; anticheat integration missing payload on sync/return/cancel.                                                                           |

### Audit — Game P2 ✅ (2026-09-14)

Canvas: `game-feature-audit`. Game audit is **closed** (P1 + P2). Do not start 26.7.

| Item                  | What changed                                                                                                                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vote rate limits**  | `vote_pause` / `vote_skip` / `game:skip_round` use `guard(..., RATE_LIMITS.vote)` — 8 / 5s.                                                                            |
| **Chat Zod**          | `chat:sendMessage` parsed with `chatSendMessageInputSchema` (roomId + trimmed content, max 200). Membership + mute unchanged.                                          |
| **Copy**              | `gameCopy.ts`: loading, leave dialogs, toasts, config badges. Vousvoiement tests.                                                                                      |
| **Partition**         | Pool stats → `poolStatsHandlers.ts`. MatchEngine bots / reveal / vote helpers extracted. `Game.tsx` leave dialogs + loading overlay split out.                         |
| **Socket rebind**     | `useGameSocket` match subscription deps `[roomId]`; `currentUserId` / `isSolo` live in refs (solo skip recovery still never runs in multi).                            |
| **Reducer tests**     | SYNC lobby `videoMode` fallback; peekWindow kept when a later sync omits it; GAME_STARTED client fallback.                                                             |
| **a11y (Game-owned)** | Sidebar toggle 44px; player rows / `PlayerCardBase` only interactive when a click handler exists; loading `h1`; `media-has-caption` documented skip on the music clip. |
| **Responsive (CSS)**  | Match shell `safe-area-inset-*`; answer column `overflow-y-auto`; game-over `min-h-dvh`. Video stage stays `max-h-[42vh]` on desktop (bare `landscape:` crushed it).   |
| **handleAction deps** | `useCallback` lists `actions` so exhaustive-deps is clean.                                                                                                             |

**Left over on purpose:** `MatchEngine.ts` (~954) and `Game.tsx` (~430) stay above the ~400 soft cap. Extracting `getSyncState` / finish+XP without touching that code is not worth the coupling.

**Not in this pass:** FriendsPanel / remaining jsx-a11y backlog · HIBP · 26.7 · physical iPhone.

### Audit — Game follow-up ✅ (2026-09-14)

Hub Zod on `lobby:create` / `lobby:join` capped `avatar` at 64 chars. Custom avatars are Supabase public URLs (~137 chars). Solo « Lancer la partie » emits `lobby:create` with `profile.avatar`, so every uploaded-avatar account got `Requête invalide.` before `start_game` ran — independent of room settings.

| Item             | What changed                                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Avatar cap**   | `GAME_CONFIG.LIMITS.MAX_AVATAR_LENGTH` = 512. `createLobby` / `joinLobby` Zod use it. Tests: URL accepted, `userId` stripped, oversized rejected. |
| **Logged-in QA** | Blocked until this hotfix: guest `/game` still redirects to AuthModal. Pause/skip/F5/chat/iOS keyboard need a session after Render picks this up. |

### Audit — Game follow-up (layout) ✅ (2026-09-14)

P2 added `landscape:max-h-[min(28vh,11rem)]` on `VideoStage`. Tailwind `landscape:` is `(orientation: landscape)` — every desktop monitor matches, so the clip became a ~176px strip. Cap is now `max-h-[42vh]`, with a tighter `36vh` only when landscape **and** `max-height: 500px` (phone on its side). Safe-area + column scroll stay.

**Next:** Admin audit. Do not start 26.7.

### Audit — Profile P1 ✅ (2026-09-14)

Canvas: `profile-feature-audit`. No P0. Server still owns username / avatar URL / privacy writes / GDPR delete.

| Item                          | What changed                                                                                                                                                                                               |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Zod mutators**              | `update_profile_data`, `profile:update_prefs`, `profile:update_privacy`, `profile:delete_account` go through `socketPayloads.ts` + `parseSocketPayload`. Missing / empty / oversized → `Requête invalide.` |
| **Username cap**              | Server trims and caps at `MAX_USERNAME_LENGTH` (16). UI `maxLength` uses the same constant.                                                                                                                |
| **Rate limit**                | `update_profile_data` uses `guard(..., RATE_LIMITS.updateProfile)` — 8 / 10s.                                                                                                                              |
| **Public profile errors**     | `profile:get_public` failures emit `profile:error`. The public page no longer navigates home on `friends:error`.                                                                                           |
| **Privacy `everyone` invite** | Invalid `lobbyInviteAudience: 'everyone'` is rejected at Zod (no silent coerce).                                                                                                                           |

**Left for P2:** god files, copy isolation, guest returnTo, unbounded stats queries. **Not started:** 26.7. Library P1/P2 closed 2026-09-15.

### Audit — Profile P2 ✅ (2026-09-14)

Canvas: `profile-feature-audit`. Profile audit is **closed** (P1 + P2 + smoke). Do not start 26.7.

| Item                   | What changed                                                                                                                                                                                                                           |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Partition**          | `Profile.tsx` is a thin page. Data in `useProfilePage`; chrome in `ProfilePageShell` / unavailable / avatar / username / own menu / pokédex / achievements stub / pinned row. Pinned-favorites dialog uses `usePinnedFavoritesDialog`. |
| **Copy**               | `profileCopy.ts` — vousvoiement (toasts, delete, pokédex, favorites).                                                                                                                                                                  |
| **Guest returnTo**     | `ProtectedRoute` stores a same-origin path (`authReturnTo.ts`). After login, `App` consumes it. `/profile` and `/play` deep links survive the auth modal.                                                                              |
| **Career queries**     | Match multi/solo/playtime via SQL (`profileMatchCareer.ts`). Daily career from Prisma aggregates + `summarizeDailyCareerFromAggregates` — no `findMany` of every finished match/attempt into Node.                                     |
| **Unavailable public** | Missing user id returns `unavailablePublicProfile` (no `computeRichStats` throw). Client shows `ProfileUnavailable`, does not navigate home.                                                                                           |
| **Tests**              | View-model, returnTo, copy, socket-ready, canonical strip; mutators / cascade / privacy unknown-id integration.                                                                                                                        |

**Not in this pass:** FriendsPanel jsx-a11y · HIBP · 26.7 liked-songs playlist (spec only in `PLAN.md`).

### Audit — Profile follow-up (logged-in smoke) ✅ (2026-09-14)

First audit domain walked signed-in in the browser (`admin_dev` on local Vite + server). Auth/Home/Hub/Game used guest UI, CSS viewports, and unit/integration tests. Hub parked "Logged-in lobby QA (tool cannot fill credentials)". Game logged-in pause/skip/F5/chat is still open.

Socket.io does not auto-reconnect after `io server disconnect`. A same-tab overlapping handshake (`connect` → `session_replaced` → kill) dropped `profile:get_stats` / `friends:list` / `profile:get_public` on the dying socket. Stats stayed on `INITIAL_OWN_PROFILE_STATS` (pokédex « Total disponible : 0 ») while XP in the header still came from Auth.

| Item                   | What changed                                                                                                                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Settle + reconnect** | `subscribeWhenSocketReady` waits 80 ms after `connect` and emits only if still connected. `registerSessionReplacementReconnect` calls `connect()` for same-tab ghosts. Feature hooks never own handshake. |
| **Friends spinner**    | Snapshot request on the live socket; 8 s timeout clears `loading` if `friends:state` never arrives.                                                                                                       |
| **Canonical leftover** | Static `index.html` canonical is `/`. `SeoHead` + `stripUnmanagedCanonicalLinks` leave a single `https://aniquizz.com/profile` (Helmet `data-rh`).                                                        |
| **Browser**            | Own `/profile`: pokédex denominator 3002, friends list (not infinite spinner). Unknown UUID: « Profil indisponible » without home redirect. `/play` → solo config still works signed-in.                  |

**Next:** Admin audit. Optional later: Hub/Game logged-in smoke with the same test account. Do not start 26.7.

### Audit — Library P1 ✅ (2026-09-15)

Canvas: `library-feature-audit`. No P0. Identity stays JWT `userId`. Browse stays HTTP (`optionalAuth` / `requireRole`). Server still owns likes / pins / playable `COMPLETED`.

| Item                 | What changed                                                                                                                                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Deep-link page**   | `nextDebouncedLibraryQuery` only `setPage(1)` when the trimmed `q` actually changes. Initial query is set from the URL (no 300 ms wipe). Smoke: `/library?view=songs&page=3` stays page 3, `aria-current` 3.                         |
| **Likes race**       | `mergeLikedIdsFromServer` keeps in-flight optimistic ids. GET `/likes/ids` errors no longer empty the set. `resolveSongLikedState` does not fall back to `initialLiked` while a toggle is pending. Undo re-likes via `likeSong`.     |
| **Personal filters** | Shared `libraryBrowseNeedsActor`. Client waits `authReady` before fetching liked/discovered. Without an actor the server returns an empty page (not the 3002-song catalogue). Guest `?liked=liked` drops the filter after authReady. |
| **Skip link**        | Library `<main id="main-content" tabIndex={-1}>`. Skip « Aller au contenu principal » focuses the catalogue.                                                                                                                         |

**Left for leftover P2:** (closed 2026-09-15 follow-up) nested cap, unlike COMPLETED, 429 likes, prerender copy, phone viewport. **Not started:** 26.7.

### Audit — Library P2 ✅ (2026-09-15)

Canvas: `library-feature-audit`. Library audit is **closed** (P1 + P2 + logged-in smoke). Do not start 26.7.

| Item                 | What changed                                                                                                                                                                                                                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Copy / i18n**      | Remaining FR strings in `LIBRARY_COPY` (`retry`, `backHome`, pagination, preview Pause/Fermer, `filtersAria`, `animeSongCount`, `typeInsert`, `emptyPersonalHint`). `HTTP_AUTH_ERROR.missingBearer` in French. Dialog close: `Fermer`.                                                                                   |
| **Partition**        | URL parse / debounce / `pageHref` in `libraryBrowseParams.ts`. Hook ~407 lines (was 421). `libraryTree` popularity no longer loads every franchise in JS (~409). `routes/library.ts` ~351. TreeView / Filters stay under the soft cap.                                                                                   |
| **Popularity SQL**   | Tree `sort=popularity` uses `Franchise.maxPopularity` `orderBy` + skip/take. Nested songs capped at `MAX_NESTED_SONGS_PER_ANIME` (24) with honest `songCount` + « N sons de plus » link.                                                                                                                                 |
| **Likes read / ids** | `library:read` rate limit on GET likes/ids and pinned. `getLikedSongIds` filters `COMPLETED` and caps at `MAX_LIKED_IDS` (5000). Pin of a song that is not liked → `NOT_FOUND` → HTTP 400.                                                                                                                               |
| **A11y / UX**        | Like `sm` target 36px (`h-9`). Pagination page numbers are real `/library?...` hrefs. Drawer chrome uses `bg-background`. INSERT chip in type filters.                                                                                                                                                                   |
| **SEO**              | `stripUnmanagedSeoMeta` drops leftover Home description / og:title. `collectionPageJsonLd` on `/library`. Description = `LIBRARY_COPY.heroSubtitle`.                                                                                                                                                                     |
| **Tests**            | Shared `libraryBrowseNeedsActor` + `capNestedSongs`. Client debounce/page href + likes merge + SEO strip + prerender copy ≡ heroSubtitle. Server empty personal browse. Integration: guest liked empty, 401 FR, JWT liked-only, unknown like 404, pin-not-liked 400, nested cap, unlike non-COMPLETED 404, PUT like 429. |

**Browser (admin_dev, localhost:8083):** page=3 holds; skip focuses `#main-content`; like stays « Retirer des favoris » after ~2.6 s; `/library?liked=liked` shows 4 songs (not 3002). Guest like still opens AuthModal. Follow-up: One Piece nested list caps at 24 + « 28 sons de plus »; PUT like burst → 429 `Trop de requêtes.` ; 390×844 overflowX false, like 36px, first anime row ~666px (was below the fold); landscape 700×400 overflowX false. Compact hero + hide stats under `md`.

**Not in this pass:** jsx-a11y backlog · HIBP · 26.7 · physical iPhone (emulation only). Prod prerender `/library` still has the pre-inserts sentence until the next client deploy.

### Audit — Library follow-up (animeId, row hit, prerender, like, virt) ✅ (2026-09-15)

Canvas: `library-feature-audit`. Nested cap 24 stays. Do not start 26.7.

| Item                     | What changed                                                                                                                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **See-all `animeId`**    | `libraryAnimeSongsHref(id)` → `/library?view=songs&animeId=N`. URL builder prefers `animeId` over `q`. Typing a new search clears the id. Songs page size 96 for one anime (`LIBRARY_ANIME_SONGS_PAGE_SIZE`). |
| **Anime row hit target** | Vue Anime: whole header is the expand button (`min-h-11`, ~768×65). Tree already had a full-width row; added `aria-label` + `min-h-11`.                                                                       |
| **Prerender from copy**  | `scripts/library-copy.mjs` reads `heroTitle` / `heroSubtitle` from `LIBRARY_COPY`. `prerender-routes.mjs` no longer duplicates the sentence.                                                                  |
| **Concurrent like**      | `createMany({ skipDuplicates: true })` then increment `likeCount` only if inserted. No P2002 on overlapping PUT.                                                                                              |
| **Virtual songs view**   | `LibrarySongsGrid` uses `VirtualScroll` (threshold 12, `min(70dvh, 48rem)`). Tree still caps nested songs at 24.                                                                                              |

**Browser:** One Piece row click expands. See-all href `/library?view=songs&animeId=21`. Songs view: 52 found, no `q`, ~11 DOM rows (virtualized). Integration: `GET /library/songs?animeId=` only that anime; likes 429 suite still green.

**Next:** Admin audit. Do not start 26.7.

### Audit — Settings P1 ✅ (2026-09-15)

Canvas: `settings-feature-audit`. Overlay, not `/settings`. Identity stays JWT `userId`. Prefs = `profile:update_prefs` + localStorage v2. Privacy = `profile:update_privacy` (Zod). No P0.

| Item                        | What changed                                                                                                                                                                                                                                                            |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Guest login keeps local** | Guest → account no longer hydrates the profile snapshot over this device’s comfort prefs. `wasGuestRef` / `keepLocalOnAccountRef` / `skipAccountHydrateRef` push local (`profile:update_prefs`) instead. Test: guest volume 70 + mute vs account 20 → stay 70 and sync. |
| **Prefs ACK**               | `pending` stays until `profile:prefs`. Sync/rate-limit `error` rolls back to `lastAcked` (except while still pushing guest-local) and toasts `SETTINGS_COPY.prefsSyncError`.                                                                                            |
| **Friend-request Zod**      | Legacy `friends:set_privacy` parses `friendPrivacyInputSchema` (`allow: z.boolean()`, fail-closed). Empty payload no longer re-opens requests. UI no longer emits that event (see follow-up).                                                                           |

### Audit — Settings P2 ✅ (2026-09-15)

| Item              | What changed                                                                                                                                                                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Copy / i18n**   | Remaining FR chrome in `SETTINGS_COPY` (open/close/panel, legal, Annuler, sign-in CTA). Match `GameTopBar` aria-label uses the same open string.                                                                                              |
| **A11y**          | FAB `role=dialog` + `aria-modal` when open. `cycleTabWithin` traps Tab/Shift+Tab. Mute `h-9 w-9` (36px). Tabs `h-12`. `useMotionReduced` extracted (clears react-refresh on the provider). PrefVolumeVideo caption eslint same as VideoStage. |
| **FAB surface**   | One `FloatingSettingsButton` in `App.tsx`. Removed per-page FABs (Home, Hub, Profile, PlayJoin, ProfileUnavailable). `suppressFloatingSettings` on `/game` and DailyPlay so the match/daily overlay keeps its own panel.                      |
| **Guest CTA**     | `SettingsSignInHint` opens AuthModal from Général (copy already said to sign in).                                                                                                                                                             |
| **Safe-area**     | FAB `bottom/right: max(1.5rem, env(safe-area-inset-*))`. Panel `max-h` accounts for the header on short landscape.                                                                                                                            |
| **Privacy ACK**   | `profile:privacy` + `error` + 8 s timeout; toast + `refreshProfile` on failure.                                                                                                                                                               |
| **Rate limit**    | `RATE_LIMITS.updatePrefs` 24 / 10 s (700 ms debounce ≈ 14 emits).                                                                                                                                                                             |
| **Single import** | `SettingsPrivacySection` one React import.                                                                                                                                                                                                    |

### Audit — Settings follow-up (privacy unify, toaster, smoke) ✅ (2026-09-15)

| Item                      | What changed                                                                                                                                                                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`allowFriendRequests`** | Settings Social + profile « Demandes » emit `profile:update_privacy` only. Deleted `SettingsFriendRequestsRow`. `profile:update_privacy` also pushes `friends:state` so FriendsPanel stays in sync. `friends:set_privacy` stays a Zod server alias and emits `profile:privacy`. |
| **Toaster vs FAB**        | Sonner `offset` / `mobileOffset` `{ bottom: 96 }` so toasts sit above the 56px FAB.                                                                                                                                                                                             |
| **Tests**                 | Shared `friendPrivacyInputSchema` fail-closed. Client `cycleTabWithin` wrap. Integration: `profile:update_privacy` patches `allowFriendRequests`.                                                                                                                               |
| **Docs**                  | Client CONTEXT: UI must not emit `friends:set_privacy`. Server CONTEXT + AGENTS: alias remains Zod-parsed.                                                                                                                                                                      |

**Browser (admin_dev, localhost:8080 + API :3001):** guest volume 40 survives login (slider `aria-valuenow` 40). Tab from « Fermer les paramètres » wraps to Général (`wrapped: true`). Hide « titres favoris » → own profile **Masqué**; guest `GET /library/users/00000000-0000-4000-8000-000000000001/favorites` `{ visible: false }`. Restored public favorites after the check.

**Not in this pass:** jsx-a11y backlog · HIBP · 26.7 · physical iPhone (emulation only).

**Next:** Admin audit. Do not start 26.7.

### Audit — Admin P1 ✅ (2026-09-15)

Canvas: `admin-feature-audit`. HTTP `/admin/*`, not a socket channel. Identity stays JWT `userId`. No P0. P2 (god files, copy, rate limit, a11y) not started.

| Item                     | What changed                                                                                                                                                                     |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Owner lock on role**   | `PATCH /admin/users/:id/role` now calls `guardProtectedTarget` (same as mute/ban/kick). Self-role stays 400.                                                                     |
| **Confirm before PATCH** | Role `<select>` opens the existing AlertDialog (`Changer le rôle de … ?`). Controlled value snaps back until confirm.                                                            |
| **Tests**                | Unit `isProtectedProfile` (kirikou). Integration: self 400, kirikou 403, disposable USER→MODERATOR 200 then delete. Client: select does not call `setRole` until pending action. |
| **Docs**                 | `docs/admin/moderation.md` — role change is an owner-protected action.                                                                                                           |

**Browser (admin_dev):** artus USER→MODERATOR → dialog → Annuler, still USER. Kirikou ADMIN→USER → Confirmer, still ADMIN (403).

**Next:** Admin P2 if asked. Do not start 26.7.

### Audit — Admin P2 ✅ (2026-09-15)

Canvas: `admin-feature-audit`. Admin audit is **closed** (P1 + P2). Do not start 26.7.

| Item                         | What changed                                                                                                                                                                                                         |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Self mute/ban/disconnect** | Server 400 `Vous ne pouvez pas appliquer cette action à votre propre compte.` UI already disabled mute/ban; disconnect is now disabled for `isSelf`. Mute integration tests mute a disposable player, not admin_dev. |
| **Rate limit + bulk cap**    | `/admin` staff routes consume `HTTP_RATE_LIMITS.adminStaff` (90/min per JWT). `POST /catalogue/songs/bulk` `ids.max(200)`. `claim-admin` is not in that bucket.                                                      |
| **Owner emails / claim**     | `PROTECTED_ACCOUNT_EMAILS` CSV in env (username `kirikou` stays in code). `ALLOW_DEV_CLAIM_ADMIN=true` required with `NODE_ENV !== production` for first-admin bootstrap.                                            |
| **Partition**                | `adminRoutes` split (user/room/catalogue/stats/playlist/dev/daily + `adminHttp`). `adminService` split (user/stats/catalogue). Client: `UsersPagination`, `StatsMatchesChart`, `adminCopy`.                          |
| **Copy / tokens / a11y**     | `adminCopy.ts` (Mute→Muet, In game→En partie, Dev Tools→Outils dev, PENDING/EASY labels). Chart fills `hsl(var(--primary))`. `DailySongSearch` `aria-selected`; room chips keyboard; Dev Tools switch labelled.      |
| **Nav / SEO / polls**        | Header Admin is a real `Link` (min 36px). Tabs `?tab=` allowlist. Users list starts `loading`. Users/Stats/Rooms polls pause when `document.hidden`. Banned/muted counts folded into `listUsers`.                    |
| **Errors / SEO**             | Removed unused `GET /me` + `adminApi.me`. French generic admin errors. Staff `SeoHead` description; unmanaged JSON-LD stripped on `noindex`.                                                                         |

**Browser (admin_dev):** `/admin?tab=users` — Header Admin is a `Link`; Retour accueil is a `Link`; self mute/ban/disconnect disabled; labels Muet / Bannir / Outils dev. Tabs write `?tab=rooms|stats|dev`. Meta description is staff copy; JSON-LD count 0. Switch « Boucle (soak) » labelled. No mute/ban/reset/seed.

**Next:** Staff operator console (audit journal, repair queue, spectator). Do not start 26.7.

### Admin — staff operator console ✅ (2026-09-15)

Follow-up to the Admin audit (P1 + P2). Do not start 26.7.

| Item                 | What changed                                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Journal d’audit**  | `StaffAuditLog` (mute / unmute / ban / unban / rôle / déconnexion). `GET /admin/audit`. Tab Journal. Usernames snapshotted; RLS server-only.                       |
| **File catalogue**   | `GET /admin/catalogue/repair` — ERROR, vidéo manquante (PENDING/PROCESSING/SKIPPED), lock oublié (son non locké sous parent locké). Clic → `?tab=catalogue&song=`. |
| **Spectateur salon** | `GET /admin/rooms/:id` + clip (videoKey, offset) + scores. Dialog lecture seule, sans join socket.                                                                 |
| **MODERATOR borné**  | Catalogue PATCH/bulk/anime/franchise writes → ADMIN. UI: pas d’édition catalogue, pas de Reset (déjà ADMIN). Playlists / daily / dev déjà masqués.                 |
| **Recherche UUID**   | `listUsers` exact id (filtre ignoré). Placeholder « pseudo, email ou identifiant ». Journal → clic cible ouvre `?tab=users&user=`.                                 |

**Browser (admin_dev):** Journal lists mute/role from tests; catalogue « À réparer » (2 missing video) → `?song=11215` focuses Pride of Tomorrow; users `?user=` UUID returns only admin_dev. Spectateur not clicked (0 live rooms). No mute/ban/reset/seed.

### Audit — Game in-match smoke ✅ (2026-09-15)

Logged-in `admin_dev` on local Vite `:8080` + API `:3001`. Closes the pause / skip / F5 hole left after Game P2. Canvas: `game-feature-audit` (smoke also copied on `lists-feature-audit`).

| Result    | What                                                                                                                                                                                                  |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pause** | PASS — guessing vote → « Pause en fin de round » → Reprendre overlay → next guessing.                                                                                                                 |
| **Skip**  | PASS — reveal « Suivant » `vote_skip` 13:27:47 UTC round 10 → 11 (`Toilet-bound Hanako-kun` → `Kemono Jihen`).                                                                                        |
| **F5**    | PASS — reload `/game?roomId=BF11UO` restored round 12/20 guessing.                                                                                                                                    |
| **Chat**  | PARTIAL — solo has no sidebar (by design). Lobby + 1 bot (`DEDZJZ`): « smoke chat lobby » + `chat:sendMessage`. In-match Chat tab opened; send not confirmed (match ended).                           |
| **Note**  | JWT ~1 h: SPA still showed logged-in while socket got `Rejected socket with invalid token`. Relogin + Home settle required before `lobby:create`. Socket.io does not auto-reconnect after disconnect. |

Do not start 26.7.

### Audit — Lists (findings only) ✅ (2026-09-15)

Canvas: `lists-feature-audit`. No P0. **No patch** until asked. Identity stays JWT `userId`. Status on Profile usernames + in-memory AniList/MAL caches (`PlayerAnimeList` unused at runtime). Overlay Paramètres → Compte, not `/settings`.

| Sev | Finding                                                                                                                                                                                                                                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | `lists:link` / `set_active` / `refresh` / `unlink` have no Zod `parseSocketPayload`. Username after normalize is uncapped (`Profile.anilistUsername` / `malUsername` are unbounded `String`). Same class as pre-Settings `friends:set_privacy`.                                     |
| P2  | `verifyAnilistUser` / MAL `unverified` still persist a link. `listHandlers.ts` 448 lines. Tu vs vousvoiement. `ListsContext` skips `subscribeWhenSocketReady`. `get_status` drops `animeCount`. Dead `PlayerAnimeList`. Watched pool `requireAuth` without `RATE_LIMITS.poolStats`. |

**Browser (admin_dev):** AniList stays unlinked after fake username `aniquizz_no_such_user_xyz`. MAL `Hugo_ae` sync 15:42:39 → 196 catalogue animes (254 MAL entries). Own `/profile` badge `Hugo_ae · Source active`. First Watched after `/play` nav: false « serveur :3001 » (`session_replaced`). Retry: **129 sons / 196 animes**, Lancer enabled. 390×844 and 700×400: `overflowX` false; list buttons 36 px. Did not unlink `Hugo_ae`. No dual-link `set_active`.

**Follow-up:** P1 + P2 closed in the next two sections. Do not start 26.7.

### Audit — Lists P1 ✅ (2026-09-15)

Canvas: `lists-feature-audit`. No P0. Identity stays JWT `userId`. Overlay Paramètres → Compte, not `/settings`.

| Item             | What changed                                                                                                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Zod mutators** | `listLinkInputSchema` / `listProviderOpInputSchema` in `socketPayloads.ts`. Handlers `parseSocketPayload` on `lists:link` / `set_active` / `refresh` / `unlink`. Invalid → generic `Requête invalide.` |
| **Username cap** | Raw input ≤ 200 (`MAX_WATCHLIST_USERNAME_INPUT_LENGTH`, MAL URL paste). Normalized handle ≤ 64 (`MAX_WATCHLIST_HANDLE_LENGTH`) before Prisma. Dialog `maxLength` 200.                                  |
| **AGENTS**       | Mutating-event list includes `lists:link` / `set_active` / `refresh` / `unlink`.                                                                                                                       |
| **Tests**        | Shared: URL paste, bogus provider, oversized username/`requestId`. Integration: invalid `lists:set_active` does not write.                                                                             |

**Next:** Lists P2 (closed in the next section). Do not start 26.7.

### Audit — Lists P2 ✅ (2026-09-15)

Canvas: `lists-feature-audit`. Lists audit is **closed** (P1 + P2). Do not start 26.7. Do not drop Prisma `PlayerAnimeList` in this pass.

| Item                        | What changed                                                                                                                                                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Persist only `exists`**   | `listLinkRejectMessage`: `unverified` / `not_found` / `unconfigured` → `lists:error`, no Profile write. AniList JSDoc matches.                                                                                                                               |
| **Partition**               | `listHandlers.ts` 289 lines. Extracted `listLinkVerify.ts`, `listPublish.ts` (queue, sync, publish).                                                                                                                                                         |
| **Vousvoiement**            | Server: « Liez… », « Vérifiez… », « Un pseudo est requis. ». `SETTINGS_COPY` listServerOffline/Timeout. Hub `PLAYLISTS_COPY.loadErrorOffline`.                                                                                                               |
| **`get_status` counts**     | `peekCachedCatalogues` (AniList gate + `peekMalListCache`) — no extra remote fetch. Both providers can show `animeCount`.                                                                                                                                    |
| **Reconnect / a11y / pool** | `ListsContext` waits `subscribeWhenSocketReady`; spinner clears if `!connected && !active`. Watched offline only if `!connected && !active`. `guardSilent` + `RATE_LIMITS.poolStats` on watched + catalogue. Watchlist dialog `Label` + `DialogDescription`. |
| **Parked**                  | `PlayerAnimeList` still unused at runtime — drop later, not a P1.                                                                                                                                                                                            |

**Browser (admin_dev, :8080 + :3001):** Compte — AniList stays **Non lié** after `aniquizz_no_such_user_xyz`; dialog `Pseudo` + hint. MAL `Hugo_ae · Source active`. Did not unlink. Did not click Synchroniser. Hub Watched after `/play/create?intent=solo`: true socket-offline (JWT stale), vousvoiement « Lancez-le avec pnpm run dev », Lancer disabled — not the false `session_replaced` alert. Relogin for a live pool count was not done in this pass.

**Next:** Post-26.6 feature-audit queue is empty. Do not start 26.7.

### Audit — logged-in smoke Auth + Home + Hub + Game (2026-09-14)

Canvas: `auth-hub-game-smoke`. Account `admin_dev` on local Vite + server. Feature-audit prompt lens 10 (smoke e2e) added in `docs/agents/feature-audit.md`.

| Result      | What                                                                                                                                                                                                                   |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **OK**      | Logout → AuthModal. Guest Jouer → login → `/play`. News, Admin, settings, friends bubble, Home 390px + 700×400, join list, F5 `intent=create`.                                                                         |
| **P1**      | Hub « Créer le salon » / « Lancer la partie » stay on the form. No server `lobby:create`. Catalogue pool stuck on Analyse…. Same ghost-socket class as profile stats; Hub hooks do not use `subscribeWhenSocketReady`. |
| **Skipped** | In-match pause / skip / F5 / chat — never reached `/game`.                                                                                                                                                             |
| **P2**      | Skip link click hit the fixed header. Pool a11y “son s”. Profile carousel pages all `aria-current`.                                                                                                                    |

### Audit — Hub logged-in P1 + P2 hotfix ✅ (2026-09-14)

Same ghost-socket class as profile stats. Hub pool hooks and lobby mutators now wait `subscribeWhenSocketReady` / `onceWhenSocketReady` (80 ms settle, no `connect()` from Hub). Skip link is `fixed z-[200]` (not `sr-only` under the header). Pool card hides the unit while the count is `…`. Carousel dots use `aria-current="page"` only on the active page.

Do not start 26.7. Next: Admin audit (or Game logged-in pause/skip/F5/chat after a match actually starts).

### Audit — Auth + Home ✅ (2026-09-14)

Canvas: `auth-home-feature-audit`. No P0. Scores after fix: Auth security/logic 8.5 · Home perf/design 8.5 · tests 7.5. Already industrial (kept): JWT `getUser`, Prisma role/ban, guest vs `INVALID_TOKEN` vs `BANNED`, RLS Profile own, `SeoHead` + JSON-LD + prerender, Ko-fi `noopener`, SkipLink, design tokens.

#### P1

| Item                    | What changed                                                                                                                                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Profile fetch race**  | `createProfileFetchGate` in `profileFetchGate.ts`. Generation counter; skip duplicate SELECT. `TOKEN_REFRESHED` must not refetch/retry.                                                                                                           |
| **Header skeleton**     | `headerAuthSlot`: `'loading' \| 'profile' \| 'degraded' \| 'sign-in'`. Failed Profile SELECT no longer looks like logged-out. `/profile` own-load failure has retry UI.                                                                           |
| **Socket display name** | `resolveAuthenticatedUsername` / `resolveLobbyUsername` in `displayUsername.ts`. `authMiddleware` loads `username`; rename updates `socket.data.username`. Authenticated lobby **ignores** the client-sent username. Identity stays JWT `userId`. |
| **Home short viewport** | Outer `h-[100dvh] overflow-hidden`; `<main>` `flex-1 min-h-0 overflow-y-auto`; inner `my-auto`. Header stays `fixed` (`pt-16`). Short / landscape can reach CTAs and news.                                                                        |

#### P2

| Item                  | What changed                                                                                                                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Home news bundle**  | `newsTypes.ts` + slim `latestNewsPreview` (no `content`) so eager `/` does not pull `newsData.ts`. `NewsSection` reads the preview only.                                                                                                          |
| **Dead badge**        | Deleted `HomeNewBadge.tsx` and `.home-new-badge*` CSS.                                                                                                                                                                                            |
| **Home CTAs + news**  | Copy in `HOME_COPY`. Hero CTAs and news cards are `<Link>` via `Button asChild` (middle-click). `findHomePlayCta` prefers `a[href="/play"]` (shell dismiss still needs Jouer ≥ 56px, flex, non-transparent bg).                                   |
| **SuspensionBadge**   | `setInterval` only while ban/mute is active.                                                                                                                                                                                                      |
| **Passwords**         | Shared `isPasswordValid` in `passwordPolicy.ts`. AuthModal uses `PasswordField`. Signup validates full complexity, not HTML `minLength={8}` only.                                                                                                 |
| **Auth errors**       | `mapAuthErrorMessage` — never return raw English Supabase strings.                                                                                                                                                                                |
| **`/reset-password`** | `resolveResetPasswordAccess`: a normal logged-in visit → `already-signed-in` (go to `/profile`), not the recovery form without the current password. Module-level `passwordRecoverySignal` in `supabase.ts` so `PASSWORD_RECOVERY` is not missed. |

#### Follow-ups (after P1/P2)

| Item                      | What changed                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Single-source teasers** | `allNews` is canonical. `scripts/news-teasers.mjs` (`pnpm --filter aniquizz-client sync:news`) writes `newsPreview.ts` and patches `index.html` app-shell (version + two cards, `<!--app-shell-news-->` markers). Vite plugin runs on `dev`/`build`; prerender `/news` uses the same parser. Test: preview ≡ `allNews.slice(0, 2)` and `sync:news --check`. For v26.7: add the article, bump `SITE_VERSION`, run `dev` or `sync:news`. |
| **Honest degraded chip**  | Profile SELECT failure: no XP conic ring, no fake level 1. Label « Profil indisponible » (dashed border). Session name is avatar initials only. Click retries and opens `/profile`.                                                                                                                                                                                                                                                    |
| **AuthModal copy**        | Titles, toasts, fields, switch, legal strings live in `authCopy.ts` (`AUTH_COPY.modal.*`).                                                                                                                                                                                                                                                                                                                                             |
| **Touch prefetch**        | `routeIntentHandlers`: `pointerenter` + `focus` + `pointerdown` on Home CTAs (Jouer also warms `dailyApi.today()`). `warmLikelyRoutes` still idles play + profile.                                                                                                                                                                                                                                                                     |

**Not in this pass:** Hub audit · jsx-a11y backlog · HIBP · 26.7.

**Next:** Hub feature audit with the French prompt (phone + SEO lenses). Do not start 26.7.

### 26.6 — Quiz du jour ✅

Five globally identical songs per Paris day. Not a `Match`: no `gamesPlayed` / wins / guesses / win streak. Heard clips upsert `SongHistory` (pokédex). Doc: `docs/game/daily-quiz.md`.

| Surface             | What shipped                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Contract**        | QCM, precision anime, one official attempt. Play clock is **per round** (15s guess + 15s reveal), not a 15-minute budget. Leave / refresh / tab close **forfeits** remaining rounds (no resume). `GET /daily/today` does not start the next song. Midnight `Europe/Paris`. Launch **#1 = 2026-09-15**. No medals, no match points, no share card.                                                                                                                                                                                                                                                                                  |
| **Score**           | Found `/N` (usually `/5`). Recap victory from 3 found (`DAILY_WIN_MIN_CORRECT`). Ranking: correct desc, then cumulative response time (`1-2-2-4`). Daily has no points.                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Streak / XP**     | Dedicated `DailyPlayerStats` (including `0/5`). XP once: `3` × active songs + `12` per correct + `20` on victory + `10` perfect (15 at 0/5, 105 at 5/5).                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Public**          | `/daily` landing (rules, streak, leaderboard before play), QCM on `StandardGameLayout`, reveal likes (catalogue id, same `SongLikeButton` as solo/multi), recap, profile history merge (`kind: 'daily'`).                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Play loop**       | HTTP only. `GET /today` does not return a playable round. Guessing never leaks title/anime. Player may change the QCM until the visual 15s (Standard margins). Clip start is random (`guess + reveal + 2s` tail).                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Generation**      | Rolling 14-day horizon. Mix 2 easy / 2 medium / 1 hard, OP/ED 3+2 alternating, popularity bands, franchise uniqueness + lookbacks, documented relaxation. Slim OP/ED pool cached ~15 min.                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Admin**           | Horizon review. Replace song. Shuffle: uniform **franchise** then OP/ED, downweight high AniList popularity (not the first catalogue ids). « Nouveau passage » re-rolls clip start. Search uses library matching + type tokens (`bleach ED5`). Suggestions portal + flip **above** the field when there is no room below. Lineup warnings (dup franchise, missing video, recent song/franchise, mix). Void a **live** broken round (today, after first attempt). Reset a player’s **today**: delete attempt + answers, revert XP/level, rewind daily streak/completions **and pokédex rows from that run**, recompute day’s ranks. |
| **Search (shared)** | `parseCatalogueSearchQuery` strips `OP`/`ED`/`ED5`/`opening 3` from library, daily admin, and suggestion song search. Standalone `in` is never INSERT.                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

**Decisions:** forfeit-on-leave over resume · recap victory ≠ medals · leaderboard public before you play · admin shuffle must not lock to mainstream openings · likes at reveal only.

### 26.6 — Pokédex musical ✅

Daily heard clips upsert `SongHistory` (started rounds only; leftover forfeit skips). Match `game_over` uses the same rule (`matchHeardSongIds` from recorded + in-progress clips, not the leftover playlist). Admin daily reset rewinds those rows. Profile / leaderboard / admin counts filter `COMPLETED` songs. Collection medals on the profile use design tokens (`text-medal-bronze` / `text-silver` / `text-warning` / `text-aqua`), not hex.

**Next after this release:** 26.7 in `PLAN.md` (found bar on the profile pokédex; heard / found playlists).

**Known nits (non-blocking):** admin reset can decrement `longestStreak` when today only _tied_ an older record; mid/low popularity bands can still surface well-known titles.

### 26.6 — artist precision ✅

`Precision` includes `'artist'`. Product chose **Artiste**, not song title (title + OP/ED sequence → 26.x+ backlog). Doc: `docs/game/artist-precision.md`.

| Surface                      | What shipped                                                                                                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Answers**                  | Typing: any billed `artistNames` unit + full display as extra free-type. Title/anime never count. Unicode via `answerIdentityKey`.                                          |
| **QCM / Duo / autocomplete** | Billed units only (atomic comma-in-name bands stay one label). Correct QCM = first billed unit. Same-song units excluded from distractors. Pool gate counts distinct units. |
| **Medals**                   | `PRECISION_OFFSET.artist = -0.08`.                                                                                                                                          |
| **Copy**                     | Config « Un artiste suffit » + tooltip / lobby: one credited artist/group is enough.                                                                                        |
| **Audio follow-up**          | Player volume/mute on library, profile, admin previews (same prefs as in-match).                                                                                            |

**Decisions:** `artistNames[0]` = first billed (catalogue-verified), not a curated lead vocalist. No random-per-round QCM target. Composite credits never appear as buttons or suggestions.

### 26.6 — player settings ✅

Full settings panel (tabs **Général / Social / Compte**) replaces the legal/cookies-only placeholder. Room config stays host-scoped; player prefs are per user.

| Tab         | What shipped                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Général** | Volume + mute persist and apply **everywhere** (match, library, profile previews, admin preview, notification chimes). Storage `aniquizz-player-prefs-v2` (v1 migrated). Motion Auto / Réduit / Complet (`data-motion`; Complet overrides OS; Réduit — or Auto + OS reduce — cuts CSS transitions including the settings morph). Gameplay: autofocus, Entrée, révélation solo immédiate, rappel de raccourcis. |
| **Social**  | Internal notification matrix (toasts + chime, sounds off by default, no browser push). Friend-request privacy. Blocked-account list.                                                                                                                                                                                                                                                                           |
| **Compte**  | Privacy audiences (status / history / invites). Dual AniList + MAL with one active Watched source. Profile badges + settings cards share `ListsProvider`.                                                                                                                                                                                                                                                      |

| Layer      | Detail                                                                                                                                                                                                                                                                                                                                               |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Shared** | `playerPrefs`, `privacyAudience`, `notificationFeedback`, `resolveActiveListProvider`. Presence `hidden`. Public profile `unavailable` / `historyRedacted`. Correlated `lists:*` request ids.                                                                                                                                                        |
| **DB**     | Audio `20260912140000`. Comfort `20260912160000`. Privacy + `activeListProvider` / per-provider last-sync `20260912161000`. `lastListSync` kept. No RLS change.                                                                                                                                                                                      |
| **Socket** | `profile:update_prefs` / `profile:update_privacy`. `lists:get_status` is immediate (idle until resolved). Mutations serialize per user and answer via `lists:result` / `lists:error`. `watched:list_changed` refreshes lobby pool previews. Invites: friends-only, not blocked, audience, host-only, dedicated limit + per-target cooldown.          |
| **Client** | Local-first comfort prefs, account-synced when signed in. Privacy and lists are account-only. Segmented controls fill the track (no grey halo on the selected pill). Floating settings morphs open/close in 500ms (content stays mounted so height retracts to the 56px chip); `data-motion=reduced` (Réduit, or Auto + OS) snaps with no animation. |

**List hardening:** both providers may stay linked; linking/switching commits before any fetch; unlink of the active source falls back atomically; MAL private 404 ≠ missing profile; outages are not cached as a successful sync; inactive linked sources stay `idle`, never a fake `ok`. Legacy list writes through `update_profile_data` were removed.

**Decisions:** sounds off by default · visual = toasts only · hidden status is never fake offline · no `PlayerAnimeList` persistence · no browser push · no language selector (i18n stays backlog).

**Verify:** shared/server/client typechecks · focused prefs, privacy, list resolver, and socket integration tests · `pnpm check:english` · lint · build · `pnpm test`.

### 26.6 — voluntary Ko-fi support ✅

Header outline CTA **Soutenir** (`☕` + label, icon-only below `sm`) links to `https://ko-fi.com/aniquizz` in a new tab. It sits left of **Admin** for staff, and in that slot for everyone else. A light `border` divider separates it from the profile chip when signed in. The Game route has no header, so the CTA never appears in a match.

**Out of scope (kept out):** Ko-fi script / iframe, backend, webhook, donor account link, public badge, leaderboard, gameplay perk.

**Legal:** CGU §5 (optional, no consideration, no tax receipt) · privacy (Ko-fi / PayPal as processors, accounting retention). AniQuizz stays free and ad-free.

**Next:** close 26.6 (commit, CI, tag). Proposed commit when asked: `feat(26.6): quiz du jour, player settings, artist precision, and Ko-fi support`.

### 26.5 — what’s in the tree

| Pillar                                         | Status                                                                                          |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Catalogue endings + credits + OP/ED filter** | Prod data 2026-09-05                                                                            |
| **Staff thematic playlists**                   | Done (picker, decade overlay, Watched overlay, admin, seed, audit, polish)                      |
| **Product-audit hardening**                    | P0/P1/useful P2 shipped; HIBP deferred by plan-tier decision                                    |
| **Release copy**                               | News id 7 (full 26.5, 11 Sept.) · roadmap Endings + Playlists `done` · Home + app-shell `v26.5` |

### 26.5 — product-audit hardening (2026-09-10 → 2026-09-11)

Full-product audit (canvas `full-product-audit`) then two fix waves. Canvas after P0/P1: integrity 5.5 → 8 · RLS 6.5 → 8.5 · auth 8 → 8.5 · principes 6.5 → 7 · tests 7 → 7.5.

#### P0 — exploitable (10 Sept.)

| Item               | What changed                                                                                                                                 | Notes                                                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Mix honor system   | `resolveEffectiveAnswerType` clamps Mix typing: a QCM/Duo **button label** claimed as typing scores as qcm (3 pts), not typing (6).          | Server no longer trusts `answerType` from the wire when the string is on the round’s choices/duo.                        |
| `game:skip_round`  | `Room.forceEndRound(userId)` requires membership + `isSolo` (`maxPlayers === 1`).                                                            | Client recovery skip is solo-only. Custom client cannot force-end a multi match.                                         |
| SongHistory INSERT | Live RLS: drop `"Add to history"`; revoke INSERT/UPDATE/DELETE/TRUNCATE on `SongHistory` (and Profile TRUNCATE) from `anon`/`authenticated`. | Prisma `20260910194500_songhistory_server_writes` applied + `migrate resolve --applied`. Client SELECT of own rows kept. |

#### P1 (10 Sept.)

| Item                           | What changed                                                                                                       | Notes                                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Votes skip/pause               | Membership (`canVote`) + clear that player’s vote on disconnect/leave.                                             | Outsider ignored. `requiredVotes` follows connected humans.                                                              |
| Pool stats IDOR                | `watched:get_pool_stats` / playlist stats: foreign `roomId` → caller’s solo stats, not the other lobby’s lists.    | `room.players.has(userId)`.                                                                                              |
| `get_game_state`               | `requireAuth` + membership.                                                                                        | No anonymous sync. Answers still stripped until reveal.                                                                  |
| Reconnect game-over / starting | `Room.getSyncState` delegates `playing` / `paused` / `finished` / `starting`.                                      | `victoryData` survives refresh; frozen peek while starting.                                                              |
| Peek window                    | Server `generatePeekWindow` **once per round**; client reducer does not invent a new square.                       | Guessing sync reuses `currentPeekWindow`.                                                                                |
| Join + room password           | `RATE_LIMITS.joinLobby` 8/60 s per socket; `toClientRoomSettings` strips password for guests (host still gets it). | Password still compared in memory (plaintext). Per-socket bucket reset on handshake — fixed later the same wave with IP. |
| Delete account                 | `isFreshReauth(last_sign_in_at, 10 min)`.                                                                          | Password never hits our API. Stolen JWT without a recent sign-in is blocked. Docs: `docs/security/delete-account.md`.    |
| `socket.id` in UI              | GameHub / GameSidebar / lobby mapping use `user.id` only.                                                          | Server was already JWT `userId`.                                                                                         |

#### P2 useful (11 Sept.)

| Item                 | What changed                                                                                                                             | Notes                                                                                                                             |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Ready serveur        | `Room.canStartMatch` requires every connected non-bot human `isReady`.                                                                   | Host already ready; bots already ready; solo unchanged. Reason: `Tous les joueurs doivent être prêts.`                            |
| Watched QCM          | Same `hasEnoughQcmNames` (≥ 4 distinct names) as playlists. `distinctNames` on pool stats. Lobby + `validateWatchedStart` block Mix/QCM. | Typing skips the gate. Doc `docs/game/watched-qcm-choices.md`. Duo-only threshold (&lt; 2) not added (Mix/QCM already cuts at 4). |
| AniList stale        | `listError: 'anilist_blocked'` when `blocked` **or** `stale`, even if a cached list is served.                                           | Start still allowed if `playableSongs > 0`. UI warns: liste peut dater de quelques minutes. Empty + down still blocks.            |
| Difficulty cascade   | `fetchWithFallback` sets `difficultyRelaxed`; MatchEngine toasts via `game:fallback_notification`.                                       | Same channel as Watched fallback; second toast delayed ~2.5 s if both fire. No-op when all difficulties already selected.         |
| Helmet               | `helmet` on Express **before** CORS. CSP + COEP off (JSON + Socket.io API).                                                              | `trust proxy` still production-only. Needs Express process restart.                                                               |
| Join by IP           | Sliding window 8/60 s **per IP** in addition to per-socket. `handshakeClientIp`: `X-Forwarded-For` first hop in production only.         | In-memory per process (same as other socket guards). Reconnect no longer resets the IP bucket.                                    |
| HIBP leaked-password | **Intentionally disabled.** Advisor `auth_leaked_password_protection` remains WARN.                                                      | Supabase Pro+ is unavailable; the warning is accepted and is not a 26.5 blocker. See `docs/security/rls-audit.md`.                |

#### Out of scope for 26.5 (backlog)

- Client `tsconfig` `strict` / `noImplicitAny` — enable by `features/` later.
- God-files (`MatchEngine`, `adminRoutes` / `adminService`, Profile, MultiplayerLobby).
- Room password still plaintext in server memory.
- Other audit leftovers: `claim-admin` outside production, admin PATCH role without `guardProtectedTarget`, friend invites without friendship, public profile `roomId`, Mix Duo in a qcm room (intentional lifeline), QCM answer not required to be in `choices`, XP persist best-effort, public health, public R2 catalogue, hex in medals/charts.

#### Key decisions

- Identity stays JWT `userId` — no `socket.id` fallbacks.
- Mix scoring is server-authoritative from offered labels, not the client `answerType` claim.
- Watched QCM reuses the playlist gate rather than inventing a second threshold.
- Stale AniList lists remain **playable** (better than emptying the pool) but must surface `listError`.
- Helmet must not set CSP/COEP on this API or Socket.io polling breaks.
- Join IP limit is in-process memory (fail-open, no extra DB quota) — same honesty as existing socket buckets.

#### 26.5 closure record

- Commit `89c7627` is on `origin/main`; CI, Vercel, and Render are healthy.
- Tags `26.3`, `26.4`, and `26.5` were created and pushed.
- `easy-hits` was deleted from production on 2026-09-12; its snapshot rows cascaded.
- HIBP is intentionally deferred while Supabase Pro+ is unavailable.
- SEO: genuine JSON-LD aliases (`AniQuiz`) + library SearchAction; do not keyword-stuff schema. Search Console after deploy.
- Not blocking: Death March ED2 Unknown Artist, full ffmpeg `r2:scan`, client `strict`, god-file splits.

#### Verification

Scoped tests: Mix clamp, skip solo, votes, peek/sync, reauth, Room ready, Watched QCM launch, handshake IP, IP buckets, difficulty toast. `pnpm --filter @aniquizz/shared build` · server `typecheck` · `pnpm check:english` · `graphify update .`. SongHistory grants confirmed live. HIBP advisor WARN accepted by product decision.

### 26.5 — staff thematic playlists

| Surface    | Delivered                                                                                                                                                                                                                                                                                                                                                 |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Schema** | `ThematicPlaylist` + `ThematicPlaylistSong` snapshot, nullable `Match.playlistId` / `Match.decadePlaylistId`, GIN on `Song.tags` / `Franchise.genres`. Manual migrations `20260905180000_thematic_playlists` + `20260911180000_match_decade_playlist`.                                                                                                    |
| **Shared** | Recipe membership (AND across dimensions, include/exclude, year = song anime `seasonYear`). `playlistId` / `decadePlaylistId` / `playlistWatched` on `GameConfig`. QCM min 4 distinct names. Staff seed: Shonen, Seinen, Slice of Life, Mecha, Fantasy, Romance, Supernatural, Sci-Fi, Sports, Isekai, 1990s–2020s. Retired slugs: `movies`, `easy-hits`. |
| **Draw**   | Playlist membership (`thematicPlaylists.some`, AND when combined) in `PlaylistBuilder` / `buildSongWhere`. Watched overlay inside the pack. Fallback = rest of snapshot, never global. Pack too small → block start. QCM distractors from the same universe.                                                                                              |
| **Client** | Playlists tab: pack picker + decade overlay, pool banner, Watched overlay + « Compléter avec le pack ». Union/Commun only when `isRoom && playerCount > 1`. AniList down/stale copy aligned with Watched. Pack blurbs = famous-anime examples. Rules copy + lobby start gates.                                                                            |
| **Admin**  | Preview (year histogram), publish/refresh snapshot, seed staff packs.                                                                                                                                                                                                                                                                                     |
| **Docs**   | `docs/game/thematic-playlists.md`. News id 7 + roadmap Playlists `done` (11 Sept.).                                                                                                                                                                                                                                                                       |

**State:** shipped in 26.5. Future player-created playlists remain in the 26.x+ backlog.

#### Playlist audit — majors (11 Sept.)

| Item                      | What changed                                                                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M1 Pool stats races**   | `requestId` + 250 ms debounce on `usePlaylistPoolStats`; `soundCount` no longer refetches (client `withPlaylistPoolSoundCount`). `guardSilent` 20/10 s. Room path is host-only. |
| **M2 Recipe vs snapshot** | Recipe edit unpublishes (`nextPlaylistPublishState`). `isPublished` on upsert is honored only when the recipe is unchanged and `snapshotCount > 0`.                             |
| **M3 Start TOCTOU**       | `applySettings` frozen while `status === 'starting'`. `startGame` aborts if `room.settings` identity changed during `validateMusicSourceStart`.                                 |
| **M4 `id IN` blow-up**    | Draw/stats filter by `ThematicPlaylistSong` membership. Pack meta cached 30 s, invalidated on refresh.                                                                          |

#### Playlist audit — minors (11 Sept.)

| Item                  | What changed                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| **m1 Prisma HTTP**    | `wrap` maps P2002→409, P2025→404 via `handlePrismaError`. Snapshot `createMany` uses `skipDuplicates`. |
| **m2 Recipe Zod**     | Caps + positive constraint + `yearMin <= yearMax`. `/playlists/preview` parses the same schema.        |
| **m3 Preview query**  | One `findMany` with `buildPlaylistMembershipWhere` (no id-list round-trip).                            |
| **m4 GET /playlists** | Drop `optionalAuth`. `Cache-Control` 60s + SWR 300s. Client module cache 60s; retry forces refresh.    |
| **m5 Decade persist** | `Match.decadePlaylistId` + `matchPlaylistPersistence` (intersection no longer collapses onto genre).   |
| **m6 Stale count**    | Pack meta + snapshot load in a transaction. Combined `staleDropped` is primary pack only.              |
| **m7 Admin panel**    | Load generation cancel; draft fields use functional `setDraft`.                                        |
| **m8 API base**       | `serverApiBase()` shared by playlist/admin/library/suggestions/leaderboard/socket.                     |
| **m9 Lobby source**   | Create/update (and bot scenarios) require published packs with `snapshotCount > 0`.                    |

#### Playlist polish (11 Sept.)

| Item           | What changed                                                                                                                        |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Extra packs    | Fantasy, Romance, Surnaturel, Science-fiction, Sports, Isekai + decades 1990s–2020s. `movies` / `easy-hits` are retired seed slugs. |
| Decade overlay | Combinable with a genre pack; picker keeps both slots independently.                                                                |
| Union / Commun | Hidden unless salon **and** 2+ humans (`showWatchedFusionMode`). Solo rules omit fusion copy.                                       |
| AniList copy   | Playlist overlay uses the same down / stale messages as Watched.                                                                    |
| Pack blurbs    | Famous-anime examples in picker flair (and seed descriptions).                                                                      |

Staff snapshot counts (prod, 2026-09-11): Shonen 287 · Seinen 24 · Tranches de vie 809 · Mecha 81 · Fantasy 1100 · Romance 979 · Surnaturel 838 · Science-fiction 472 · Sports 165 · Isekai 95 · Années 1990 105 · 2000 452 · 2010 1447 · 2020 970. `easy-hits` and `movies` are absent from production.

### 26.5 — endings + catalogue credits + release content ✅ (2026-09-05)

| Surface            | Delivered                                                                                                                                                                                                             |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pipeline**       | AnimeThemes scopes (top N / exact ids / all / unlocked-only), `SONG_TYPES=OP,ED`, dry-run, locked-row backfill without overwrite. Client OP/ED filter + Watched rules copy.                                           |
| **Prod catalogue** | **1185 OP + 1814 ED COMPLETED** (2999 playable) + 2 SKIPPED = **3001** songs. 433 franchises, 869 animes, all `isLocked`.                                                                                             |
| **R2**             | Key-level 1:1 with COMPLETED at the 2990 snapshot; two orphans deleted. Later rows brought the completed count to 2999.                                                                                               |
| **Artists**        | `manual_edits.json` Unknown Artist pass: MAL title-match (~628) + manual leftover research + spelling unification (7 same-artist duplicates). Imported 2026-09-05. **1** Unknown left (Death March ED2, empty title). |
| **Locks**          | All 2042 previously unlocked songs set `isLocked: true` then imported. DB: 433 / 869 / 3001 locked.                                                                                                                   |
| **Release**        | News id 7 (full 26.5, 11 Sept.) · roadmap Endings `done` (5 Sept.) + Playlists `done` (11 Sept.) · Home + app-shell tag **v26.5**.                                                                                    |

**Artist pass notes:** match by title not OP/ED sequence (Gintama / Naruto mismatches). Reused dump spellings (`THE RAMPAGE`, `Atari Kousuke`, `Faylan`, …). Did **not** merge BoA (Fairy Tail) with BOA (Lain _Duvet_).

**State:** shipped and tagged. Optional full ffmpeg `r2:scan` remains non-blocking.

### 26.5 — targeted endings backfill + playable filter ✅ (code)

- **Pipeline:** AnimeThemes step 2 now supports live AniList top N, exact ids,
  all-input, and historical unlocked-only scopes. Targeted scopes include locked
  anime without changing lock state; missing/excluded top entries are reported
  and replaced by the next eligible AniList rank.
- **Safety:** `ANIMETHEMES_INPUT_FILE=manual_edits.json` uses the exported DB
  snapshot; `ANIMETHEMES_DRY_RUN=1` previews selected ids without AnimeThemes,
  cache, or `data_step2.json` writes. Invalid/conflicting selectors fail early.
  R2 `SKIPPED` rows can now be explicitly requeued by video key or in bulk while
  preserving deliberate `WORKER_SKIP_VIDEO_KEYS` exclusions.
- **Client:** Endings are selectable alongside Openings. Watched rules copy
  reflects opening-only, ending-only, or mixed filters.
- **Docs:** `packages/database/README.md` and `.env.example` contain exact
  PowerShell commands, manual-edit import ordering, and every supported scope.
- **Verification:** live dry-run selected 100 anime; four excluded/absent higher
  ranks were transparently replaced. `check:english` ✅ · lint 0 errors /
  21 pre-existing warnings ✅ · build 4/4 ✅ · tests 327 green + 1 skipped ✅.
  Graphify updated.

**Prod verification (2026-09-05, key-level, no ffmpeg decode):** the documented
top-100 ED import does **not** need to be re-run. Postgres already has
playable endings at scale (see table above). Top-100 AniList-popularity anime
in the catalogue had OP **and** ED at the 2990 snapshot.

R2 bucket `aniquizz-videos`: key-level scan (2026-09-05) found two orphans;
deleted the same day via `delete_r2_keys.ts`: `DGrayman-1482-ED2.mp4` (song
11215 _Pride of Tomorrow_ stays `SKIPPED`) and `KiminoNawa-21519-OP2.mp4`
(no Song row). Full `pnpm r2:scan` (download + ffmpeg decode) was **not** run.

**Follow-up:** 26.6 shipped (tag `26.6`). Next is 26.7 in `PLAN.md`.

### 26.4 — community leaderboard ✅ (2026-09-02)

Public lifetime rankings replace the Coming Soon page. Five tabs, all modes (Standard + Sprint,
solo + multi) feeding existing `Profile` aggregates and `SongHistory`.

| Surface       | Delivered                                                                                                                                                                                                                                                       |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Shared**    | `packages/shared/src/leaderboard.ts` — metric union, discriminated entries, pagination, podium groups, viewer (`ranked` / `ineligible` / `unranked`), `LEADERBOARD_ACCURACY_MIN_ROUNDS = 50`. Internal name `accuracy` to avoid clashing with game `Precision`. |
| **DB**        | Migration `20260902190000_leaderboard_indexes` — `gamesPlayed` DESC, `maxStreak` DESC, partial expression index for eligible accuracy. Pokédex stays `COUNT(SongHistory)` (unique `(profileId, songId)`); no denormalized counter. Applied to prod.             |
| **API**       | `GET /leaderboard` — Zod + `optionalAuth` + `publicRead` limiter. `RANK()` over the primary metric, `ROW_NUMBER()` for stable paging, page + podium sample + viewer from one snapshot.                                                                          |
| **Integrity** | `MatchEngine.finish()` passes **human competitors only** into `computeVictory` (prospective; bots were never persisted). Unfinished matches, guests, and bots stay unranked.                                                                                    |
| **Client**    | Lazy `features/leaderboard/` — five accessible tabs, arena podium + full list, abort-safe hook, French help copy, Home prefetch. Logged-out browse; profile clicks still go through the auth gate.                                                              |

**Product rules:** competition ranks `1-2-2-4` over the full eligible population · page size 25 (max 50) · URL `?metric=&page=` · no period/friends/season filters · bots and **currently** banned accounts excluded (expired bans re-enter) · accuracy eligibility at 50 played rounds (unanswered = miss) · Pokédex = unique songs heard (replays do not count; catalogue delete drops the discovery) · victory ties share rank and sort by `gamesPlayed` desc.

**Polish (2026-09-02):** streak tab removed · XP shows lobby `Nv` badge + total XP · podium reuses game-over gold/silver/bronze rings, crown, and glow · tab icons match profile (`Zap` / `Trophy` / `Target` / `Disc` / `Check`).

**Known historical limitation:** bot-filled-lobby podium inflation is fixed going forward only. Profile aggregates are treated as authoritative; `report-leaderboard-consistency.ts` is **read-only** (reports drift vs `MatchPlayer`, does not overwrite).

**Tests:** shared `leaderboard.test.ts` · `victory.test.ts` bot-omission regression · `leaderboard.integration.test.ts` (ties across pages, unique discoveries, song cascade, 49/50 rounds, bans/bots, viewer, validation, rate limit) · client URL / hook / list / login-gating tests.

**Integrity check (read-only):** `report-leaderboard-consistency.ts` sampled 7 profiles with match activity — **0 drifted fields**. EXPLAIN on `discoveries` / `accuracy` is a Seq Scan at current volume (8 profiles, ~631 `SongHistory` rows); no TTL cache added.

Final CI pre-flight: `check:english` ✅ · `lint` 0 error / 21 pre-existing warnings ✅ ·
`build` 4/4 ✅ · `test` **292 green** (shared 130, server 82 + 1 skipped, client 80). Graphify updated (`graphify update .`).

**Release content:** news id 6 + roadmap « Classement global » `done` · prerender `/leaderboard` live copy · app-shell news card.

**Shipped to origin (2026-09-02 / 03):** `8b027e6` then `4e32022` on `origin/main`. CI, Vercel, and Render all on that tip.

**Historical outcome:** v26.5 endings shipped. Decide on `skills-lock.json` separately.

### 26.4 — Song likes system (complete feature doc)

User-curated favorites (`SongLike`), distinct from `SongHistory` (“heard in a match”). Product surface: library filter/like, in-game reveal heart, profile showcase (pinned + privacy).

#### Schema / migrations

| Migration                                    | What                                                                                                                |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `20260715160000_song_likes`                  | Table `SongLike` (`profileId`, `songId`, `likedAt`) · unique `(profileId, songId)` · indexes · cascade Profile/Song |
| `20260715180000_profile_pinned_favorites`    | `SongLike.pinOrder` (1–5 showcase) · unique `(profileId, pinOrder)`                                                 |
| `20260715190000_profile_show_favorite_songs` | `Profile.showFavoriteSongs` (public profile visibility toggle)                                                      |
| `20260715200000_song_like_count`             | `Song.likeCount` denormalized counter + **backfill** from `SongLike`                                                |
| `20260715210000_song_like_rls`               | Defense-in-depth: `SongLike` RLS enabled + client grants revoked                                                    |

#### Shared (`packages/shared`)

- `LibraryLikedFilter` (`liked` \| `unliked`) · `liked?: boolean` · **`likeCount: number`** on `LibrarySong`
- `likedCount` on `LibraryMetaResponse` (likes of **current user**, not per-song)
- Toggle/ids/pinned types · favorites browse fields: `curated`, `totalLikes`, `visible`, `publicVisible`
- Socket profile update payload includes `showFavoriteSongs`

#### Server

| Piece              | Behavior                                                                                                                                                                                     |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `songLikeService`  | `likeSong` / `unlikeSong` (transaction: create/delete like **+** `likeCount` ±1, idempotent re-like) · `getLikedSongIds` · `countLikedSongs` · `resolveLikedIds` · pinned get/set (max 5)    |
| Routes             | `PUT/DELETE /library/songs/:id/like` · `GET /library/likes/ids` · `GET/PUT /library/likes/pinned` · `GET /library/users/:userId/favorites` · library `?liked=` filter · rate limit mutations |
| Favorites endpoint | Pinned first, else recent likes (max 5) · respects `showFavoriteSongs` for public viewers · owner always sees own                                                                            |

#### Client

| Area        | Delivered                                                                                                                                                                                                             |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Library** | Filtre « Mes favoris » · `SongLikeButton` tree/drawer · hero liked count · drawer (pas de CTA « Lancer une partie »)                                                                                                  |
| **In-game** | Cœur sur `SongInfoCard` **au reveal seulement** · `SongLikesProvider` (optimistic + toast FR + **undo unlike**)                                                                                                       |
| **Profile** | Section **Titres favoris** · play inline · badge type / accent cover · modale **Choisir mes favoris** (ordre ↑↓, toggle public, pagination 20, recherche) · compteur affichés/total · badges Sélection perso / Masqué |

#### Tests / deploy notes

- Integration: `songLikes.integration.test.ts` (8) — like/unlike, `likeCount` increment/decrement, filter, meta, pinned, privacy
- **Prod:** all 5 migrations applied ✅ · release content shipped ✅ · **pushed to `origin/main`**
- Counters: **per-song** = `Song.likeCount` · **per-user total** = `COUNT(SongLike)` / `likedCount` on meta

### 26.4 — audit & release boundary ✅ (2026-09-02)

CI pre-flight on the uncommitted tree: `check:english` ✅ · `lint` 0 error / 21 pre-existing warnings ✅ ·
`build` 4/4 ✅ · `test` **248 green** (shared 123, server 59 + 1 skipped, client 66).

| Area                | Change                                                                                                                                                                                                                                                                           |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Audit fix**       | `SongLikesContext.tsx` was double-spaced (176 blank lines / 322) — reformatted to 154 lines, logic unchanged                                                                                                                                                                     |
| **Audit fix**       | `App.tsx` — `SongLikesProvider` import moved out of the middle of the `lazy()` block into the top import group                                                                                                                                                                   |
| **Audit fix**       | `ProfilePinnedFavoritesDialog` — visibility toggle leaked socket listeners: `once('user_profile')` + `once('error')` with no cross-cleanup meant a later unrelated `error` silently reverted the toggle. Now a single `settle()` removes both listeners, with an 8 s ack timeout |
| **DB hardening**    | `SongLike` had RLS disabled (unlike `Profile` / `Song` / `SongHistory`). Not exploitable — the table has **zero** `anon`/`authenticated` grants, so PostgREST cannot reach it — but migration `20260715210000_song_like_rls` aligns it with the `phase9_rls_hardening` posture   |
| **Data check**      | Counter consistency verified in prod: 28 `SongLike` rows · 28 songs with `likeCount > 0` · `SUM(likeCount) = 28` · 4 pinned — no drift                                                                                                                                           |
| **Release content** | News id 6 dated 2026-09-02: classement (top 25, 5 metrics), favoris, idées, Librairie 3 vues · roadmap Classement `2 septembre 2026, v26.4` · `v26.4` tag on Home + app-shell                                                                                                    |

**Migration history findings (no action needed):**

- The `finished_at IS NULL` row for `20260712200000_profile_mal_username` also carries `rolled_back_at` — it was properly resolved via `migrate resolve --rolled-back` and Prisma skips it. Deleting it would only lose the audit trail.
- `supabase_migrations.schema_migrations` lags behind on purpose: there is no `supabase/` dir and no Supabase CLI usage in the repo. **`_prisma_migrations` is the single source of truth**; mirroring further would create a false dual source.

**Known debt raised (remaining):**

- 5 pre-existing double-spaced files: `FinalRanking.tsx`, `MultiPodium.tsx`, `SoloLobbyRecap.tsx`, `LibraryTreeView.tsx`, `ScoringStrategy.ts`.
- `SongHistory` grants `INSERT/UPDATE/DELETE/TRUNCATE` to `anon` + `authenticated` (RLS-policy-protected only) — much looser than `Song` (`SELECT` only). Pre-26.4, worth a hardening pass.

### 26.4 — debt pass: service split, lazy likes, shared likes feature ✅ (2026-09-02)

| Area                     | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Server split**         | `libraryService.ts` (1070 lines) **deleted**, replaced by 5 modules in `modules/catalogue/`: `librarySongQuery.ts` (227 — where/select/mapping/user flags, shared), `libraryBrowse.ts` (272 — song by id, flat songs, animes, liked_recent), `libraryTree.ts` (434 — franchise tree + search tree + orphan pagination), `libraryMeta.ts` (72 — cached meta + `clearLibraryMetaCache`), `libraryFavorites.ts` (120 — public favorites + `UserFavoritesError`). Code moved verbatim; only imports changed (`routes/library.ts` + 2 integration tests). |
| **Lazy liked ids**       | `SongLikesProvider` stays above the router (state shared across routes) but no longer fetches eagerly: `GET /library/likes/ids` fires only when a like-aware surface mounts (`useSongLikes` consumers auto-call `requestLikedIds()`). Home no longer triggers the request. A `toggleVersionRef` re-fetches if a toggle races the in-flight ids fetch, so optimistic state is never clobbered.                                                                                                                                                        |
| **Shared likes feature** | New `apps/client/src/features/likes/` — `context/SongLikesContext.tsx`, `components/SongLikeButton.tsx`, `copy/likesCopy.ts` (6 keys moved out of `libraryCopy.ts`). `game` no longer imports from `library`; both import from `likes`. 8 import sites updated.                                                                                                                                                                                                                                                                                      |

### 26.4 — community suggestions board ✅ (2026-09-02)

| Area           | Delivered                                                                                                                                                                                                                                                                                                |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Data**       | `Suggestion` + `SuggestionVote` · categories Improvement / Song request / Correction / Other · status rank Open → Planned → Done → Rejected · unique vote · transactional `voteCount` · optional Song `SetNull`                                                                                          |
| **Security**   | Server-only RLS on both tables, all `anon` / `authenticated` grants revoked · auth required to create/vote/delete · moderator update, admin delete · 5 creations per rolling 24 h · Postgres-backed HTTP rate limits                                                                                     |
| **Public API** | `GET /suggestions[/:id]` public + optional `myVote` · `POST /suggestions` · `PUT/DELETE /:id/vote` · owner delete of untreated ideas · Top/recent, multi-word text search, category/status, pagination · `GET /suggestions/song-options`                                                                 |
| **Public UI**  | Lazy `/suggestions` page · 20-item pagination · debounced full-text search + category/status filters · vote rail + optimistic vote · category/status badges · official team reply · structured song correction · accessible paginated song combobox · owner delete while unlocked · public SEO prerender |
| **Home**       | Third secondary « Idées » button + intent prefetch; HTML app-shell kept in parity                                                                                                                                                                                                                        |
| **Admin**      | New Suggestions tab · filters category/status · status update · official response · admin-only deletion                                                                                                                                                                                                  |
| **Tests**      | `suggestions.integration.test.ts` (13) + client validation/combobox/stale-search tests                                                                                                                                                                                                                   |

### 26.4 — suggestions release hardening ✅ (2026-09-02)

| Area               | Change                                                                                                                                                                            |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Votes**          | `SELECT … FOR UPDATE` + `createMany({ skipDuplicates })` — concurrent PUT from the same user returns 200 with `voteCount === 1`                                                   |
| **Rate limits**    | `HttpRateLimitBucket` (hashed key, sliding window, `Retry-After`) shared by suggestions + library; daily create quota is the same persistent bucket (delete does not free a slot) |
| **Staff lock**     | `staffTreatedAt` set on first non-OPEN status or official reply · author DELETE then 403                                                                                          |
| **Account delete** | Untreated ideas removed · treated ideas kept with `authorId` null · votes of the deleted user decremented then dropped                                                            |
| **Song search**    | Ranked SQL pagination (`/suggestions/song-options`) · client loads one page then « Afficher plus »                                                                                |
| **React**          | `AbortController` on board, admin panel, and song search so only the latest response applies                                                                                      |
| **A11y / copy**    | WAI-ARIA combobox · all French UI strings in `suggestionsCopy.ts` · create dialog split under the file-size cap                                                                   |
| **DB**             | Migrations `20260902180000_suggestions_hardening` + `20260902181000_http_rate_limit_rls` applied                                                                                  |

Final CI pre-flight: `check:english` ✅ · `lint` 0 error / 21 pre-existing warnings ✅ ·
`build` 4/4 ✅ · `test` **267 green** (shared 123, server 72 + 1 skipped, client 72).

### 26.4 — news & roadmap aligned with shipped idées board ✅ (2026-09-02)

Player-facing v26.4 copy now matches the live board (no internals):

| Surface   | Change                                                                                                                                                                                                |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| News id 6 | Section **La boîte à idées** : bouton Home **Idées**, vote (connexion), recherche + filtres, **5 / 24 h**, statuts **En cours / Prévue / Réalisée / Refusée**, réponses officielles, picker catalogue |
| App-shell | Description de la carte actualité alignée (vote + idées)                                                                                                                                              |
| Roadmap   | « Boîte à idées » `done` — description board public + statuts FR                                                                                                                                      |
| PLAN      | 26.4 marked feature-complete; pushed to `origin/main`                                                                                                                                                 |

### 26.4 — library browse views (Franchise / Anime / Sons) ✅ (2026-07-15)

| Area      | Delivered                                                                                              |
| --------- | ------------------------------------------------------------------------------------------------------ |
| **Views** | Toggle Franchise (tree) · Anime (expand list) · Sons (flat grid) · défaut Franchise                    |
| **URL**   | `?view=songs&sort=likes` · auto `view=songs` si filtre Favoris · clear favoris → Franchise             |
| **Sorts** | `likes` (likeCount desc) · `liked_recent` (SongLike.likedAt, auth) · matrice tri↔vue (options grisées) |
| **Meta**  | `anime.popularity` exposé · badges compact (`12.4k`) · `likeCount` toujours affiché (y compris 0)      |
| **API**   | `GET /library/animes` · `/library/songs?sort=likes\|liked_recent`                                      |
| **Tests** | library integration +2 (sort likes, animes pagination)                                                 |

### 26.4 — chantier 1 (historical short list) ✅ — superseded by section above

### 26.3 — release content shipped (2026-07-14)

**26.1** shipped (2026-07-10) · **26.2** shipped (2026-07-12)

### 26.3 — chantier 1: engine tests + autocomplete doc ✅

| Area                       | Delivered                                                                                                                                                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **MatchEngine unit tests** | 18 tests in `MatchEngine.test.ts` — standard scoring (typing/qcm/duo/mix), `effectiveAnswerType` clamp, answer change before reveal, streak/`maxStreak`, solo/multi guess-timer parity (26.2.1 regression), reveal anti-leak, reveal → next round |
| **Test harness**           | `matchEngineTestHarness.ts` — mock io, playlist factory, `advanceToGuessing()` with fake timers                                                                                                                                                   |
| **Doc**                    | `docs/perf/baseline.md` Axis 1 updated — documents 26.2.1 client-side fuzzy (`anime:get_all` → local `useAnimeSearch`) vs stale 10.8 server-per-keystroke description                                                                             |

### 26.3 — chantier 2: GameForm full-screen routes ✅

| Area             | Delivered                                                                                                                                                                                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Routes**       | `/play/create` (solo · créer salon · édition lobby) · `/play/join` (liste + code) · `/play/*` nested sous `GameHub`                                                                                                                                 |
| **Layout**       | `PlayConfigPage` plein écran — modes en haut (`GameTypeSelector`), sidebar + panneau `glass-card`                                                                                                                                                   |
| **Nav sections** | **Général** (règles + sélection musicale) · **Source** · **Avancée** (vidéo + départ son) — plus d’onglets Salon / Filtres / Vidéo / Départ son                                                                                                     |
| **Multi salon**  | Paramètres salon (nom, privé, mdp, joueurs max) en bloc compact **au-dessus** de la nav — pas de catégorie dédiée                                                                                                                                   |
| **Form**         | `GameConfigForm` refactoré — `configSections.ts`, sections `config/*` réutilisées                                                                                                                                                                   |
| **Controller**   | `LobbyControllerContext` — socket unique sur tout `/play/*` ; modals config supprimées                                                                                                                                                              |
| **UX polish**    | Retour unique · pas de sous-titre descriptif · titre de section dans le panneau · Sprint typing actif (violet) · erreur mdp privé · retour lobby en édition (`returnTo`) · précision en primary · padding resserré · scroll-spy testé puis rollback |
| **Parité**       | Solo, création multi, édition lobby (draft), Watched gates, mot de passe privé                                                                                                                                                                      |

**Historical outcome:** chantier 3 — Sprint shipped (see below).

### 26.3 — chantier 3: Sprint (ex Quick Draw) ✅

| Area              | Delivered                                                                                                                                                                                                                                                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Shared**        | `gameType: 'standard' \| 'sprint'` · `sprint.ts` (`computeSprintPodiumBonus`, `sprintSpeedRank`, `formatSprintTimeSeconds`, `maxSprintPointsPerRound`, `gameTypeFromStoredMode`) · `GAME_TYPE_LABELS.sprint` (« Sprint »)                                                                                                     |
| **Engine**        | `ScoringStrategy.roundBonus()` · `sprintScoring` · bonus at `endRound` on **final** correct answer (`answerTimeMs` updatable until chrono ends) · `speedRank` / `speedBonus` at reveal · `sprint:leaderboard` event (reveal-only, per socket)                                                                                 |
| **Settings**      | Zod Sprint: typing forced · min 2 joueurs · solo config hides Sprint (`GameTypeSelector.soloOnly`)                                                                                                                                                                                                                            |
| **Client config** | `GameTypeSelector` · RulesSection typing-only · lobby rules copy Sprint                                                                                                                                                                                                                                                       |
| **In-game UX**    | Typing forcé · barre de saisie **reste active** après envoi (changement de réponse autorisé) · badge **`Jusqu'à +8 pts`** (5 base + 3 max podium) · classement vitesse **au reveal seulement** (suspense) · panel sous card anime (aligné player cards) · top 3 + ligne **Vous** séparée · croix rouge si faux (pas de temps) |
| **Game over**     | `MatchConfigHeader` badge SPR/éclair · `RoundHistoryList` Sprint : temps, rang (`1er correct`…), points `+8` avec breakdown `5+3` · bandeau récap podiums + meilleur temps                                                                                                                                                    |
| **Persistance**   | `Match.mode = SPRINT` en DB (migration `20260713160000_match_game_mode_sprint`) · historique profil badge Sprint (warning) · `RecordedAnswer` + `RoundHistoryEntry` : `answerTimeMs`, `speedRank`, `speedBonus`                                                                                                               |
| **Tests**         | MatchEngine Sprint (3+) · shared `sprint.test.ts` (120 tests shared total)                                                                                                                                                                                                                                                    |

**Product rules (locked):**

- Sprint = **multi uniquement** (podium bonus meaningless solo).
- Classement vitesse = **bonnes réponses finales** triées par `answerTimeMs`, pas « premier essai correct ».
- Stats profil **multi** = au moins **1 autre humain** persisté (`MatchPlayer` count) — lobby + bots only compte solo.

### 26.3 — release content ✅

| Area        | Delivered                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------- |
| **News**    | Actualité v26.3 (`newsData.ts`, id 5) — Sprint, config plein écran, polish · date 14 juillet 2026 |
| **Roadmap** | Sprint coché · graphiques profil en planned · Mode Rapidité retiré (remplacé par Sprint)          |
| **Home**    | Tag version `v26.3` · app-shell aligné (actualités + version)                                     |
| **CI**      | `check:english` · `lint` · `build` · `test` verts en local                                        |

### 26.3 — data prep: match snapshots for future profile charts ✅

| Area            | Delivered                                                                                     |
| --------------- | --------------------------------------------------------------------------------------------- |
| **Schema**      | Migration `20260712193000` — `Match.responseType`, `Match.precision`, `MatchPlayer.soloMedal` |
| **Persistance** | `MatchRepository` écrit les snapshots à la fin de partie (aucune UI)                          |

**Deferred (26.x+ backlog):** graphiques profil — API d’agrégation, Recharts, section `/profile`.

### 26.3 — polish: Solo lobby recap (Option A) ✅

| Area          | Delivered                                                                                                  |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| **Recap**     | `soloLobbyRecapGroups.ts` — groupes Partie / Réponse / Musique / Vidéo · badge mode dynamique              |
| **UI**        | `SoloReady` + `SoloLobbyRecap` — Header site, coupe Standard, Retour hors carte, Règles discret (`subtle`) |
| **Fix**       | Renommage `soloLobbyRecapGroups.ts` (collision Windows `.ts` / `.tsx`)                                     |
| **Solo-only** | Pas d’estimation `≈ X min` · ligne Vidéo (`VIDEO_MODE_LABELS`)                                             |
| **Tests**     | `soloLobbyRecapGroups.test.ts` (6 tests)                                                                   |

### 26.3 — polish: setting chips unifiés + mode badges ✅

| Area                 | Delivered                                                                                                             |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Composant**        | `SettingChip.tsx` + `SETTING_CHIP_NEUTRAL` — `rounded-lg`, `h-7`, style neutre partout                                |
| **Source de vérité** | `roomSettings.ts` — `buildLobbySettingChips()` (Diff + Sons + Temps + Précision + Réponse + Source + **Vidéo**)       |
| **Difficulté**       | Couleur seule sémantique : 1 tier (success/warning/destructive) · 2 tiers = dégradé moitié-moitié · 3 = triple        |
| **Icônes**           | `Gauge` (diff), `Keyboard` (réponse), `Eye` (vidéo), `Target` (précision), etc.                                       |
| **Mode badge**       | `GameModeBadge.tsx` — Standard (coupe) / Sprint (éclair) · compact STD/SPR en liste salons                            |
| **Surfaces**         | Lobby multi · `RoomList` · solo recap · modal Règles · game-over `MatchConfigHeader` · overlay in-game `ConfigBadges` |
| **Config**           | `GameTypeSelector` — coupe à la place de Sparkles pour Standard                                                       |
| **API liste salons** | `RoomListSettingsSummary` + `toRoomListSettings` — expose `gameType` + `videoMode`                                    |
| **Tests**            | `roomSettings.test.ts` · `soloLobbyRecapGroups.test.ts`                                                               |

**Historical outcome:** the v26.3 release boundary was completed and tagged.

### 26.3 — fix: typing autocomplete perf ✅

| Area       | Change                                                                                                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Cause**  | Chaque frappe mettait à jour `answer` dans `Game.tsx` → re-render de tout l’arbre (vidéo, joueurs, sidebar) + fuzzy sur tout le catalogue + `buildFranchiseCounts` recalculé à chaque fois |
| **Fix**    | Draft isolé dans `AnswerInput` · debounce adaptatif · index préfixe · `startTransition`                                                                                                    |
| **UX**     | Barre de typing **conservée** après envoi (pill + champ « Modifier votre réponse… ») — requis pour Sprint et parité solo/multi                                                             |
| **Shared** | `getFuzzySuggestions(..., franchiseCountsCache?)` · export `buildFranchiseCountsMap`                                                                                                       |

### 26.3 — fix: admin catalogue tree search / refresh ✅ (2026-07-15)

Admin → onglet **Catalogue** : recherche / refresh peu fiable (« je tape un anime, ça sort pas »).

| Area              | Change                                                                                                                                                                                                                       |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cause**         | Courses de `load()` sans abort · UI gardait l’ancien arbre sans feedback · search sans `altNames` · sons non filtrés par query · N+1 Prisma par franchise                                                                    |
| **Client**        | `AbortController` sur `catalogueTree` · ignore réponses périmées · overlay « Actualisation… » + grisé pendant refresh · « Aucun résultat » seulement hors loading · debounce ne reset `page` que si la query commitée change |
| **Server search** | Match `Anime.altNames` via SQL `unnest` + `ILIKE` · sons : titre/artiste **ou** identité anime (name / franchise / altNames) — sinon uniquement le(s) son(s) matching                                                        |
| **Server load**   | Batch page : 1 query franchises → 1 animes → 1 songs (plus de boucle `loadAnimesWithSongs` par franchise)                                                                                                                    |
| **Files**         | `CataloguePanel.tsx` · `adminApi.ts` · `adminService.ts` (`catalogueTree`)                                                                                                                                                   |

### 26.3 — fix: lobby settings stuck after socket replace ✅ (2026-07-15)

| Area       | Change                                                                                                                                                                                                   |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cause**  | Après `server namespace disconnect` (1 session / user), le nouveau socket n’était plus dans le channel Socket.IO `roomId` → `update_room_settings` OK mais pas de `room_updated` → pas de retour `/play` |
| **Fix**    | Re-`lobby:join` au `connect` si `currentRoomId` + waiting · navigate immédiat après save paramètres · reconnect host same room → `onRoomJoined` (pas kick hors édition)                                  |
| **Commit** | `7acf18a` · `useLobbyController.ts`                                                                                                                                                                      |

---

## Shipped history

### v26.2 — boundary closed ✅ (2026-07-12)

### 26.2 — chantier 1: Librairie musicale ✅

| Area       | Delivered                                                                                                |
| ---------- | -------------------------------------------------------------------------------------------------------- |
| **API**    | `GET /library/meta`, `/library/tree`, `/library/songs`, `/library/song/:id` · optional auth · rate limit |
| **Server** | `libraryService.ts` · search-mode pagination when `q` set                                                |
| **DB**     | Migration `20260712180000_library_franchise_popularity`                                                  |
| **Shared** | `packages/shared/src/library.ts` · `animeMatchesLibrarySearch()`                                         |
| **Client** | `/library` full browse UI                                                                                |
| **Tests**  | 8 integration tests `library.integration.test.ts`                                                        |

### 26.2 — chantier 2: MyAnimeList (Watched) ✅

| Area              | Delivered                                                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **API MAL**       | Official v2 `GET /users/{name}/animelist` · header `X-MAL-CLIENT-ID` only (no OAuth) · `malService.ts`                                      |
| **List statuses** | `watching`, `completed`, `on_hold` → internal catalogue ids via `Anime.idMal`                                                               |
| **Resolver**      | `listResolver.ts` + `watchedPoolResolve.ts` — one provider per profile (AniList **XOR** MAL); cross-provider union/intersection OK in multi |
| **DB**            | `Profile.malUsername` · index `Anime.idMal` — migration `20260712200000_profile_mal_username`                                               |
| **Shared**        | `watchedList.ts` (`hasWatchedListLink`, `watchedListProvider`) · socket `malUsername` on `GamePlayer` / `SocketData`                        |
| **Server**        | Profile link mutual exclusivity · warm lobby · Watched gates · `validateWatchedStart`                                                       |
| **Client**        | Profil : deux boutons **Lier** + logo AniList / MAL · `WatchlistLinkDialog` · hub Watched gates · copy FR (On-Hold)                         |
| **Admin**         | Stats `watchedListLinked` + breakdown AniList/MAL · `ProfileView` / `RoomsPanel` affichent MAL                                              |
| **Config**        | `MAL_CLIENT_ID` local + Render (`apps/server/.env.example`)                                                                                 |
| **Tests**         | `malService.test.ts` in CI · `watched.integration.test.ts` (no-list + MAL pool) · `watchedList` / `watchedSource`                           |

**Bugfix (MAL mapping):** `mapMalIdsToCatalogueIds` must **not** filter `isLocked: false` — `isLocked` is an ETL freeze flag, not a playability gate. Without this fix, MAL lists mapped to 0 catalogue animes locally.

### 26.2 — polish: first-paint / load UX ✅

| Area                 | Delivered                                                                            |
| -------------------- | ------------------------------------------------------------------------------------ |
| **Home eager**       | `Home` import synchrone — plus de lazy/Suspense skeleton sur `/`                     |
| **App-shell**        | HTML shell hors `#root`, overlay jusqu'au paint React (`dismissAppShell` même frame) |
| **Skeleton**         | `AppSuspenseFallback` + `RouteSkeletonFallback` → `null` sur `/`                     |
| **Header**           | Placeholder profil (`ProfileButton loading`) dès session, sans attendre `profile`    |
| **Motion cold load** | `isFirstLandingPaint()` — pas de `fade-in` / `slide-up` au premier paint             |
| **Shell parity**     | `app-shell.css` aligné sur vraie Home (actualités, polices self-hosted, chip profil) |

### 26.2 — polish: in-game performance ✅

| Area           | Delivered                                                                                                                                                       |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Timer**      | `useMatchCountdown` + `MatchCountdownOverlays` (`apps/client/src/features/game/`) — progress 100ms, chiffres 250ms ; `Game.tsx` ne re-render plus à chaque tick |
| **Visualizer** | `AudioVisualizer` CSS-only (`.eq-bars` in `index.css`) — zéro `setState` pendant la manche                                                                      |
| **GPU**        | `backdrop-blur` retiré des surfaces in-game (cartes joueurs, top bar, overlays, timers…) → `bg-*/95` opaques                                                    |
| **Profiler**   | `DevRenderProfiler` (`components/dev/`) — dev only, log commits React > 8ms sur layout + countdown                                                              |
| **Tests**      | `useMatchCountdown.test.ts` (pure `computeMatchCountdown`)                                                                                                      |

**Symptôme ciblé :** ralentissements / animations saccadées en partie (ex. MacBook Air M1) — cause principale : timer 100ms sur tout l'arbre `Game` + visualizer 100ms + `backdrop-blur` GPU.

**Vidéo floutée :** blur live `blur-xl` (24px) → `blur-[25.2px]` (+5%) pour masquer davantage l'image (`VideoStage.tsx`).

### 26.2 — tweak: blurred video concealment ✅

| Change       | Detail                                                                                    |
| ------------ | ----------------------------------------------------------------------------------------- |
| **Blur +5%** | Mode `videoMode: 'blurred'` — `blur-xl` (24px) → `blur-[25.2px]` in `VideoStage.tsx`      |
| **Why**      | Slightly stronger hide of the anime frame during guessing without changing mode behaviour |

### 26.2 — gameplay: solo guess phase aligned with multi ✅

**Problem (before):** en solo, la manche passait immédiatement en révélation dès la première réponse — le joueur ne pouvait ni profiter du chrono complet ni modifier sa réponse.

**Behaviour (after):** le solo suit le même déroulement que le multijoueur pendant la phase `guessing` :

| Moment             | Solo                                                           | Multi (inchangé)                                                                        |
| ------------------ | -------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Réponse soumise    | Score mis à jour, badge « réponse envoyée », input reste actif | Idem                                                                                    |
| Changer de réponse | Autorisé (même mode : typing / carré / duo)                    | Autorisé jusqu'à la fin du chrono                                                       |
| Fin de manche      | Chrono écoulé **ou** clic **Révéler**                          | Chrono **ou** tous les connectés ont répondu **ou** vote skip majoritaire en révélation |

**Bouton Révéler (solo uniquement) :**

- Libellé **Révéler** (ex-**Passer**), icône œil.
- Visible seulement si `submittedAnswer !== null` et `phase === 'guessing'`.
- Réutilise l'événement existant `game:skip_round` → `MatchEngine.forceEndRound()` — **aucun nouvel event socket**.

**Fichiers :**

| Layer  | File                                                                             | Change                                                                     |
| ------ | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Server | `apps/server/src/modules/game/engine/MatchEngine.ts`                             | Retrait du `endRound()` anticipé quand `isSolo && allConnectedAnswered()`  |
| Client | `apps/client/src/features/game/components/modes/standard/parts/VideoStage.tsx`   | Bouton Révéler (condition + copy)                                          |
| Client | `apps/client/src/features/game/components/modes/standard/StandardGameLayout.tsx` | `handleSoloSkip` → `socket.emit('game:skip_round')` (inchangé)             |
| Client | `apps/client/src/pages/Game.tsx`                                                 | `submittedAnswer` + placeholder « Changer votre réponse… » (déjà en place) |

**Tests :** pas de test unitaire `MatchEngine` dédié (setup lourd) ; lint client OK · suite serveur 28 passés (working tree).

### 26.2 — release content ✅

| Area        | Delivered                                                                          |
| ----------- | ---------------------------------------------------------------------------------- |
| **News**    | Actualité v26.2 (`newsData.ts`) — Librairie, MAL, solo Révéler, perf               |
| **Roadmap** | Librairie + MAL cochées (`12 juillet 2026 — avec la v26.2`) · dates Q3/Q4 ajustées |
| **Home**    | Tag version `v26.2` · app-shell aligné                                             |

## Boundary 26.2 — closed ✅ (2026-07-12)

| Item                           | Statut                    |
| ------------------------------ | ------------------------- |
| Code + push `main`             | ✅                        |
| CI GitHub                      | ✅                        |
| Migrations prod                | ✅ (schéma déjà en place) |
| `MAL_CLIENT_ID` Render         | ✅ (configuré)            |
| `ARCHITECTURE.md`              | ✅                        |
| Tags `26.1` + `26.2`           | ✅                        |
| Historique migrations Supabase | ✅ aligné                 |

**Historical outcome:** v26.3 shipped after this boundary.

Full 26.1 write-ups: [`docs/progress-archive/v26.1.md`](./docs/progress-archive/v26.1.md).

## Recent key decisions

- **Quiz du jour (26.6):** not a Match. One attempt, forfeit-on-leave, Paris midnight, dedicated streak/XP. Admin shuffle is franchise-uniform and must not lock to openings. Reveal likes use the catalogue song id.
- **Player settings (26.6):** comfort prefs are local-first + account-synced; privacy audiences and list links are account-only and server-enforced. Sounds off by default; hidden status is never fake offline. Volume/mute apply to every preview surface, not only in-match.
- **Artist precision (26.6):** guess the performer, not the song title. QCM/autocomplete use billed units; first billed unit is the QCM target. Song-title / OP-ED sequence deferred to backlog.
- **List integrations (26.6):** AniList and MAL may stay linked together; one canonical `activeListProvider` drives Watched and falls back atomically when unlinked.
- **MAL cross-provider multi:** each player's pool resolved separately (AniList ids or MAL→`idMal`), then union/intersection on catalogue `Anime.id`.
- **MAL statuses:** `on_hold` included alongside Completed/Watching (product choice 26.2).
- **Librairie (26.2):** playable = `downloadStatus: COMPLETED` only. Tree paginated by franchise; search (`q`) switches to flat song pagination.
- **Graphiques profil:** deferred to 26.x+ backlog (`PLAN.md` backlog) — DB snapshots persist at match end; UI/API removed from 26.3 scope.
- **Quick Draw → Sprint (26.3):** renommé `sprint` partout ; typing-only multi ; podium bonus relatif aux **corrects** ; config + in-game + game-over + historique profil ; classement vitesse reveal-only ; re-réponse autorisée jusqu’au chrono.
- **GameForm (26.3):** full-screen `/play/create` ; nav Général/Source/Avancée ; salon en sidebar multi ; modes en haut ; scroll-spy rejeté.
- **Watched mode:** QCM distractors use the same `watchedIds` as songs; global fallback **opt-in only**. See `docs/game/watched-qcm-choices.md`, `watched-pool-threshold.md`.
- **Playlist (lobby):** cumulative **song-id** exclusion across matches in the same salon (`Room.priorMatchSongIds`); auto-relaxation when the filtered pool is too small; stale-match abort on lobby return.
- **Playlist order (fix A, 26.2):** removed `smartShuffle` « largest franchise first » opener bias. After franchise-diverse pick (`pickBestCandidates`), round order is a uniform Fisher-Yates shuffle (`shuffleArray`). Diversity at pick time unchanged; adjacent same-franchise rounds possible only when pass 2 had to duplicate franchises (small pool).
- **First-paint UX (26.2):** app-shell HTML conservé jusqu'au commit React; Home eager; header profil placeholder; animations landing désactivées au cold load. Shell aligné pixel-par-pixel sur Home (fonts + actualités).
- **In-game perf (26.2):** countdown isolé (`MatchCountdownOverlays`), visualizer CSS-only, suppression `backdrop-blur` in-game, `DevRenderProfiler` en dev. Mode vidéo floutée : blur +5% (24px → 25.2px).
- **Solo guess phase (26.2):** même chrono que le multi — pas de révélation instantanée à la réponse ; bouton **Révéler** actif après la première réponse (`game:skip_round`).
- **Lobby edit stuck after socket replace (26.3 fix):** après `server namespace disconnect`, re-`lobby:join` au reconnect + exit config au submit — voir § _26.3 — fix: lobby settings stuck_.
- **Admin catalogue tree (26.3 fix):** abort + loading overlay · `altNames` ILIKE · filter sons par query · batch animes/songs — voir § _26.3 — fix: admin catalogue tree search_.
- **Song likes (26.4):** `SongLike` is server-only (Express API + Prisma owner connection, no PostgREST grants, RLS on as defense-in-depth). Per-song counter is denormalized in `Song.likeCount` and written **in the same transaction** as the like — never recomputed on read.
- **Migration source of truth (26.4):** `_prisma_migrations` only. `supabase_migrations.schema_migrations` is left to dashboard-applied SQL (RLS, storage); no Supabase CLI in the repo, so do not mirror Prisma migrations into it.

## Roadmap (see `PLAN.md`)

| Version   | Scope                                                                                                                                                                      |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **26.1**  | Delete account · AniList pool + opt-in · lobby rules · video modes · song start · admin lobby bots — ✅ all shipped                                                        |
| **26.2**  | Librairie ✅ · MAL Watched ✅ · polish UX/perf ✅ · solo guess + Révéler ✅ · shipped 2026-07-12                                                                           |
| **26.3**  | Engine tests + doc ✅ · GameForm ✅ · Sprint ✅ · polish ✅ · snapshots data ✅ · release content ✅ · lobby reconnect fix ✅ · admin catalogue search fix ✅ · tag `26.3` |
| **26.4**  | Song likes full ✅ · library views ✅ · **boîte à idées** ✅ · **classement global** ✅ (5 metrics) · release content aligned ✅ · tag `26.4`                              |
| **26.5**  | Endings catalogue ✅ · OP/ED filter ✅ · artist credits + locks imported ✅ · staff playlists ✅ · hardening ✅ · tag `26.5`                                               |
| **26.6**  | Quiz du jour ✅ · player settings ✅ · Artiste precision ✅ · Ko-fi ✅ · news/roadmap/Home ✅ · close: commit, CI, tag                                                     |
| **26.x+** | Period/friends leaderboard filters, saviez-vous, achievements, competitive, user playlists, EN i18n, light mode, …                                                         |

## Conventions

- End each **26.x** update: checklist in `PLAN.md` · condense the phase here · archive detail
  under `docs/progress-archive/` · propose a Conventional Commits message when requested.
- One chantier at a time per `PLAN.md`; document decisions and test status.
- Engineering playbook (CI, typing, tokens, graphify): [`AGENTS.md`](./AGENTS.md).

## Shipped commits (v26.4)

`PLAN.md` / `PROGRESS.md` are gitignored, so they never appear in a commit. The planned five-way split was folded into two commits on `origin/main`:

| SHA       | Message                                                          |
| --------- | ---------------------------------------------------------------- |
| `8b027e6` | `feat(26.4): ship likes, ideas board, and public leaderboard`    |
| `4e32022` | `fix(26.4): date the roadmap 2 September and flag new home CTAs` |

**Still open:** `skills-lock.json` (graphify skill pin) — commit as `chore(tooling)` or add to `.gitignore`.
