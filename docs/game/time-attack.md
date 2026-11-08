# Time-attack (Contre-la-montre)

Solo-only `GameType`. Player-facing name: **Contre-la-montre**. Compact badge: **CLM**.

Live `gameType: 'timeAttack'`. Prisma `Match.mode = TIME_ATTACK`. Multiplayer is **out of this slice** — `normalizeRoomSettings` demotes `timeAttack` + `maxPlayers > 1` to Standard.

## When it is on

`isTimeAttackSettings(settings)` in `packages/shared/src/timeAttack.ts` is true only if:

- `gameType === 'timeAttack'`
- Solo (`mode === 'solo'` or `maxPlayers <= 1`)

The selector lives on `/play/create?intent=solo` (`GameTypeSelector`, mounted when `!isRoom`). Switching to Chrono forces typing, `songStartMode: 'beginning'`, `speedBonusEnabled: false`, and `soundCount = timeAttackPoolSize(budget)`.

## Budget

**1 to 5 min**, step **30 s** (`normalizeTimeBudgetSeconds`). Default **3 min**.

The match budget clock (`MatchBudgetClock`) ticks **only during guessing**. Intro, ready, 3 s reveal, and solo pause are frozen. A skip (or reveal) that starts while the match is paused keeps both the budget and the clip clock frozen until resume. Authority is the server; the client interpolates `remainingMs` from `timeAttack:budget` / round payloads. There is no client `ended` event.

## Scoring

- Correct title: **+1**, then a **3 s** reveal with the budget frozen.
- Skip (`game:skip_round`): **−5 s, then −7 s, −9 s … capped at −15 s** within a run (`timeAttackTaxMs`) when `timeAttackPunitiveSkip` is on (default). Off keeps every skip at **−5 s**. The next cost is `nextSkipTaxMs` on `timeAttack:budget` and on the skip button (`Passer −N s`). With the reveal on (default), the skipped title still gets the 3 s reveal; the tax is applied immediately and the budget stays frozen during that reveal.
- Validated wrong answer: **−3 s**, stay on the same title (typing stays unlocked). Empty / too-short submits are ignored.
- Clip EOF (`clipGuessSeconds`, catalogue `Song.duration`, clamp 8–90 s, default 90): 0 points, 3 s reveal, next title.
- Advanced option `timeAttackReveal: false` (solo config, default true): no reveal after a found title, a clip end, or a skip. The outcome still arrives on `timeAttack:budget.roundResult` for the cue and the recent-titles list.
- Budget 0 or pool exhausted → `finishMatch`. No point on the title in progress when the budget hits 0.

Vitesse (`speedBonusEnabled`) stays off.

## Pool

`timeAttackPoolSize(budget) = min(80, max(20, ceil(budget / 3)))` (3 min → 60 titles). Watched / playlist launch gates require `playable >= poolSize` (no silent catalogue fill). Clips start at the beginning.

## Medals

Found titles per minute × duration, then the same difficulty / precision malus as Standard. Playtest constants (medium + franchise): **4 / 5 / 7 / 9** per minute → in 3 min **12 / 15 / 21 / 27**. Helpers: `timeAttackMedal`, `timeAttackMedalTargets`.

During the run the server sends `nextMedal` (`{ tier, pointsNeeded }` or `null` at platinum) on `timeAttack:budget`, round payloads, and sync. It uses the difficulties of songs actually heard, including the current clip — the same inputs as the game-over bar, not the lobby difficulty filter.

Persist `totalRounds` = titles **heard**. XP uses `correctByDifficulty` + `roundsPlayed` = heard. `isWinner` if the medal is at least bronze.

## Badge

`GameModeBadge`: **CLM** letters + Timer, `aqua` token. History maps `TIME_ATTACK` via `gameTypeFromStoredMode`. SPRINT rows stay Standard + Vitesse lightning.
