export interface RoadmapItem {
  title: string;
  description: string;
  status: 'done' | 'in-progress' | 'planned';
  date: string;
}

// Flagship milestones only, ordered chronologically (shipped, then next, then later).
export const roadmapData: RoadmapItem[] = [
  {
    title: 'Lancement v26.0',
    description:
      'Blindtest anime solo et multijoueur, AniList, amis, XP, médailles et catalogue de sons.',
    status: 'done',
    date: 'Juillet 2026',
  },
  {
    title: 'Librairie musicale',
    description:
      'Parcourez le catalogue en vues Franchise, Anime ou Sons. Filtrez par type, difficulté ou favoris.',
    status: 'done',
    date: '12 juillet 2026, v26.2',
  },
  {
    title: 'MyAnimeList',
    description:
      "Liez votre compte MAL pour jouer avec votre liste d'animes regardés, en alternative à AniList.",
    status: 'done',
    date: '12 juillet 2026, v26.2',
  },
  {
    title: 'Sprint',
    description:
      'Mode multijoueur typing-only : bonne réponse plus un bonus podium selon votre vitesse de réaction.',
    status: 'done',
    date: '14 juillet 2026, v26.3',
  },
  {
    title: 'Titres favoris',
    description:
      'Likez un son à la révélation, retrouvez vos favoris dans la Librairie et épinglez-en 5 sur votre profil.',
    status: 'done',
    date: '2 septembre 2026, v26.4',
  },
  {
    title: 'Boîte à idées',
    description:
      'Board public : proposez, votez, suivez En cours / Prévue / Réalisée / Refusée, et lisez les réponses de l’équipe.',
    status: 'done',
    date: '2 septembre 2026, v26.4',
  },
  {
    title: 'Classement global',
    description:
      'Cinq classements à vie : XP, victoires, parties, Pokédex musical et précision. Top 25 plus votre rang.',
    status: 'done',
    date: '2 septembre 2026, v26.4',
  },
  {
    title: 'Endings',
    description: 'Plus de 1800 endings dans le catalogue, 3000 sons au total.',
    status: 'done',
    date: '5 septembre 2026, v26.5',
  },
  {
    title: 'Playlists thématiques',
    description:
      'Packs staff (shonen, seinen, décennies…) combinables, avec option de limiter aux animes vus.',
    status: 'done',
    date: '11 septembre 2026, v26.5',
  },
  {
    title: 'Quiz du jour',
    description:
      'Cinq QCM identiques pour tous, une tentative, série dédiée, classement du jour, reset minuit Paris.',
    status: 'done',
    date: '14 septembre 2026, v26.6',
  },
  {
    title: 'Refonte du profil',
    description:
      "Refonte de l'historique de jeu, des statistiques et ajout de stats complémentaires.",
    status: 'planned',
    date: 'Q4 2026',
  },
  {
    title: 'Succès & collection',
    description: 'Badges de progression, objectifs à débloquer et suivi de vos exploits en jeu.',
    status: 'planned',
    date: 'Q4 2026',
  },
  {
    title: 'Mode Compétitif',
    description:
      'Parties classées avec ladder et saisons : montez en grade et affrontez les meilleurs.',
    status: 'planned',
    date: '2027',
  },
  {
    title: 'Traduction anglaise',
    description: 'Version anglaise complète du site pour jouer partout dans le monde.',
    status: 'planned',
    date: '2027',
  },
];
