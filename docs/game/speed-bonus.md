# Speed bonus (Vitesse)

Standard multiplayer **typing** modifier. Not a `GameType`. Player-facing name: **Vitesse**.

## When it is on

`isSpeedBonusEnabled(settings)` in `packages/shared/src/speedBonus.ts` is true only if:

- `speedBonusEnabled === true`
- `responseType === 'typing'`
- `maxPlayers >= 2`
- `mode !== 'solo'`

The host switch lives in **Général**, after the response-type buttons (`RulesSection`). Hidden in solo. QCM / Mix disable the switch and clear the flag. `normalizeRoomSettings` applies the same gate so a stale client cannot keep the modifier on.

## Scoring

Typing base is unchanged (`GAME_CONFIG.SCORING.TYPING`). At `endRound`, correct answers sorted by `answerTimeMs` receive a podium bonus:

| Correct answers | Bonuses (fastest first) |
| --------------- | ----------------------- |
| 1               | +0                      |
| 2               | +2 / +1                 |
| 3+              | +3 / +2 / +1 (top 3)    |

Reveal emits `speed:leaderboard` per socket (top 3 + a private « Vous » row). Game-over history shows time, rank, and `base+bonus`.

## Persistence

Prisma `GameMode.SPRINT` is **not renamed**. `Match.mode = SPRINT` iff the modifier was active. `gameTypeFromStoredMode` always returns `'standard'`. `speedBonusFromStoredMode('SPRINT')` is true for history badges.

One-release wire compat: old clients sending `gameType: 'sprint'` are lifted to `standard` + typing + `speedBonusEnabled: true`.

## Badge

`GameModeBadge`: STD letters + trophy. Accent lightning overlay when the modifier is on. `aria-label`: « Standard, bonus Vitesse ».
