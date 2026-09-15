# New-chat kickoff prompt

Paste the block below as the **first message** of a new agent conversation, then
replace the last line with the actual task. Canonical copy lives here so it
tracks `AGENTS.md` / `PLAN.md` after audits.

The paste is **French** (discussion). Code, comments, logs, and commits stay
**English**; user-facing UI stays **French** (vousvoiement).

---

```
Tu travailles sur AniQuizz, un monorepo pnpm + Turborepo (client React+Vite+shadcn
sur Vercel, serveur Express+Socket.io+Prisma sur Render, packages/shared,
packages/database).

Avant d'écrire du code, construis ton contexte dans cet ordre et ARRÊTE-TOI si
quelque chose n'est pas clair :

1. Lis AGENTS.md en entier — point d'entrée (carte d'architecture, exploration
   graphify-first, pré-vol CI, typage, tokens CSS, partition des fichiers, langue,
   skills, kickoff).
2. Lis CONTEXT-MAP.md, puis le CONTEXT.md du package concerné (rôle, glossaire,
   pièges). Un seul petit fichier ciblé suffit.
3. Lis PLAN.md — version/phase courante et roadmap. Identifie la phase COURANTE.
   N'anticipe pas. N'implémente pas une version parked (HIBP ; pokédex /
   rework Admin en 26.7 tant que 26.6.1 n'est pas close).
4. Lis PROGRESS.md — dernier livrable, décisions, état, prochaine étape.
5. Ne survole ARCHITECTURE.md que pour la section utile à la tâche.
6. Pour un audit de feature, utilise docs/agents/feature-audit.md (10 lentilles,
   smoke connecté obligatoire). Ce kickoff n'est pas un audit.

Discipline d'exploration (économe en tokens) :
- Graphify AVANT Read/Grep/Glob pour toute question d'architecture ou
  inter-fichiers : graphify-out/wiki/index.md, puis `graphify query "..."`,
  `graphify path "A" "B"`, `graphify explain "X"`.
- Ne lis des fichiers précis qu'une fois orienté par graphify.
- Après avoir édité du code, lance `graphify update .`. Si tu as touché
  packages/shared, `pnpm --filter @aniquizz/shared build` avant de relancer le
  serveur (le serveur lit `packages/shared/dist/`, pas `src/`).

Règles de travail :
- Une SEULE phase à la fois (PLAN.md). TypeScript strict, pas de `any`.
- Données réseau typées via packages/shared/src/events.ts et game.ts.
  Mutateurs socket parsés avec Zod dans socketPayloads.ts au handler.
- Identité joueur = userId JWT (`socket.data.userId`), jamais socket.id.
- Texte UI en français (vousvoiement, copy isolée) ; code / commentaires /
  logs / commits en anglais.
- Tokens de design (apps/client/src/index.css) via Tailwind sémantique — pas de
  hex/rgb de thème en dur. jsx-a11y recommended est error : ne pas repasser en
  warn. Respecte prefers-reduced-motion. Cap mou ~300–400 lignes par fichier.
- Charge le SKILL.md pertinent (table des skills dans AGENTS.md). Bugbot et
  review sécurité seulement si je le demande.
- Murs d'imports : client ↛ server/database ; shared ↛ react/express/Prisma/
  Socket.io runtime ; server ↛ react/client.
- Prisma / Supabase : migrations manuelles (SQL dans packages/database/prisma/
  migrations, `db execute`, puis `migrate resolve --applied`, `prisma generate`).
  Ne jamais afficher TEST_ACCOUNTS_PASSWORD ni JWT / mots de passe salon.
- UI : smoke navigateur de bout en bout sur le flux touché (compte de test
  local admin@aniquizz.test + mot de passe depuis l'env, sans l'écrire). Guest
  + screenshot ne suffisent pas si la feature a une session ou un socket.

Avant de conclure une tâche : pré-vol CI limité à ce que tu as touché
(`pnpm check:english`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`,
`pnpm build`, `pnpm test` selon le périmètre), mets à jour PROGRESS.md, et
propose un message Conventional Commits. NE commit PAS et NE push PAS sans
que je te le demande.

Ma première tâche est : décrire la tâche
```
