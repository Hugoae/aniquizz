# Solo medals (Standard mode)

Solo victories are graded with **medals** (Bronze → Platine), not a simple win/loss. The grade depends on the **mastery ratio**: earned score divided by the best score obtainable on the rounds actually played.

Answer mode matters: QCM caps at 2 pts/round, typing at 5. Acing every round in Duo (1 pt) cannot earn a top medal even with 100% correct answers.

Song difficulty shifts the ratio thresholds (easier songs require a higher ratio for the same tier). For mixed-difficulty playlists, thresholds are the **mean** across the songs played.

## Source of truth

| Layer | Module | Role |
|-------|--------|------|
| Threshold constants | `packages/shared/src/constants.ts` (`GAME_CONFIG.MEDALS.THRESHOLDS`) | Per-difficulty ratio bars |
| Pure logic | `packages/shared/src/grading.ts` | `medalMarkerScores`, `computeMedal`, `nextMedalGoal` |
| Match end | `packages/shared/src/victory.ts` → `MatchEngine.finish()` | Server-authoritative `soloMedal` on `game_over` |
| Game-over UI | `apps/client/.../SoloMasteryBar.tsx` | Bar markers, labels, next-tier hint |

Player identity and persistence follow the usual JWT `userId` rules; medals are computed at match end, not stored as a separate enum on the profile (stats derive from match history).

## Integer rounding (fix 26.1-prep, 2026-07-10)

Medal tiers are resolved with **rounded integer score thresholds**:

```ts
requiredScore = Math.round(effectiveRatio × maxPossibleScore)
medal         = highest tier where score >= requiredScore
```

All consumers share `medalMarkerScores()` so the server award, bar labels, marker positions, and `nextMedalGoal` stay consistent.

### Bug (pre-fix)

The mastery bar **labels** already used `Math.round(ratio × maxScore)`, but `computeMedal()` compared **raw float ratios**. JavaScript cannot represent `0.9` exactly; after averaging medium songs the platinum bar landed at `0.9000000000000001`.

**Symptom:** 18/20 pts in QCM (medium) — bar showed the Platine marker at **18** and the fill reached it, but the badge awarded **Or**.

```text
score ratio:          0.90000000000000002  (18 / 20)
platinum threshold:   0.90000000000000013  (mean of 0.9 literals)
ratio >= threshold:   false                → gold
Math.round(thr × 20): 18                   → label "18"
```

Same boundary on typing: **45/50** medium.

### Fix

- `computeMedal(score, maxPossibleScore, difficulties)` — integer comparison via `medalMarkerScores`
- `SoloMasteryBar` — `score >= markerScores[tier]` for earned state; labels read from the same map
- `nextMedalGoal` — unchanged formula, now aligned with `computeMedal`

### Tests

`packages/shared/src/grading.test.ts` — boundary cases 18/20 QCM and 45/50 typing.

`packages/shared/src/victory.test.ts` — end-to-end `computeVictory` QCM regression.

## Medium difficulty reference (QCM, max 20 pts)

| Tier | Ratio | Rounded pts |
|------|-------|-------------|
| Bronze | 0.50 | 10 |
| Argent | 0.58 | 12 |
| Or | 0.70 | 14 |
| Platine | 0.90 | 18 |
