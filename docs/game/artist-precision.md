# Artist answer precision

Players can guess the **performer** instead of the anime. The next precision after Franchise / Anime is **Artiste**, not the song title.

## Accepted answers

| Input                                     | Typing                                       | Autocomplete                                    | QCM / Duo                                                                                |
| ----------------------------------------- | -------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Any unit in `Song.artistNames`            | Yes                                          | Yes (that unit only)                            | Correct option = **first billed unit**; other units of the same song are not distractors |
| Full display credit (`Song.artist`)       | Yes, as extra free-type tolerance on collabs | No (never listed when it is a composite `A, B`) | No                                                                                       |
| Song title                                | No                                           | —                                               | —                                                                                        |
| Anime / franchise name                    | No                                           | —                                               | —                                                                                        |
| Empty / unknown / punctuation-only credit | Unplayable — song is excluded                | —                                               | —                                                                                        |

Examples: a collab `CHiCO, HoneyWorks` accepts `CHiCO`, `HoneyWorks`, or the full string if typed by hand. QCM shows `CHiCO` (first billed), never `CHiCO, HoneyWorks`. `Fear, and Loathing in Las Vegas` stays one atomic name in every mode. `μ` matches as a unit.

Unicode identity uses `answerIdentityKey` in `packages/shared` so Greek/CJK names are not stripped to empty by `normalizeString`.

## First billed unit (QCM target)

`artistNames[0]` is **first billed**, not a curated “lead vocalist / who sings in the clip”:

- Catalogue ingest joins AnimeThemes `song.artists` in API relationship order, then `Song.artist` is that list joined with `", "`.
- Curated `feat.` / `with` overrides in `parse-artist-names.ts` put the billed act first (`The Seatbelts`, `CHiCO`, `Kevin Penkin`).
- On the live catalogue this matches the left-hand display token for every multi-unit song (no rows where `[0]` is not a prefix of `artist`).

Equal collabs (`FLOW, GRANRODEO`, seiyuu ensembles) have no principal field. First billed is still the right QCM target: it is stable per song, matches the reveal credit’s left side, and keeps Mix/bots on `validAnswers[0]`. Random-per-round would desync QCM from reveal. An explicit principal column would need schema + curation.

## Medals

`PRECISION_OFFSET.artist = -0.08` (franchise `0`, anime `-0.05`). Scoring points are unchanged (typing 5 / QCM 2 / duo 1).

## QCM / Duo

- Every option is a **billed unit**. Composite credits (`LiSA, Felix`) never appear as buttons, so a two-voice clip cannot uniquely pick the comma option.
- Correct choice = `resolveArtistQcmTarget` → `artistNames[0]` (fallback: the display credit when no structured names exist).
- Distractors are units from the same song universe. Any unit that typing would accept for this round is excluded (no HoneyWorks next to a CHiCO/HoneyWorks song).
- Launch is blocked when the pool has fewer than 4 **distinct units** (`hasEnoughQcmNames` / `qcmPoolTooSmallReason`).

## Autocomplete

Socket events `artist:get_all` / `artist:all_names` and `artist:search` / `artist:search_results`. Labels come from `collectArtistSearchLabels` (units only, including atomic comma-in-name bands). Client hook: `useArtistSearch`.

`round_start` still must not leak `validAnswers` or `artistNames`. Reveal still shows the full `Song.artist` credit.
