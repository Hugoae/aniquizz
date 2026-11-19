import { pick } from '@/lib/i18n/text';

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
    date: '15 septembre 2026, v26.6',
  },
  {
    title: 'Succès',
    description:
      'Collection de succès sur le profil, en XP. Parties, quiz du jour, modes, collection et profil.',
    status: 'done',
    date: '19 novembre 2026, v26.9',
  },
  {
    title: 'Anglais',
    description:
      'Le site se lit en français ou en anglais. Le bouton est dans l’en-tête et dans les paramètres.',
    status: 'done',
    date: '19 novembre 2026, v26.9',
  },
  {
    title: 'Refonte du profil',
    description:
      "Refonte de l'historique de jeu, des statistiques et ajout de stats complémentaires.",
    status: 'in-progress',
    date: 'Q4 2026',
  },
  {
    title: 'Mode Compétitif',
    description:
      'Parties classées avec ladder et saisons : montez en grade et affrontez les meilleurs.',
    status: 'planned',
    date: '2027',
  },
];

const ROADMAP_EN: { title: string; description: string; date: string }[] = [
  {
    title: 'Launch v26.0',
    description:
      'Solo and multiplayer anime blind test, AniList, friends, XP, medals, and a song catalogue.',
    date: 'July 2026',
  },
  {
    title: 'Music library',
    description:
      'Browse the catalogue in Franchise, Anime, or Songs views. Filter by type, difficulty, or favorites.',
    date: 'July 12, 2026, v26.2',
  },
  {
    title: 'MyAnimeList',
    description:
      'Link your MAL account to play with your watched list, as an alternative to AniList.',
    date: 'July 12, 2026, v26.2',
  },
  {
    title: 'Sprint',
    description:
      'Typing-only multiplayer: a correct answer plus a podium bonus based on how fast you react.',
    date: 'July 14, 2026, v26.3',
  },
  {
    title: 'Favorite songs',
    description:
      'Like a song at the reveal, find your favorites in the Library, and pin 5 of them on your profile.',
    date: 'September 2, 2026, v26.4',
  },
  {
    title: 'Idea box',
    description:
      'Public board: suggest, vote, follow In progress / Planned / Done / Declined, and read the team’s replies.',
    date: 'September 2, 2026, v26.4',
  },
  {
    title: 'Global leaderboard',
    description:
      'Five lifetime boards: XP, wins, games, Music Pokédex, and accuracy. Top 25 plus your rank.',
    date: 'September 2, 2026, v26.4',
  },
  {
    title: 'Endings',
    description: 'More than 1,800 endings in the catalogue, 3,000 songs in total.',
    date: 'September 5, 2026, v26.5',
  },
  {
    title: 'Themed playlists',
    description:
      'Combinable staff packs (shonen, seinen, decades…), with an option to limit to anime you have seen.',
    date: 'September 11, 2026, v26.5',
  },
  {
    title: 'Daily quiz',
    description:
      'Five identical multiple-choice questions for everyone, one attempt, its own streak, a daily ranking, reset at midnight Paris.',
    date: 'September 15, 2026, v26.6',
  },
  {
    title: 'Achievements',
    description:
      'An achievement collection on the profile, in XP. Matches, daily quiz, modes, collection, and profile.',
    date: 'November 19, 2026, v26.9',
  },
  {
    title: 'English',
    description:
      'The site reads in French or English. The button is in the header and in settings.',
    date: 'November 19, 2026, v26.9',
  },
  {
    title: 'Profile rebuild',
    description: 'A rebuild of match history and statistics, plus extra stats.',
    date: 'Q4 2026',
  },
  {
    title: 'Competitive mode',
    description: 'Ranked matches with a ladder and seasons: climb and face the best.',
    date: '2027',
  },
];

export function visibleRoadmap(): RoadmapItem[] {
  return roadmapData.map((item, index) => {
    const en = ROADMAP_EN[index];
    if (!en) return item;
    return {
      ...item,
      title: pick(item.title, en.title),
      description: pick(item.description, en.description),
      date: pick(item.date, en.date),
    };
  });
}
