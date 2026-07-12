# Context — `@aniquizz/shared`

**Role:** Framework-agnostic code imported by both apps via `workspace:*`. Holds the
typed Socket.io contract and all **pure** game logic (no I/O, no framework). This is
the single source of truth for anything that crosses the wire.

See [`README.md`](./README.md) for the module table and build commands.

## Glossary

| Term | Definition | Where |
|------|------------|-------|
| **Socket contract** | The `ClientToServerEvents` / `ServerToClientEvents` interfaces — every event name and payload shape. Client and server both type against these; never redeclare. | `events.ts` |
| **RoomSettings / RoomConfig** | The lobby configuration (difficulty, sounds, time, mode, responseType, precision, source). Drives the whole match. | `game.ts` |
| **Precision** | `franchise` \| `anime`. `normalizePrecision()` maps the legacy `exact` → `anime`. | `game.ts` |
| **Medal** | Solo grade Bronze → Platine. `computeMedal(score, maxScore, difficulties, precision)` compares the earned integer score against rounded tier thresholds. | `grading.ts` |
| **Mastery ratio** | Earned / max score, blended across selected difficulties then offset by precision (`MEDALS.PRECISION_OFFSET`). | `grading.ts`, `constants.ts` |
| **Victory** | Game-over result: solo medal or multiplayer podium. `computeVictory(input)` takes `precision`. | `victory.ts` |
| **Fuzzy suggestions** | Ranked autocomplete matches for a typed title, capped at `FUZZY.SUGGESTION_LIMIT`. | `utils.ts`, `constants.ts` |
| **Choice candidate pool** | The set of animes used to build QCM distractors; `buildChoiceCandidatePool(rows, precision, watchedIds?)` filters + dedupes. | `selection.ts` |

## Known pitfalls

- **The server reads types from `dist/`, not `src/`.** After editing any `.ts` here,
  run `pnpm --filter @aniquizz/shared build` before restarting the server or you get
  stale-type errors (e.g. `TS2353` on a new field). Nodemon does **not** rebuild this.
- **Every pure function ships with a `*.test.ts` in this package.** Grading, victory,
  scoring, selection, watched pool, and fuzzy match are all unit-tested here — update
  the tests in the same change (TDD-friendly).
- **Integer medal thresholds, not float ratios.** `medalMarkerScores()` is the single
  source of truth so the game-over medal matches the mastery-bar label (float compares
  like `0.9 >= 0.9000…1` previously mis-awarded a tier).
- **Precision offset lowers tiers for `anime`.** Adding a difficulty or changing
  `PRECISION_OFFSET` shifts every medal boundary — re-check `grading.test.ts` /
  `victory.test.ts`.
- Keep this package free of `react`, `express`, `prisma`, or `socket.io` runtime
  imports. Types only from those where unavoidable.
