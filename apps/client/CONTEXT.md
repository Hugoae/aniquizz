# Context — `aniquizz-client`

**Role:** React 18 + Vite SPA for aniquizz.com (Vercel). Renders the lobby, the
Standard game, profile, admin, and legal pages. All gameplay state is server-driven
over Socket.io; the client mirrors it and never computes authoritative results.

See [`README.md`](./README.md) for stack, routes, env, and deploy details.

## Glossary

| Term | Definition | Where |
|------|------------|-------|
| **feature module** | Self-contained domain folder (components, hooks, copy) under `src/features/<domain>/`. | `features/` |
| **useGameSocket** | Hook owning the in-match socket lifecycle; feeds `gameReducer`. | `features/game/` |
| **gameReducer** | Client mirror of match state; merges server payloads (with lobby-config fallbacks for `videoMode`). | `features/game/` |
| **useLobbyController** | Lobby actions (create/join, settings, `addBots`, ready). | `features/hub/` |
| **lobbyRulesCopy** | Pure builder turning live `RoomConfig` into French rules text (unit-tested). | `features/hub/components/lobby/lobbyRulesCopy.ts` |
| **VideoStage** | Renders the guessing clip per `VideoMode` (`hidden` / `blurred` / `peek`) + timer variants. | `features/game/` |
| **useVideoPlayback** | Seek-before-play pipeline; clip cache keyed `videoKey:startTime`. | `features/game/` |
| **SoloMasteryBar / SoloScoreCard** | Game-over medal UI; take `precision` so labels match server thresholds. | `features/game/.../gameover/solo/` |
| **adminApi** | Typed fetch client for `/admin/*` REST (Bearer JWT). | `lib/adminApi.ts` |
| **socket.ts** | Singleton Socket.io client wired to Supabase auth. | `lib/socket.ts` |

## Known pitfalls

- **User-facing copy is French; code/comments English.** Keep strings isolated
  (e.g. `lobbyRulesCopy.ts`, copy files) for future i18n — don't inline French in logic.
- **Design tokens only** — style via Tailwind semantic classes (`bg-primary`,
  `text-muted-foreground`) or `hsl(var(--token))`; reuse `.glass-card`,
  `.gradient-text`, `FOCUS_RING`, and `components/ui/` primitives. No hardcoded hex.
- **Separate value imports from `import type`.** Vite/SWC breaks when a runtime value
  (e.g. `normalizeVideoMode`) is pulled in via an `import type` block.
- **The server can omit newer `round_start` fields** (older deploy). The client merges
  `videoMode` from lobby config as a fallback — preserve that path when editing the reducer.
- **Reset the clip cache on `phase === 'loading'`** so a solo replay in the same lobby
  gets fresh offsets; the reveal (`RevealSong` by `id`) must skip reload.
- **Respect `prefers-reduced-motion`** (handled globally in `index.css`) — don't add
  animations that ignore it.
- Route entry points are lazy-loaded; keep the Suspense/prefetch pattern
  (`DelayedRouteFallback`, `routePrefetch`) intact to avoid loading flashes.
