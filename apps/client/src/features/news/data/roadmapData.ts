export interface RoadmapItem {
  title: string;
  description: string;
  status: 'done' | 'in-progress' | 'planned';
  date: string;
}

// Flagship milestones only — ordered chronologically (shipped → next → later).
export const roadmapData: RoadmapItem[] = [
  {
    title: 'Lancement v26.0',
    description:
      'Blindtest anime solo & multijoueur, AniList, amis, XP, médailles et catalogue de openings/endings.',
    status: 'done',
    date: 'Juillet 2026',
  },
  {
    title: 'Librairie musicale',
    description:
      'Parcourez tout le catalogue, filtrez par anime, type de son ou difficulté, et découvrez de nouvelles pépites.',
    status: 'done',
    date: '12 juillet 2026 — avec la v26.2',
  },
  {
    title: 'MyAnimeList',
    description:
      "Liez votre compte MAL pour jouer avec votre liste d'animes regardés, en alternative à AniList.",
    status: 'done',
    date: '12 juillet 2026 — avec la v26.2',
  },
  {
    title: 'Mode Rapidité',
    description: 'Répondez le plus vite possible : les points dépendent de votre vitesse de réaction.',
    status: 'planned',
    date: 'Q3 2026',
  },
  {
    title: 'Playlists thématiques',
    description:
      'Sources de sons curated (genres, décennies, packs thématiques) pour varier vos parties.',
    status: 'planned',
    date: 'Q3 2026',
  },
  {
    title: 'Quiz du jour',
    description: 'Un défi quotidien solo pour tester votre culture anime chaque jour.',
    status: 'planned',
    date: 'Q4 2026',
  },
  {
    title: 'Classement global',
    description:
      'Leaderboards par XP, victoires, séries et précision — comparez-vous à toute la communauté.',
    status: 'planned',
    date: 'Q4 2026',
  },
  {
    title: 'Succès & collection',
    description: 'Badges de progression, objectifs à débloquer et suivi de vos exploits en jeu.',
    status: 'planned',
    date: 'Q1 2027',
  },
  {
    title: 'Mode Compétitif',
    description: 'Parties classées avec ladder et saisons — montez en grade et affrontez les meilleurs.',
    status: 'planned',
    date: 'Q2 2027',
  },
  {
    title: 'Traduction anglaise',
    description: 'Version anglaise complète du site pour jouer partout dans le monde.',
    status: 'planned',
    date: 'Q3 2027',
  },
];
