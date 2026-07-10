# Standard mode — lobby rules copy

Reference for the **Règles** modal in solo and multiplayer lobbies (Update 26.1 #3).

## Purpose

Explain how the **current** room will play before launch — without opening the settings modal. Content is **read-only** and driven by live `RoomConfig` / `GameConfig`.

## Client modules

| File | Role |
|------|------|
| `apps/client/.../lobby/lobbyRulesCopy.ts` | `buildLobbyRulesSections(config, context)` — French UI strings |
| `apps/client/.../lobby/LobbyRulesDialog.tsx` | Scrollable modal + `LobbyRulesTrigger` button |
| `apps/client/.../lobby/lobbyRulesCopy.test.ts` | Copy regression tests (11 cases) |

## Sections

| Section | Title | Content |
|---------|-------|---------|
| `summary` | Résumé de la partie | Intro blindtest + colored setting chips only (no duplicate text lines) |
| `flow` | Déroulement | Audio + hidden video; precision (Franchise vs Anime / season example); reveal with video |
| `scoring` | Points par réponse | Depends on `responseType` — see below |
| `source` | Source musicale | Random / Watched / Playlist placeholder |
| `victory` | Victoire | Solo medals or multi podium |
| `lobby` | Salon multijoueur | Multi only — ready, host controls, pause/skip majority votes |

Modal title: **Règles de la partie** + subtitle *(selon la config actuelle)*.

## Scoring copy (`responseType`)

| Mode | Lines |
|------|-------|
| **typing** | Typing pts · autocomplétion (menu au-dessus du champ) · typo tolerance |
| **qcm** | Carré only (4 propositions) — **no Duo line** (Duo is Mix-only via switch) |
| **mix** | Mix choice intro · Typing + autocomplétion · Carré · Duo (joker) |

Values from `GAME_CONFIG.SCORING`.

## Source musicale — Watched

- Mode labels match settings UI: **Union** / **Commun** (internal `watchedMode: 'intersection'`).
- No mention of bots in rules copy.
- **No playable song count** in rules (shown in lobby banner / config `SourceSection` instead).
- **Compléter avec l'aléatoire** line appears **only** when `watchedAllowFallback === true`.

## Victoire — solo

Uses the same section title as multi: **Victoire** (not « Objectif & médailles »).

Bronze threshold copy uses `effectiveMedalThresholds()` from `@aniquizz/shared` (same as `computeMedal` / mastery bar):

| Config | Display |
|--------|---------|
| Single difficulty | e.g. `Seuil Bronze (Moyen) : 50 % minimum…` |
| Multiple difficulties | Blended % + breakdown, e.g. Facile 55 % + Moyen 50 % → **52,5 %** |

Per-difficulty constants: `GAME_CONFIG.MEDALS.THRESHOLDS` (easy 55 % · medium 50 % · hard 45 % bronze).

Four medals: Bronze → Argent → Or → Platine.

## Victoire — multi

Highest score wins; podium when `playerCount >= GAME_CONFIG.VICTORY_CONDITIONS.MULTI.PODIUM_THRESHOLD` (5+). No solo medals.

## Context

```ts
interface LobbyRulesContext {
  lobbyMode: 'solo' | 'multi';
  playerCount?: number; // multi — vote copy only
}
```

## Related lobby UX (not in rules modal)

| Feature | Where |
|---------|--------|
| Watched pool banner (host) | `MultiplayerLobby` — `resolveWatchedPoolBanner()` |
| Live pool refetch on settings/roster | `useWatchedPoolStats` + `withWatchedPoolSoundCount()` |
| Fallback opt-in auto-clear | `MultiplayerLobby` / `SourceSection` when pool becomes sufficient |

See `docs/game/watched-pool-threshold.md` · `docs/game/solo-medals.md`.

## Out of scope

- Changing scoring or playlist logic (display only)
- Settings duplication in the modal
- Song start (extend `buildLobbyRulesSections` when chantier #5 ships)

## Video display modes (chantier #4 — spec)

See `docs/game/video-display-modes.md`. Rules **Déroulement** line becomes mode-aware (`hidden` / `blurred` / `peek`); reveal line stays « vidéo complète ».

## Related docs

- `docs/game/solo-medals.md` — medal thresholds & integer rounding
- `docs/game/watched-pool-threshold.md` — Watched pool & opt-in fallback
- `docs/game/video-display-modes.md` — guessing-phase video modes (26.1 #4)
