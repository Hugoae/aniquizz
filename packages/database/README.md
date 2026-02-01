##Architecture

database/
├── prisma/
│   ├── migrations/             <-- Historique des changements de la BDD (géré par Prisma)
│   └── schema.prisma           <-- Le plan de la base de données (Tables, Relations, Enums)
│
├── data/                       <-- Stockage des fichiers JSON (entrée/sortie des scripts)
│   ├── .gitignore              <-- Ignore les gros fichiers générés, garde les fichiers manuels
│   ├── manual_edits.json       <-- Les modifications manuelles (Titres, Tags, Locks) à préserver
│   ├── data_step1.json         <-- Résultat temporaire du script 1
│   └── data_step2.json         <-- Résultat temporaire du script 2
│
└── scripts/                    <-- Toute la logique du pipeline
    │
    │   // --- LE PIPELINE (Ordre d'exécution) ---
    ├── 1_fetch_anilist.ts      <-- Étape 1 : Récupère les métadonnées (Titres, Genres, Popularité) depuis AniList
    ├── 2_fetch_animethemes.ts  <-- Étape 2 : Trouve les vidéos (Openings/Endings) correspondantes sur AnimeThemes
    ├── 3_load_initial_data.ts  <-- Étape 3 : Lit les JSONs de l'étape 1 & 2 et crée les entrées dans la BDD Postgres (Statut: PENDING)
    ├── 4_sync_storage.ts       <-- Étape 4 : Le "Worker". Télécharge les MP4, les compresse et les envoie sur Supabase
    │
    │   // --- OUTILS DE GESTION (Pour modifier les données) ---
    ├── export_db_to_json.ts    <-- Sauvegarde l'état actuel de la BDD dans 'data/manual_edits.json' pour pouvoir les éditer
    ├── import_edits_to_db.ts   <-- Lit 'data/manual_edits.json' et met à jour la BDD (applique les renommages, tags, changement de difficulté, etc.)
    │
    │   // --- ADMINISTRATION ---
    ├── global_build.ts         <-- Le chef d'orchestre : Lance les scripts 1, 2, 3 et 4 à la suite
    ├── reset_all.ts            <-- Zone de danger : Vide la BDD, vide le Bucket Supabase et supprime les fichiers JSON locaux
    └── seed_db.ts              <-- Remplit la BDD avec un jeu de données propre (utile pour remettre à zéro sans tout retélécharger)

---

##GUIDE D'UTILISATION
**PRÉREQUIS IMPORTANT** : Toutes les commandes ci-dessous doivent être lancées depuis le dossier `database/`.

npx ts-node scripts/global_build.ts <-- C'est la commande principale. Elle va chercher les animes, les sons, remplir la BDD et télécharger les vidéos. Appelle tout le Pipeline
npx ts-node scripts/1_fetch_anilist.ts <-- Récupérer les Animes (AniList) Crée data/data_step1.json
npx ts-node scripts/2_fetch_animethemes.ts <-- Récupérer les liens vidéos (AnimeThemes) Crée data/data_step2.json
npx ts-node scripts/3_load_initial_data.ts <-- Remplir la Base de Données (Postgres) Lit les fichiers JSON et crée les lignes en BDD avec statut PENDING
npx ts-node scripts/4_sync_storage.ts <-- Télécharger les vidéos (Worker) Télécharge, compresse et upload sur Supabase. À relancer quand on voit les sons en Error.

npx ts-node scripts/export_db_to_json.ts <-- Exporte l'état actuel de la BDD vers un fichier JSON pour changer les caractéristiques d'un anime (manual_edits.json)
npx ts-node scripts/import_edits_to_db.ts <-- Réimporte tes modifications dans la BDD :

npx ts-node scripts/reset_all.ts <-- Tout effacer (BDD + Vidéos + Fichiers locaux) Utilise ça si tu veux repartir d'une feuille blanche.
npx ts-node scripts/seed_db.ts <-- Remplir la BDD sans tout télécharger (Seed) Si tu as déjà les fichiers JSON et que tu veux juste repeupler ta table Postgres propre.

npx prisma studio <-- Voir la BDD dans une interface graphique