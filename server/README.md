#AniQuizz - Serveur de Jeu (Beta)

Bienvenue dans la documentation technique du serveur AniQuizz.
Ce projet est un Blindtest Anime multijoueur temps réel basé sur **Node.js**, **Socket.io**, **Supabase** et **Prisma**.

##Architecture Globale

Le projet suit une architecture **Client-Serveur** sécurisée :

1.  **Client (React)** : Gère l'interface, la lecture vidéo et l'envoi des réponses via Socket.
2.  **Serveur (Node.js)** :
    * Gère l'état du jeu (Scores, Chronos, Rooms).
    * Valide les réponses (Anti-triche).
    * Sécurise les connexions via les tokens Supabase.
3.  **Base de Données (PostgreSQL / Supabase)** : Stocke les Animes, Sons, Profils et Historiques.

---

##Structure du Dossier Serveur (`/server/src`)

| Dossier/Fichier | Rôle |
| :--- | :--- |
| **`index.ts`** | **Point d'entrée**. Configure Express, Socket.io, et route les messages (Join, Chat, Leave). |
| **`types/`** | Contient toutes les **Interfaces TypeScript** partagées (`Room`, `Player`). Évite les doublons. |
| **`config/`** | Contient les **Constantes** de jeu (Points, Timers, Limites). |
| ↳ `db.ts` : **Singleton Prisma**. Crée une unique connexion à la base de données partagée par tout le serveur. |
| **`utils/`** | Fonctions pures et mathématiques (Calcul de score, Algorithme de Levenshtein pour les typos). |
| **`services/`** | Logique métier lourde : |
| ↳ `gameService.ts` | Intéractions avec la **Base de Données** (Prisma). Sélection aléatoire des sons. |
| ↳ `gameLoop.ts` | **Moteur du Jeu**. Gère la boucle (Round -> Guess -> Reveal) et le temps. |

---

##Sécurité & Authentification

* **Connexion Socket** : Le client envoie un JWT Supabase (`access_token`).
* **Middleware (`index.ts`)** : Le serveur vérifie ce token via la clé `SERVICE_ROLE`.
* **Identité** : On utilise l'UUID Supabase (`user.id`) comme identifiant unique. Impossible d'usurper une identité.
* **Données (RLS)** : Les tables de jeu sont verrouillées côté Supabase. Seul ce serveur (Admin) peut écrire dedans.

---

##Comment ajouter une fonctionnalité ?

### 1. Ajouter une nouvelle Playlist (ex: "Mecha")
1.  Allez dans `services/gameService.ts`.
2.  Ajoutez une entrée dans `PLAYLIST_TAGS` : `'mecha': ['Mecha', 'Robot']`.
3.  Côté Client, ajoutez le bouton dans le formulaire de création.

### 2. Modifier le barème de points
1.  Allez dans `config/constants.ts`.
2.  Modifiez les valeurs dans `POINTS` (ex: passer TYPING à 10 points).

### 3. Changer la tolérance aux fautes d'orthographe
1.  Allez dans `config/constants.ts`.
2.  Ajustez `FUZZY.THRESHOLD_RATIO` (0.3 = 30% d'erreur acceptée).

---

##Commandes Utiles

* `npm run dev` : Lancer le serveur en mode développement (recharge auto).
* `npm run build` : Compiler le TypeScript en JavaScript pour la prod.
* `npm start` : Lancer le serveur de production.
* `npx prisma studio` : Ouvrir l'interface graphique pour voir la BDD.

---
