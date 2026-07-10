# Video display modes (26.1 #4)

Guessing-phase presentation for OP/ED clips. **Reveal** always shows the full sharp video (unchanged). **Scoring is identical** across modes — cosmetic / fun only.

## Modes

| `videoMode` | Guessing phase | Reveal |
|-------------|----------------|--------|
| `hidden` (default) | Black stage, audio only — current `VideoStage` `opacity-0` behaviour | Full video fade-in |
| `blurred` | Video plays under a strong CSS blur | Full sharp video |
| `peek` | Small **clear** square; rest of frame masked (black) | Full sharp video |

No **full visible video during guess** in v1.

## Peek geometry (product spec)

| Constant | Value | Notes |
|----------|-------|-------|
| Window size | **22 %** of the **short side** of the 16:9 stage | Square aperture |
| Edge margin | **≥ 8 %** from each border | Avoids a window always centred |
| Position | Random **once per round** at `round_start` | Fixed for the whole guess phase |
| Multiplayer | **Same** `{ x, y, size }` for every player in the room | Server-authoritative |
| Between rounds | New random position each round | |

### Server payload (anti-cheat baseline)

- Do **not** expose peek geometry before `round_start`.
- Server generates rect when the round begins; clients apply it locally.
- Include in round payload, e.g. `peekWindow?: { xPercent: number; yPercent: number; sizePercent: number }`.
- Generation: uniform random top-left within `[margin, 100 - margin - size]` on both axes (`size` = 22).

Client-side DOM inspection remains possible (same class as today); geometry timing matches answer secrecy.

## Lobby UX — `GameConfigForm` tabs

Tabs **above** the sons / timer row (solo + multi configuration modal):

| Tab | Content |
|-----|---------|
| **Général** | Current form: `RoomSettingsSection`, `RulesSection`, `SourceSection`, `FiltersSection` |
| **Avancé** | **Affichage vidéo** — 3-option picker (radio cards) |

French labels (UI):

- **Audio seul** — `hidden` — *Fond noir pendant le guess, comme aujourd'hui.*
- **Vidéo floutée** — `blurred`
- **Fenêtre aléatoire** — `peek` — *Petit carré net, position différente à chaque manche.*

Default: **Audio seul** (`hidden`). Host can change in solo; host only in multi (guests read rules).

## Lobby rules copy (`lobbyRulesCopy.ts`)

Replace the hardcoded flow line *« vidéo cachée »* with a mode-aware line in section **Déroulement**:

| Mode | French line |
|------|-------------|
| `hidden` | Chaque manche : extrait audio diffusé, **vidéo cachée** (fond noir), tu devines avant la fin du chrono. |
| `blurred` | Chaque manche : extrait audio et **vidéo floutée** pendant le guess, tu devines avant la fin du chrono. |
| `peek` | Chaque manche : extrait audio et **une petite fenêtre vidéo** (position aléatoire, nouvelle à chaque manche) ; le reste de l'image est masqué. Tu devines avant la fin du chrono. |

Shared tail (all modes):

- `precisionFlowLine(config.precision)`
- Révélation de la bonne réponse **avec la vidéo complète**, puis manche suivante jusqu'à la fin de la playlist.

Optional summary chip (Résumé): **Vidéo** → *Audio seul* / *Floutée* / *Fenêtre*.

## Implementation touchpoints

| Layer | Work |
|-------|------|
| `packages/shared` | `videoMode` on `GameConfig` / `RoomSettings`; zod in `settings.ts`; peek constants |
| Server | Generate `peekWindow` on `round_start`; persist in `MatchRound` or round payload only |
| Client `VideoStage` | Render hidden / blur filter / clip-path mask for peek |
| `GameConfigForm` | Tab shell Général \| Avancé + `VideoDisplaySection` |
| `lobbyRulesCopy.ts` | `videoFlowLine(videoMode)` + optional chip |
| Tests | Shared zod · rules copy · peek rect bounds unit test on server helper |

## Out of scope v1

- Scoring modifiers per mode
- Full video visible during guess
- Moving peek window mid-round
- User-adjustable peek size
- Playlists tab (deferred backlog post-26.2)

## Related

- `apps/client/.../parts/VideoStage.tsx` — current hide-on-guess
- `docs/game/standard-rules.md` — rules modal reference
