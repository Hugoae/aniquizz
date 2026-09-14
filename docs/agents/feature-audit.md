# Feature audit prompt

Paste this into a new agent chat (one feature at a time). Replace `FEATURE`
with the domain name (`Auth`, `Home`, `Hub`, `Game`, …).

---

```
Audit FEATURE end-to-end. Do not implement yet unless I explicitly ask to
fix a finding. Do not start 26.7 or other parked work.

This repo: pnpm + Turborepo. Graphify-first (`.cursor/rules/graphify.mdc`).
Read CONTEXT-MAP.md and the relevant package CONTEXT.md files before scanning.
Code/comments/commits English; user-facing UI French.

## Scope

Cover the whole FEATURE surface, not just the `features/FEATURE/` folder:
client UI + hooks + copy, server handlers/routes/services, shared types and
Zod, Prisma if touched, socket events, HTTP, tests, docs.

If FEATURE shares state, routes, or components with neighbours, say what
must stay consistent (do not audit those neighbours in full).

## Lenses (all of them)

1. **Code quality** — naming, dead code, duplication, comments that explain
   why, English-only comments, no `any`, no leaked secrets in logs.
2. **Partitioning** — ~300–400 line soft cap; extract hooks / subcomponents /
   pure helpers in `packages/shared` instead of growing god-files.
3. **Project rules** — AGENTS.md, package CONTEXT.md pitfalls, socket contract
   in `packages/shared` (`events.ts` / `game.ts` / `socketPayloads.ts`),
   identity = JWT `userId` never `socket.id`, mutating sockets Zod-parsed,
   package import walls, design tokens (no hardcoded theme hex), copy isolated
   for i18n.
4. **Security** — authz, IDOR, injection, XSS, CSRF/cookies, JWT handling,
   rate limits, mass assignment, verbose errors, secrets, RGPD deletion if
   relevant. Server is authoritative.
5. **Performance** — unnecessary renders, waterfalls, bundle, list
   virtualization, socket chatter, N+1, cache keys.
6. **Logic / product** — happy path, empty/error/loading, reconnect, races,
   URL/state, invariants vs docs (`docs/game`, `docs/security`).
7. **Design / a11y / UX** — tokens, shadcn primitives, `.glass-card`,
   `FOCUS_RING`, `prefers-reduced-motion`, jsx-a11y, French copy. Parked:
   14 existing jsx-a11y warns (FriendsPanel, GameSidebar, PlayerCardBase, …)
   — note if FEATURE adds new ones; do not “fix the backlog” unless this
   FEATURE owns those files.
8. **Tests** — missing cases for the risky paths you found.

## Method

- Graphify `query` / `path` / `explain` before Grep/Read.
- Trace one user journey end to end (click → network/socket → DB → UI).
- Prefer evidence (file:line, payload, test gap) over taste.
- Do not mass-reformat or drive-by refactors.

## Deliverable

A canvas (or a short report if a canvas is overkill) with findings triaged:

| Sev | Meaning |
|-----|---------|
| P0  | Wrong, insecure, or data-losing — fix before shipping more FEATURE work |
| P1  | Real bug or rule break — fix in this audit pass |
| P2  | Quality / a11y / split — schedule, don’t block |
| OK  | Explicitly good; keeps us from re-litigating it |

Each finding: severity, lens, files, what’s wrong, suggested fix (no patch
unless I ask). End with: what you did not verify, and a recommended fix order.
```
