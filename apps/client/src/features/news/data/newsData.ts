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
      "• Précision Exact ou Franchise selon le niveau de challenge que vous voulez.\n" +
      "• Médailles solo (Bronze → Platine) : votre score est jugé par rapport au maximum possible, pas juste un pourcentage arbitraire.\n" +
      "• Autocomplétion intelligente en mode Typing pour aller vite sans sacrifier la précision.\n\n" +
      "**Intégration AniList**\n" +
      "• Liez votre compte AniList depuis votre profil pour synchroniser les animes que vous avez vus.\n" +
      "• Jouez uniquement avec des sons de votre watchlist — idéal pour ne pas tomber sur un anime que vous n'avez jamais vu.\n" +
      "• En multijoueur, deux modes de fusion : Union (toutes les listes mélangées) ou Intersection (seulement les animes vus par tout le monde).\n\n" +
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
