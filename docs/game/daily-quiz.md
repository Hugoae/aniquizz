# Quiz du jour

Daily is a **separate** product from ordinary matches. It reuses catalogue queries,
QCM construction (`buildChoices` / `resolveRoundAnswerSet`), and presentational
game UI. It does **not** persist through `MatchRepository` and does not increment
`gamesPlayed`, wins, guesses, or win streak. There are no medals.
Heard clips **do** upsert `SongHistory` (pokédex) the same way as a match — only
rounds whose clip started (`position <= currentRound`), not forfeited leftovers.

## Product contract

- Five globally identical songs per Paris calendar day, **QCM only**, precision **anime**.
- Account required. One official attempt per profile; leaving mid-run (quit,
  refresh, close tab, disconnect) forfeits remaining rounds as unanswered.
  There is no resume.
- Play clock is **per round** (`DAILY_GUESS_MS` + `DAILY_REVEAL_MS`, 15s each).
  There is no 15-minute attempt budget; leftover `DailyAttempt.expiresAt` is not a play rule.
- Reset at midnight `Europe/Paris`. The server returns `challengeDate` and `resetsAt`;
  clients never infer the boundary. DST is handled with `Intl` timezone conversion
  (`packages/shared/src/dailyCalendar.ts`).
- Primary score: correct answers over the active denominator (usually `/5`).
- Recap **Victoire** from `DAILY_WIN_MIN_CORRECT` (3) songs found, or all remaining
  songs if the day is shorter. Persisted on `DailyAttempt.won` and counted in
  `DailyPlayerStats.wins`. It does not gate streak or the leaderboard; it does
  add the daily win XP bonus.
- Leaderboard: correct desc, then cumulative response time asc (ties share a rank).
  Shown on the daily landing even before the player has attempted the day.
  Daily has no points — ranking is `/N` found, then time.
- Completing, including `0/5`, advances the dedicated daily streak.
- XP once, aligned with a 5-round QCM solo: participation (`3` × active songs) +
  `12` per correct, plus `20` on recap victory and `10` extra for a perfect day
  (15 XP at 0/5, 105 XP at 5/5). Awarded on first completion only; already
  awarded XP is never rewritten.

## Data

Server-only Prisma models (`DailyChallenge`, `DailyChallengeRound`, `DailyAttempt`,
`DailyAttemptAnswer`, `DailyPlayerStats`). RLS enabled; client roles revoked.
Song deletion `SetNull`s `songId` and keeps the frozen round snapshot.
Profile deletion cascades attempts and stats.

Finished attempts store `won`, `activeRoundCount`, `correctCount`,
`totalResponseMs`, `xpAwarded`, and `rank` (live standing among that day's
finishers, 1-2-2-4 ties, refreshed on every completion or void of the day).
Profile history merges the last `PROFILE_HISTORY_TAKE` matches and daily
attempts by `playedAt`. Daily rows use `kind: 'daily'` and do not write a
`Match`. Heard clips upsert `SongHistory` (same pokédex as a match) for
`position <= currentRound` only. `DailyPlayerStats` keeps completions, wins, streaks, and perfect days.
Career rank/time/correct totals are aggregated from the attempt ledger at
profile read time (`summarizeDailyCareer`).

A live broken round can be **voided** globally (today only, once someone has started).
Results recompute against the reduced denominator (`won` included); already-awarded XP
is left unchanged. Future days replace the song instead of voiding. There is no
“cancel the whole quiz” control in admin — a cancelled day would hide the product.

Today’s lineup stays editable until the first attempt; past days are read-only.

Launch numbering starts at **#1 on 2026-09-15** (update 26.6).

## Generation

Rolling 14-day horizon, generated on server start, every six hours, and lazily on Daily
request. Postgres uniqueness on `challengeDate` makes multi-instance generation safe.
Snapshots (clip offset + four choices) persist immediately so later catalogue edits
cannot change a ready challenge. Clip start is **random** within the track
(`pickDailyClipStart`), leaving room for guess + reveal duration.

The generator reads a slim OP/ED catalogue (cached ~15 min) so the 14-day horizon
does not scan the full catalogue per day. Force-regenerate drops that cache.
Selection constraints and the documented relaxation order live in
`apps/server/src/modules/daily/dailySelection.ts`.

Admin **Tirer au hasard** uses the same pool but a different pick: uniform among
franchises (not songs), then uniform OP/ED inside the franchise, preferring
mid/low AniList popularity. It does not lock to the slot’s current type.

## Admin

Staff review the rolling horizon in the admin Daily tab. Today stays editable
until the first attempt; past days are read-only. A live broken round can be
voided (today only). There is no “cancel the whole quiz” control.

| Tool              | Behaviour                                                                                                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Search            | Same matching as the library, plus type tokens (`bleach ED5`, `naruto OP1`). Suggestions portal to `document.body` and open **above** the field when there is no room below.                                 |
| Replace / shuffle | Pick another playable OP/ED; shuffle avoids other rounds’ franchises.                                                                                                                                        |
| Nouveau passage   | Re-rolls `videoStartTime` with `pickDailyClipStart`.                                                                                                                                                         |
| Lineup warnings   | Duplicate franchise, missing video, placeholders, recent song/franchise, difficulty/type mix.                                                                                                                |
| Reset player      | Deletes **today’s** attempt (answers cascade), reverts that attempt’s XP/level, rewinds dedicated daily streak/completions if the day counted, recomputes ranks. Previous days, likes, and match stats stay. |

## Play loop

HTTP only (no Socket.io room). `GET /daily/today` is public metadata; authenticated
calls also receive personal status. It may **complete** a run that already has every
playable song answered. It does **not** time out the current guess, start the next
song, or return a playable round (`openAttemptId` only — play payloads come from
POST start/next/answer). Reopening `/daily` while `IN_PROGRESS` forfeits remaining
rounds. Guessing payloads never include anime/title/artist
or valid answers. Guessing mirrors solo QCM: the player may change their choice until
the guess timer ends (or they press Révéler); only then does the server lock the
answer and open the reveal window (`DAILY_REVEAL_MS`, same length as the guess).
The guess wall clock includes the same soft margins as Standard matches
(`GUESS_START_BUFFER` + `GUESS_END_GRACE`). The client commits at the visual 15s
mark (same as Standard’s timer). A late `/answer` after the wall still records the
choice and returns reveal — it must not 409. Leaving the play surface forfeits the
attempt. There is no 15-minute attempt TTL: a long gap only times out the current
guess window on a **play** request (`/answer`, `/next`), not on `GET /today`.

## Selection

Target mix per day (shuffled order): **2 easy, 2 medium, 1 hard**, plus an OP/ED mix
(3+2 alternating by challenge number) and popularity bands (2 high / 2 mid / 1 low).
Franchise uniqueness and lookbacks apply; if the pool is thin the generator relaxes
constraints in a documented order (`DAILY_RELAXATION_STEPS`).
