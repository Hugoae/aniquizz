# Workflow — AniQuizz Refactor

How we execute the refactor: one phase per chat, the right model, the right skills, and a strict review gate.

---

## Ritual: 1 chat = 1 phase

Each phase gets its **own Cursor chat**. Do not continue a phase across multiple long threads or carry messy context into the next phase.

### Starting a phase

1. Open a **new chat**.
2. Set workspace to `C:\Users\xhugo\Documents\Projets\aniquizz`.
3. Attach or reference: `PLAN.md`, `PROGRESS.md`, this file.
4. Prompt example:
   ```
   Execute Phase N per PLAN.md.
   Read PROGRESS.md first. Update PROGRESS.md when done.
   Follow WORKFLOW.md review ritual at the end. Do not start Phase N+1.
   ```
5. Use the model recommended in the table below.

### Ending a phase (mandatory)

1. Run phase checklist from `PLAN.md`.
2. Verify: `pnpm install` → `pnpm build` → smoke test / unit tests as applicable.
3. Summarize: changes, how to test manually, watchouts.
4. Update `PROGRESS.md` (`Current phase`, `Done`, `Next step`, blockers).
5. **Pause** — wait for your explicit `go Phase N+1` in a **new chat**.
6. **Commit** only when you ask at review (`phase(N): <summary>`).

---

## Model selection: Auto vs Opus

| Phase | Model | Why |
|-------|-------|-----|
| **0** Foundations | **Opus** | Monorepo architecture, selective copy, Prisma migrate init, repo creation |
| **1** Infra & R2 | **Opus** | MCP provisioning, S3/R2 worker, env alignment, deployment wiring |
| **2** Security | **Opus** | JWT on sockets, RLS, auth gates — mistakes are costly |
| **3** Observability | **Auto** → Opus if stuck | Structured logging is repetitive; escalate for correlation/design issues |
| **4** Cleanup | **Auto** | Deletions and type trimming; well-scoped diffs |
| **5** Engine rewrite | **Opus** | Highest complexity: architecture, typed events, anti-cheat, unit tests |
| **6** Dev tooling & Admin | **Opus** | Bots, admin authorization, live match control |
| **7** Features | **Opus** | XP, friends, leaderboard — schema + socket + UI |
| **8** UI/UX rework | **Auto** | Mostly component cleanup and polish; Opus for ambiguous UX |
| **9** CI & e2e | **Auto** | Pipeline wiring, Playwright scaffolding |

**Rule of thumb:** Opus for **architecture, security, and game engine**; Auto for **cleanup, UI polish, and CI glue**. When in doubt, use Opus at phase start.

---

## Skills (Matt Pocock / Total TypeScript style)

Matt Pocock’s ecosystem maps to these installed skills. **Read the skill file at the start of the phase** when listed.

| Phase | Primary skills | Use for |
|-------|----------------|---------|
| **0** | `typescript-expert` | Strict TS setup, monorepo paths, Prisma types, English codebase conventions |
| **1** | — | Infra/MCP; optional `typescript-expert` for env typing (zod) |
| **2** | `typescript-expert` | Branded IDs (`UserId`), JWT payload types, socket auth types |
| **3** | — | Logging is operational; `typescript-expert` if error class hierarchy |
| **4** | `typescript-expert` | Remove dead types safely, tighten `GameConfig`, shared package cleanup |
| **5** | `typescript-expert` + **`tdd`** | Typed socket contract, pure engine logic — **red → green on every pure function ported** |
| **6** | `typescript-expert` | Admin types, bot config, role guards |
| **7** | **`tdd`** + `typescript-expert` | XP curve (pure + tests first), Friendship types, leaderboard queries |
| **8** | `vercel-react-best-practices` + `web-design-guidelines` | React perf, a11y, component structure |
| **9** | **`tdd`** | Integration/e2e test design; test at agreed **seams** only |

### TDD reminder (Phases 5 & 7)

From the `tdd` skill:

- **Red before green** — failing test first, minimal implementation.
- **Vertical slices** — one test → one implementation → repeat (not all tests then all code).
- **Test at seams** — public interfaces only (e.g. `isAnswerCorrect`, `ScoringStrategy.score`, XP calc), not internals.
- **No tautological tests** — expected values from spec/literals, not copy-pasted production logic.

### TypeScript reminder (all phases)

From `typescript-expert`:

- Prefer **strict** config; no new `any`.
- Branded types for domain IDs (`UserId`, `RoomId`) at boundaries.
- Shared types live in `packages/shared`; socket contract typed both sides in Phase 5.

---

## File layout reference

```
C:\Users\xhugo\Documents\Projets\
├── old-AniQuizz/     ← read-only reference
└── aniquizz/         ← active repo (this project)
    ├── PLAN.md
    ├── PROGRESS.md
    └── WORKFLOW.md
```

---

## Quick commands (after Phase 0)

```bash
pnpm install
pnpm dev          # client + server
pnpm build
pnpm test         # after Vitest is wired (Phase 5+)
```

Smoke checks vary by phase — see `PLAN.md` phase boundary protocol.
