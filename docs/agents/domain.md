# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

**Layout: multi-context** (this is a pnpm + Turborepo monorepo).

## Before exploring, read these

- **`CONTEXT-MAP.md`** at the repo root — it points at one `CONTEXT.md` per context. Read each one relevant to the topic.
- Per-context **`CONTEXT.md`** files, e.g. `apps/server/CONTEXT.md`, `apps/client/CONTEXT.md`, `packages/shared/CONTEXT.md`, `packages/database/CONTEXT.md`.
- **`docs/adr/`** — system-wide architectural decisions. Also check context-scoped decisions under `apps/<context>/docs/adr/` or `packages/<context>/docs/adr/` for the area you're about to work in.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

Multi-context repo (presence of `CONTEXT-MAP.md` at the root):

```
/
├── CONTEXT-MAP.md                     ← points at each context's CONTEXT.md
├── docs/adr/                          ← system-wide decisions
├── apps/
│   ├── server/
│   │   ├── CONTEXT.md
│   │   └── docs/adr/                  ← context-specific decisions
│   └── client/
│       ├── CONTEXT.md
│       └── docs/adr/
└── packages/
    ├── shared/
    │   └── CONTEXT.md
    └── database/
        └── CONTEXT.md
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in the relevant `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_
