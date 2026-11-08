# Time-attack (Contre-la-montre)

Playtest closed 2026-11-08. Solo and the versus race are the finished Chrono slice of 26.7 (working tree, not committed). News, the roadmap card, and `SITE_VERSION` wait until the rest of 26.7 ships.

`GameType` with a solo run and a multiplayer **versus race** (see the end of this doc). Player-facing name: **Contre-la-montre**. Compact badge: **CLM**.

Live `gameType: 'timeAttack'`. Prisma `Match.mode = TIME_ATTACK`. Solo uses `MatchEngine`. Multi (2 to 8 players) uses `RaceEngine`.

## When it is on

`isTimeAttackGame` is any `gameType === 'timeAttack'`. `isTimeAttackSettings` is the solo shape (`mode === 'solo'` or `maxPlayers <= 1`). `isTimeAttackRace` is the versus shape.

The selector is on solo create and in a multi room. Switching to Chrono forces typing, `speedBonusEnabled: false`, and `soundCount = timeAttackPoolSize(budget)`. The form defaults the song start to the beginning; Avancé can switch it to random. The server keeps that choice. Video mode (audio only, blurred, peek) stays the room setting.

## Budget

**1 to 5 min**, step **30 s** (`normalizeTimeBudgetSeconds`). Default **3 min**.

The match budget clock (`MatchBudgetClock`) ticks **only during guessing**. Intro, ready, 3 s reveal, and solo pause are frozen. A skip (or reveal) that starts while the match is paused keeps both the budget and the clip clock frozen until resume. Authority is the server; the client interpolates `remainingMs` from `timeAttack:budget` / round payloads. There is no client `ended` event.

## Scoring

- Correct title: **+1**, then a **3 s** reveal with the budget frozen.
- Skip (`game:skip_round`): **−5 s, then −7 s, −9 s … capped at −15 s** within a run (`timeAttackTaxMs`) when `timeAttackPunitiveSkip` is on (default). Off keeps every skip at **−5 s**. The next cost is `nextSkipTaxMs` on `timeAttack:budget` and on the skip button (`Passer −N s`). With the reveal on (default), the skipped title still gets the 3 s reveal; the tax is applied immediately and the budget stays frozen during that reveal.
- Validated wrong answer: **−3 s**, stay on the same title (typing stays unlocked). Empty / too-short submits are ignored.
- Clip EOF (`clipGuessSeconds`, catalogue `Song.duration`, clamp 8–90 s, default 90): 0 points, 3 s reveal, next title.
- Advanced option `timeAttackReveal: false` (solo config, default true): no reveal after a found title, a clip end, or a skip. The outcome still arrives on `timeAttack:budget.roundResult` for the cue and the recent-titles list.
- Budget 0 (on its own, or on a skip or wrong answer that spends the last seconds): the title in progress still gets the 3 s reveal and joins the history, then `finishMatch`. No point on that title unless it was already found. With the reveal off, the outcome still arrives on `roundResult` and the match ends immediately. Pool exhausted → `finishMatch`.

Vitesse (`speedBonusEnabled`) stays off.

## Pool

`timeAttackPoolSize(budget)` draws at least one title per 3 s of budget, clamped to 20–80 (3 min → 60 titles). That headroom is stricter than the two ways a title can end early: a late random start leaves only the 8 s minimum clip, and the cheapest skip costs 5 s. `pool × 5 s` and `pool × 8 s` both cover the budget, including the 80-title cap at 5 min. Watched / playlist launch gates require `playable >= poolSize` (no silent catalogue fill).

**Song start.** Beginning plays the catalogue clip from 0 (`clipGuessSeconds`, 8–90 s). Random (`timeAttackClipWindow`) may start later, but only where 8 s of guess, the 3 s reveal, and a 2 s safety margin still fit. The guess clock becomes the audio that remains, capped at 90 s. A file too short to move stays at the beginning. The same offset is stored on the shared playlist, so every versus lane hears the same excerpt.

## Medals

Found titles per minute × duration, then the same difficulty / precision malus as Standard. Playtest constants (medium + franchise): **4 / 5 / 7 / 9** per minute → in 3 min **12 / 15 / 21 / 27**. Helpers: `timeAttackMedal`, `timeAttackMedalTargets`.

During the run the server sends `nextMedal` (`{ tier, pointsNeeded }` or `null` at platinum) on `timeAttack:budget`, round payloads, and sync. It uses the difficulties of songs actually heard, including the current clip — the same inputs as the game-over bar, not the lobby difficulty filter.

Persist `totalRounds` = titles **heard**. XP uses `correctByDifficulty` + `roundsPlayed` = heard. In solo, `isWinner` if the medal is at least bronze. Versus victory is ranked among humans only (below); the result list does not show medal names.

## Badge

`GameModeBadge`: **CLM** letters + Timer, `aqua` token. History maps `TIME_ATTACK` via `gameTypeFromStoredMode`. SPRINT rows stay Standard + Vitesse lightning.

## Versus race (multiplayer)

`isTimeAttackRace(settings)` is true for `timeAttack` rooms that are not solo-shaped. `normalizeRoomSettings` clamps `maxPlayers` to 2-8 and forbids Watched (the playlist must be identical for every lane).

- **Engine:** `RaceEngine` (`apps/server/src/modules/game/engine/`) implements `RoomMatchEngine`. One shared playlist, one `RaceLane` per player (own index, `MatchBudgetClock`, found count, skips). Common countdown start; the match ends when every lane is done.
- **Privacy:** round events (`round_start`, `round_reveal`, `timeAttack:budget`, `race:lane_done`) go to the lane's socket only. The room only receives `race:board` (found, songs heard, budget left, streak, no titles).
- **Rules:** no pause, no skip vote; skip is individual and taxed like solo. When the budget hits zero (on its own, or on a skip that spends the last seconds), that title still gets the 3 s reveal and joins the history before the lane closes. Disconnecting keeps the lane running; an explicit leave removes the lane. Bots are ranked with everyone else and are not persisted as match players. They do not take a win.
- **Ranking:** `rankRaceStandings`: most found, then fewest songs heard (8/13 beats 8/15). The same found / heard pair shares a rank, and that order (bots included) is what the result list shows. Victory, the podium, and placement XP are recomputed on humans only, with the Standard multi rule (top 3 from 5 humans, otherwise rank 1). The result screen shows the ratio, not medal names.
- **Lobby guard:** switching a lobby with more than 8 players to Chrono is refused.
