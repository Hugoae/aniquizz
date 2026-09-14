# Context — `@aniquizz/shared`

**Role:** Framework-agnostic code imported by both apps via `workspace:*`. Holds the
typed Socket.io contract and all **pure** game logic (no I/O, no framework). This is
the single source of truth for anything that crosses the wire.

See [`README.md`](./README.md) for the module table and build commands.

## Glossary

| Term                          | Definition                                                                                                                                                                                                                                          | Where                              |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| **Socket contract**           | The `ClientToServerEvents` / `ServerToClientEvents` interfaces — every event name and payload shape. Client and server both type against these; never redeclare. Mutating events also have Zod schemas in `socketPayloads.ts`.                      | `events.ts`, `socketPayloads.ts`   |
| **RoomSettings / RoomConfig** | The lobby configuration (difficulty, sounds, time, mode, responseType, precision, source). Drives the whole match.                                                                                                                                  | `game.ts`                          |
| **Precision**                 | `franchise` \| `anime` \| `artist`. `normalizePrecision()` maps the legacy `exact` → `anime`. Artist typing accepts any billed `artistNames` unit (plus the display credit as free-type); QCM uses the first billed unit. Title/anime do not count. | `precision.ts`, `artistAnswers.ts` |
| **Medal**                     | Solo grade Bronze → Platine. `computeMedal(score, maxScore, difficulties, precision)` compares the earned integer score against rounded tier thresholds.                                                                                            | `grading.ts`                       |
| **Mastery ratio**             | Earned / max score, blended across selected difficulties then offset by precision (`MEDALS.PRECISION_OFFSET`).                                                                                                                                      | `grading.ts`, `constants.ts`       |
| **Victory**                   | Game-over result: solo medal or multiplayer podium. `computeVictory(input)` takes `precision`.                                                                                                                                                      | `victory.ts`                       |
| **Fuzzy suggestions**         | Ranked autocomplete matches for a typed title, capped at `FUZZY.SUGGESTION_LIMIT`. Prepare once with `prepareFuzzyCatalogue`.                                                                                                                       | `utils.ts`, `constants.ts`         |
| **Choice candidate pool**     | The set of animes used to build QCM distractors; `buildChoiceCandidatePool(rows, precision, allowedAnimeIds?)` filters + dedupes. Empty `[]` is a closed universe (not global).                                                                     | `selection.ts`                     |
| **Thematic playlist recipe**  | Staff pack membership: genres/tags/year/formats + include/exclude. Year is the song anime's `seasonYear`.                                                                                                                                           | `playlist.ts`                      |
| **Daily challenge**           | Five-song QCM, not a Match. `decideDailySettle({ allowAdvance: false })` is GET `/today` — close a fully answered run, never start the next song.                                                                                                   | `daily.ts`                         |

## Known pitfalls

- **The server reads `@aniquizz/shared` from `dist/`, not `src/`.** `pnpm dev`
  (and `pnpm dev:server`) run `tsc --watch` on this package and nodemon restarts
  when `dist/` changes. A one-shot `pnpm --filter @aniquizz/shared build` is
  still required before CI-style commands if `dist/` is missing. Nodemon alone
  does not compile this package.
- **Every pure function ships with a `*.test.ts` in this package.** Grading, victory,
  scoring, selection, watched pool, playlist membership, and fuzzy match are all unit-tested here — update
  the tests in the same change (TDD-friendly).
- **Integer medal thresholds, not float ratios.** `medalMarkerScores()` is the single
  source of truth so the game-over medal matches the mastery-bar label (float compares
  like `0.9 >= 0.9000…1` previously mis-awarded a tier).
- **Precision offset lowers tiers for `anime` (−0.05) and `artist` (−0.08).** Adding a difficulty or changing
  `PRECISION_OFFSET` shifts every medal boundary — re-check `grading.test.ts` /
  `victory.test.ts`.
- Keep this package free of `react`, `express`, `prisma`, or `socket.io` runtime
  imports — ESLint `no-restricted-imports` fails the CI if they appear, including
  `import type`. **Zod is allowed** (socket and shared validation).
