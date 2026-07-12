import { Calendar, Sparkles, Bug, Zap, LucideIcon, Newspaper } from 'lucide-react';

export interface NewsItem {
  id: number;
  title: string;
  description: string;
  content: string;
  date: string;
  type: 'update' | 'feature' | 'fix' | 'event';
}

type TypeConfig = { icon: LucideIcon; text: string; bg: string; label: string };

export const typeConfig: Record<NewsItem['type'] | 'default', TypeConfig> = {
  update: { icon: Zap, text: 'text-accent', bg: 'bg-accent/15', label: 'Mise à jour' },
  feature: { icon: Sparkles, text: 'text-primary', bg: 'bg-primary/15', label: 'Nouveauté' },
  fix: { icon: Bug, text: 'text-warning', bg: 'bg-warning/15', label: 'Correction' },
  event: { icon: Calendar, text: 'text-success', bg: 'bg-success/15', label: 'Événement' },
  default: { icon: Newspaper, text: 'text-muted-foreground', bg: 'bg-muted', label: 'Info' }
};

export const allNews: NewsItem[] = [
  {
    id: 3,
    title: 'Mise à jour v26.2 — Librairie, MyAnimeList & polish jeu',
    description:
      'Parcourez tout le catalogue, liez MyAnimeList pour le mode Watched, fluidité en partie améliorée, et phase de guess solo alignée sur le multijoueur.',
    content:
      "La v26.2 ouvre AniQuizz sur la découverte du catalogue et une deuxième source de listes d'animes regardés. Voici le détail :\n\n" +
      "**Librairie musicale**\n" +
      "• Nouvelle page **Librairie** : parcourez le catalogue par franchise, filtrez par type de son (OP/ED), difficulté ou recherche texte.\n" +
      "• Vue arborescente paginée + fiche détaillée par son (aperçu vidéo, anime, saison, difficulté).\n" +
      "• Seuls les sons téléchargés et jouables apparaissent — fini le Coming Soon.\n\n" +
      "**MyAnimeList (mode Watched)**\n" +
      "• Liez votre pseudo MAL depuis le profil — alternative à AniList pour alimenter le mode Watched.\n" +
      "• Listes prises en charge : En cours, Terminé et En pause — synchronisées avec notre catalogue.\n" +
      "• Un seul fournisseur par profil (AniList **ou** MAL) ; en multijoueur, union ou intersection cross-provider entre joueurs.\n" +
      "• Mêmes garde-fous que l'AniList : pool insuffisant = blocage ou opt-in explicite pour compléter avec l'aléatoire.\n\n" +
      "**Gameplay solo**\n" +
      "• La manche ne se révèle plus instantanément à la première réponse — le chrono complet s'applique comme en multijoueur.\n" +
      "• Vous pouvez changer votre réponse jusqu'à la fin du timer.\n" +
      "• Nouveau bouton **Révéler** (après au moins une réponse) pour passer à la révélation quand vous êtes prêt.\n\n" +
      "**Fluidité & chargement**\n" +
      "• Accueil plus réactif : shell HTML aligné sur la vraie page, moins de flash au premier chargement.\n" +
      "• En partie : timer isolé, visualiseur audio en CSS pur, suppression du flou GPU sur les overlays — moins de saccades sur machines modestes.\n" +
      "• Vidéo floutée : masquage légèrement renforcé (+5 %) pendant la phase de guess.\n\n" +
      "**Playlist & polish**\n" +
      "• Ordre des manches plus équitable : shuffle uniforme après la sélection diversifiée par franchise.\n" +
      "• Admin : stats des listes liées (AniList / MAL) et pseudo MAL visible dans les salons.\n\n" +
      "Prochaine étape annoncée : graphiques de stats sur le profil, puis **Mode Rapidité** et **Playlists thématiques** (voir la Roadmap).\n\n" +
      "Merci de continuer à jouer et de nous remonter vos retours !",
    date: '2026-07-12T21:00:00Z',
    type: 'update',
  },
  {
    id: 2,
    title: 'Mise à jour v26.1 — Compte, lobby & modes de jeu',
    description:
      'Suppression de compte, règles du lobby, modes vidéo, départ d\'extrait au choix, AniList plus clair, et des dizaines de correctifs pour le blindtest.',
    content:
      "La v26.1 affine l'expérience Standard avant les grosses nouveautés à venir (Librairie, stats, MyAnimeList). Voici ce qui change :\n\n" +
      "**Compte & confidentialité**\n" +
      "• Suppression de compte en libre-service depuis votre profil (menu ⋮), conforme au droit à l'effacement.\n" +
      "• Confirmation par pseudo et mot de passe avant toute suppression définitive.\n\n" +
      "**AniList (mode Watched)**\n" +
      "• Plus de complétion silencieuse : si votre liste est trop petite, le lancement est bloqué ou vous choisissez explicitement de compléter avec l'aléatoire.\n" +
      "• Bannière live dans le lobby : pool suffisant ou insuffisant, mode Union ou Commun, opt-in visible.\n" +
      "• En QCM, les mauvaises réponses restent dans votre pool AniList — fini les distracteurs d'animes que vous n'avez jamais vus.\n\n" +
      "**Lobby — Règles & réglages**\n" +
      "• Bouton **Règles** : panneau lisible qui explique scoring, source musicale, victoire solo/multi et votes pause/skip selon la config actuelle.\n" +
      "• Onglet **Avancé** dans les paramètres : affichage vidéo (Audio seul, Flouté, Fenêtre) et départ de l'extrait (Aléatoire ou Au début).\n" +
      "• Dans un même salon, les sons des parties précédentes sont évités quand le catalogue le permet.\n\n" +
      "**Modes d'affichage vidéo**\n" +
      "• **Audio seul** (défaut) : fond masqué, timer circulaire — comme avant, en plus propre.\n" +
      "• **Vidéo floutée** : la vidéo joue sous un flou, barre de progression en bas.\n" +
      "• **Fenêtre aléatoire** : petit carré net à position différente chaque manche, cadre violet, reste masqué.\n" +
      "• La révélation montre toujours la vidéo complète ; les points ne changent pas.\n\n" +
      "**Départ de l'extrait**\n" +
      "• **Aléatoire** (défaut) : chaque manche commence à un moment différent du clip.\n" +
      "• **Au début** : l'intro de l'OP/ED est toujours audible — idéal pour les puristes.\n" +
      "• Lecture plus fiable : le client attend le bon point de départ avant de lancer l'audio.\n\n" +
      "**Correctifs & polish**\n" +
      "• Médailles solo : les seuils Bronze → Platine correspondent enfin à la barre de maîtrise.\n" +
      "• Relance solo : nouvelle playlist après retour au lobby, plus de reprise de l'ancienne partie.\n" +
      "• Modération : joueurs bannis bloqués sur /play, éjection des parties en cours, toast unique.\n" +
      "• Admin : clic sur un utilisateur ouvre son profil complet avec retour vers le panneau admin.\n" +
      "• Staff : les hôtes **ADMIN** peuvent ajouter des bots en lobby sur le serveur live (tests & démos).\n\n" +
      "Prochaine étape annoncée : **v26.2** — Librairie, graphiques de stats sur le profil, et lien MyAnimeList.\n\n" +
      "Merci de continuer à jouer et de nous remonter vos retours !",
    date: '2026-07-10T21:00:00Z',
    type: 'update',
  },
  {
    id: 1,
    title: 'Mise à jour v26.0 - AniQuizz est en ligne',
    description:
      'Le blindtest anime nouvelle génération : solo ou multijoueur, AniList, amis, XP, médailles et des centaines d\'openings à deviner.',
    content:
      "AniQuizz est disponible ! Que vous soyez du genre à reconnaître un opening en deux notes ou à confondre encore deux shonen, il est temps de tester votre culture anime.\n\n" +
      "Au programme :\n\n" +
      "**Blindtest anime — Solo & Multijoueur**\n" +
      "• Parties solo pour s'entraîner à votre rythme, ou salons privés pour défier vos amis en temps réel.\n" +
      "• Des centaines d'openings et d'endings à deviner, avec filtres de difficulté (Facile, Moyen, Difficile).\n" +
      "• Modes de réponse au choix : Typing (clavier), QCM Carré, Duo, ou Mix pour varier les plaisirs.\n" +
      "• Précision Anime ou Franchise selon le niveau de challenge que vous voulez.\n" +
      "• Médailles solo (Bronze → Platine) : votre score est jugé par rapport au maximum possible, pas juste un pourcentage arbitraire.\n" +
      "• Autocomplétion intelligente en mode Typing pour aller vite sans sacrifier la précision.\n\n" +
      "**Intégration AniList**\n" +
      "• Liez votre compte AniList depuis votre profil pour synchroniser les animes que vous avez vus.\n" +
      "• Jouez uniquement avec des sons de votre watchlist — idéal pour ne pas tomber sur un anime que vous n'avez jamais vu.\n" +
      "• En multijoueur, deux modes de fusion : Union (toutes les listes mélangées) ou Commun (seulement les animes vus par tout le monde).\n\n" +
      "**Amis & Social**\n" +
      "• Ajoutez des amis par pseudo, acceptez les demandes, voyez qui est en ligne ou en partie.\n" +
      "• Invitez un ami dans votre lobby ou rejoignez le sien en un clic.\n" +
      "• Ajoutez quelqu'un depuis l'écran de fin de partie ou la liste des joueurs — plus besoin de chercher son pseudo.\n" +
      "• Liste des joueurs récents pour retrouver facilement vos adversaires d'hier.\n\n" +
      "**Progression & Profil**\n" +
      "• Gagnez de l'XP à chaque partie, montez de niveau et affichez votre badge dans le header.\n" +
      "• Statistiques détaillées : victoires, précision, parties jouées, séries de victoires.\n" +
      "• Pokédex musical : suivez combien de sons uniques vous avez déjà croisés dans le catalogue.\n" +
      "• Avatar personnalisé : uploadez votre image, recadrez-la et portez-la en jeu.\n\n" +
      "**Expérience de jeu**\n" +
      "• Timer circulaire, révélation avec fiche anime (saison, note, cover…), chat en lobby.\n" +
      "• Votes pause / skip en multijoueur, confirmation avant de quitter une partie en cours.\n" +
      "• Interface sombre moderne, pensée pour le desktop et le mobile.\n\n" +
      "Et ce n'est que le début — consultez la Roadmap sur la page Actualités pour voir ce qui arrive ensuite (Librairie, Classement, Daily, Compétitif…).\n\n" +
      "Merci de jouer à AniQuizz — et bonne chance pour le Platine !",
    date: '2026-07-09T20:00:00Z',
    type: 'update',
  },
];
