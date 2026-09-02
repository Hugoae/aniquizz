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
      'Blindtest anime solo et multijoueur, AniList, amis, XP, médailles et catalogue de openings/endings.',
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
    date: '15 juillet 2026, v26.4',
  },
  {
    title: 'Boîte à idées',
    description:
      'Board public : proposez, votez, suivez En cours / Prévue / Réalisée / Refusée, et lisez les réponses de l’équipe.',
    status: 'done',
    date: '15 juillet 2026, v26.4',
  },
  {
    title: 'Classement global',
    description:
      'Cinq classements à vie : XP, victoires, parties, Pokédex musical et précision. Top 25 plus votre rang.',
    status: 'done',
    date: '2 septembre 2026, v26.4',
  },
  {
    title: 'Graphiques statistiques (profil)',
    description:
      'Répartition visuelle de vos parties (solo/multi, types de sons, difficulté, médailles) avec filtre par période.',
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
    title: 'Succès & collection',
    description: 'Badges de progression, objectifs à débloquer et suivi de vos exploits en jeu.',
    status: 'planned',
    date: 'Q1 2027',
  },
  {
    title: 'Mode Compétitif',
    description: 'Parties classées avec ladder et saisons : montez en grade et affrontez les meilleurs.',
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
