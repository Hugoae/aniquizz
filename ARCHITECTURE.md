# 🏗️ Architecture du Projet AniQuizz

Ce document détaille la structure du Backend (Server) et du Pipeline de Données (Database).

---

## 1. 🖥️ Serveur (`apps/server/src/`)

Le cerveau de l'application. Il gère les connexions WebSocket, la logique de jeu en temps réel et la distribution des événements.

```text
apps/server/src/
├── config/
│   ├── security.ts           <-- Config CORS & Sécurité (qui a le droit de se connecter)
│   └── tagConfig.ts          <-- Mapping des playlists (Tags BDD <-> Tags UI)
│
├── core/
│   ├── Server.ts             <-- Configuration d'Express et du serveur HTTP
│   └── SocketManager.ts      <-- Gestionnaire principal : Initialise et dispatch les sockets
│
├── modules/
│   ├── game/                 <-- 🎮 MODULE JEU
│   │   ├── GameManager.ts        <-- Le "Lobby Manager" : Crée, stocke et supprime les parties
│   │   ├── gameHandlers.ts       <-- Contrôleur : Reçoit les événements (answer, start, pause...)
│   │   ├── gameService.ts        <-- Service : Interroge la BDD (Filtres, Aléatoire, Watched)
│   │   │
│   │   └── classes/              <-- 🧠 LOGIQUE MÉTIER (Pattern Stratégie)
│   │       ├── GameCore.ts           <-- CLASSE MÈRE : Gestion Timer, Playlist, Pause, Skip
│   │       └── StandardGame.ts       <-- ENFANT : Règles du mode Standard (Points, Victoire)
│   │
│   ├── anilist/              <-- 🎌 MODULE ANILIST
│   │   └── anilistService.ts     <-- API : Récupère les listes d'animes des joueurs
│   │
│   ├── chat/                 <-- 💬 MODULE CHAT
│   │   └── chatHandlers.ts       <-- Reçoit 'chat:message'
│   │
│   └── lobby/                <-- 🛋️ MODULE LOBBY
│       └── lobbyHandlers.ts      <-- Reçoit 'lobby:join', 'lobby:create'
│
├── utils/
│   ├── logger.ts             <-- Gestion des logs (Couleurs, timestamps)
│   └── stringUtils.ts        <-- Algorithme de comparaison (Levenshtein / Fuzzy matching)
│
└── index.ts                  <-- Point d'entrée (Main)


database/
├── prisma/
│   ├── migrations/           <-- Historique des changements de la BDD (géré par Prisma)
│   └── schema.prisma         <-- Le plan de la base de données (Tables, Relations, Enums)
│
├── data/                     <-- Stockage des fichiers JSON (Input/Output des scripts)
│   ├── .gitignore            <-- Ignore les gros fichiers générés
│   ├── manual_edits.json     <-- ✏️ Tes modifs manuelles (Titres, Tags, Locks) à préserver
│   ├── data_step1.json       <-- Résultat temporaire du script 1 (AniList)
│   └── data_step2.json       <-- Résultat temporaire du script 2 (AnimeThemes)
│
└── scripts/                  <-- ⚙️ LA LOGIQUE DU PIPELINE
    │
    │   // --- LE PIPELINE (Ordre d'exécution) ---
    ├── 1_fetch_anilist.ts        <-- Étape 1 : Récupère métadonnées (Titres, Genres, Popularité)
    ├── 2_fetch_animethemes.ts    <-- Étape 2 : Trouve les liens vidéos (OP/ED) correspondants
    ├── 3_load_initial_data.ts    <-- Étape 3 : Injecte les données dans Postgres (Statut: PENDING)
    ├── 4_sync_storage.ts         <-- Étape 4 : Le "Worker" (Télécharge, Compresse, Upload Supabase)
    │
    │   // --- OUTILS DE GESTION (Pour modifier les données) ---
    ├── export_db_to_json.ts      <-- Sauvegarde l'état actuel de la BDD vers 'manual_edits.json'
    ├── import_edits_to_db.ts     <-- Lit 'manual_edits.json' et applique les changements en BDD
    │
    │   // --- ADMINISTRATION ---
    ├── global_build.ts           <-- Le Chef d'Orchestre : Lance 1, 2, 3 et 4 à la suite
    ├── reset_all.ts              <-- ⚠️ DANGER : Vide BDD, Bucket Supabase et fichiers locaux
    └── seed_db.ts                <-- Remplit la BDD avec les JSON existants (sans re-télécharger)


## 4. 💻 Client (`apps/client/src/`)

L'interface utilisateur React (Vite). Elle est organisée par **Features** (fonctionnalités) pour garder le code modulaire.

```text
apps/client/src/
├── components/
│   ├── layout/               <-- Composants de structure (Header, Footer)
│   └── ui/                   <-- Briques de base UI (Boutons, Inputs, Dialogs - shadcn/ui)
│
├── features/                 <-- 📦 ORGANISATION PAR FONCTIONNALITÉS
│   ├── auth/
│   │   └── context/
│   │       └── AuthContext.tsx  <-- Gère la session utilisateur (Connexion, Profil)
│   │
│   ├── game/                 <-- LE COEUR DU JEU
│   │   ├── components/
│   │   │   ├── core/         <-- Éléments centraux du moteur
│   │   │   │   ├── AudioVisualizer.tsx  <-- Les barres qui bougent avec la musique
│   │   │   │   └── GameSidebar.tsx      <-- Chat et liste des joueurs (droite)
│   │   │   │
│   │   │   ├── modes/        <-- Layouts spécifiques selon le mode
│   │   │   │   ├── standard/
│   │   │   │   │   └── StandardGameLayout.tsx <-- L'écran de jeu classique (5 pts)
│   │   │   │   └── battle-royale/
│   │   │   │       └── BattleRoyaleGameLayout.tsx <-- L'écran avec les vies et la Zone
│   │   │   │
│   │   │   ├── shared/       <-- Composants réutilisés partout
│   │   │   │   ├── PlayerCard.tsx    <-- Carte joueur (Avatar, Score, Streak)
│   │   │   │   ├── SongInfoCard.tsx  <-- La belle carte "Erased" qui révèle l'anime
│   │   │   │   └── PointsBadge.tsx   <-- L'animation "+5 pts"
│   │   │   │
│   │   │   └── GameOver.tsx  <-- Écran de fin de partie (Podium)
│   │
│   ├── hub/                  <-- LE MENU DE JEU
│   │   ├── components/
│   │   │   ├── GameConfigForm.tsx    <-- Formulaire de création (Difficulté, Année...)
│   │   │   ├── MultiplayerLobby.tsx  <-- Le salon d'attente (Liste des joueurs prêts)
│   │   │   └── RoomList.tsx          <-- Liste des serveurs disponibles
│   │
│   └── settings/             <-- PARAMÈTRES GLOBAUX
│       └── components/
│           └── GlobalSettingsModal.tsx <-- Réglage volume, pseudo, avatar
│
├── lib/                      <-- OUTILS & SINGLETONS
│   ├── socket.ts             <-- Instance unique du client Socket.io
│   └── utils.ts              <-- Fonctions utilitaires (cn pour les classes Tailwind)
│
├── pages/                    <-- LES VUES PRINCIPALES (Routes)
│   ├── Game.tsx              <-- Le conteneur du jeu (Gère la logique Socket 'round_start'...)
│   ├── GameHub.tsx           <-- L'écran d'accueil "Jouer" (Choix du mode, Lobby)
│   └── Home.tsx              <-- Landing page
│
├── App.tsx                   <-- Configuration du Router et des Providers
└── main.tsx                  <-- Point d'entrée React