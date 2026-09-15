# Prompt d’audit de feature

À coller dans un nouveau chat agent (une feature à la fois). Remplacer `FEATURE`
par le nom du domaine (`Auth`, `Home`, `Hub`, `Game`, …).

Le prompt ci-dessous est **en français** (livrable + discussion). Le code, les
commentaires et les commits du repo restent en **anglais** ; l’UI utilisateur
reste en **français**. Un smoke navigateur de bout en bout (lentille 10,
compte de test local) est **obligatoire** — guest + lecture CSS ne suffisent
pas.

---

```
Audite FEATURE de bout en bout. N’implémente rien tant que je ne demande pas
explicitement de corriger un finding. Ne démarre pas 26.7 (pokédex / rework
Admin) ni le travail en parking (HIBP). La phase courante est **26.6.1**
(voir PLAN.md).

Repo : pnpm + Turborepo. Graphify d’abord (`.cursor/rules/graphify.mdc`).
Lis CONTEXT-MAP.md et les CONTEXT.md des packages concernés avant de scanner.
Code / commentaires / commits en anglais ; textes UI en français.

## Périmètre

Couvre toute la surface FEATURE, pas seulement le dossier `features/FEATURE/` :
UI client + hooks + copy, handlers / routes / services serveur, types shared et
Zod, Prisma si touché, events socket, HTTP, tests, docs.

Si FEATURE partage de l’état, des routes ou des composants avec des voisins,
dis ce qui doit rester cohérent (n’audite pas ces voisins en entier).

## Lentilles (toutes)

1. **Qualité de code** — nommage, code mort, duplication, commentaires qui
   expliquent le pourquoi, commentaires en anglais uniquement, pas de `any`,
   pas de secrets dans les logs.
2. **Partitionnement** — cap mou ~300–400 lignes ; extraire hooks /
   sous-composants / helpers purs dans `packages/shared` plutôt que de
   grossir des god-files.
3. **Règles du projet** — AGENTS.md, pièges des CONTEXT.md, contrat socket
   dans `packages/shared` (`events.ts` / `game.ts` / `socketPayloads.ts`),
   identité = `userId` JWT jamais `socket.id`, mutateurs socket parsés avec
   Zod, murs d’imports entre packages, tokens de design (pas de hex de thème
   en dur), copy isolée pour l’i18n.
4. **Sécurité** — authz, IDOR, injection, XSS, CSRF / cookies, JWT, rate
   limits, mass assignment, erreurs trop bavardes, secrets, suppression RGPD
   si pertinent. Le serveur fait autorité.
5. **Performance** — renders inutiles, waterfalls, bundle, virtualisation
   des listes, chatter socket, N+1, clés de cache.
6. **Logique / produit** — happy path, vides / erreurs / loading,
   reconnect, courses, URL / état, invariants vs docs (`docs/game`,
   `docs/security`).
7. **Design / a11y / UX** — tokens, primitives shadcn, `.glass-card`,
   `FOCUS_RING`, `prefers-reduced-motion`, jsx-a11y, copy française.
   `eslint-plugin-jsx-a11y` recommended est **error** — ne pas repasser en
   warn. Corriger tout finding que FEATURE introduit.
8. **Tests** — cas manquants sur les chemins risqués que tu as trouvés.
9. **Responsive / téléphone** — pas le pixel-perfect, mais aucun manque
   grossier. Vérifier au moins : largeur ~390px, landscape court (~700×400),
   `100dvh` / clavier / barre d’adresse, header/footer `fixed` qui ne
   mangent pas le contenu, scroll (pas de `overflow-hidden` qui clippe),
   cibles de tap assez grandes, pas d’action essentielle en hover-only,
   wrap des CTA, safe-area si pertinent. Dire ce que tu as réellement
   ouvert dans le navigateur vs ce que tu as seulement lu dans le CSS.
10. **Smoke de bout en bout** — obligatoire, pas un bonus. Compte de test
    local (`admin@aniquizz.test` / `TEST_ACCOUNTS_PASSWORD`) : ne pas
    parker « l’outil ne peut pas remplir le mot de passe ». Guest seul ne
    suffit pas si FEATURE a une session, un socket, ou une route
    `ProtectedRoute`. Parcours réel dans le navigateur (clics, pas un
    screenshot) :
    - guest → AuthModal / returnTo si FEATURE est protégée ;
    - login → happy path FEATURE (et les voisins qui lisent le même état) ;
    - vide / erreur / loading si tu peux les déclencher sans casser les
      données ;
    - F5 / reconnect si FEATURE est realtime (`session_replaced`, salon,
      match) ;
    - un viewport ~390px sur le même parcours (en plus du desktop).
    Dans le livrable : matrice passé / raté / sauté, avec la raison si
    sauté. Ne pas inventer un OK d’après le code.
11. **SEO / contenu crawlable** — `<title>` / meta description / canonical /
    OG / Twitter / `robots` / JSON-LD s’ils existent pour FEATURE ;
    hiérarchie de titres (un `h1`) ; liens réels (`<a>` / `Link`) plutôt
    que `div role="button"` pour tout ce qui navigue ; `alt` des images
    (décoratif → `alt=""` + `aria-hidden`, informatif → texte utile) ;
    pas de copy keyword-stuffing ; pages auth / jeu en `noindex` si c’est
    le contrat. Les extras du prerender / app-shell (`index.html`) doivent
    rester alignés avec la copy live.

## Méthode

- Graphify `query` / `path` / `explain` avant Grep / Read.
- Suis un parcours utilisateur de bout en bout (clic → réseau / socket →
  DB → UI).
- **Smoke navigateur obligatoire** (lentille 10) avant de clore l’audit :
  compte `admin_dev`, pas seulement guest. Si un pas est sauté, l’écrire
  (et pourquoi) — ne pas le compter comme OK.
- Pour le téléphone : reproduis le parcours sur un viewport court, pas
  seulement un screenshot desktop.
- Préfère les preuves (fichier:ligne, payload, trou de test) au goût.
- Pas de reformat de masse ni de refactors opportunistes.

## Livrable

Un canvas (ou un rapport court si un canvas est overkill) avec findings
triés :

| Sev | Sens |
|-----|------|
| P0  | Faux, insecure, ou perte de données — corriger avant d’ajouter du FEATURE |
| P1  | Vrai bug ou rupture de règle — corriger dans cette passe d’audit |
| P2  | Qualité / a11y / split / responsive non bloquant — planifier, ne pas bloquer |
| OK  | Explicitement bon ; évite de re-litiger |

Chaque finding : sévérité, lentille, fichiers, ce qui cloche, correctif
suggéré (pas de patch tant que je ne le demande pas). Inclus une **matrice
smoke** (parcours × passé/raté/sauté). Termine par : ce que tu n’as pas
vérifié (surtout mobile réel et SEO prerender), et un ordre de fix
recommandé.
```
