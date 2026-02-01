export interface RoadmapItem {
  title: string;
  description: string;
  status: 'done' | 'in-progress' | 'planned';
  date: string;
}

export const roadmapData: RoadmapItem[] = [
  {
    title: "Lancement V0.1",
    description: "Sortie publique de la base du jeu (Solo, Multi standard, Profil).",
    status: "done",
    date: "Janvier 2026"
  },
  {
    title: "Intégration AniList & Profil",
    description: "Possibilité de lier son compte AniList pour jouer seulement avec les animés qu'on a vu. Mise en place d'un système de profil avec statistiques.",
    status: "done",
    date: "Q1 2026"
  },
  {
    title: "Modes 'Lives' & 'Battle Royale'",
    description: "Nouveaux modes de jeu multijoueur.",
    status: "in-progress",
    date: "Q1 2026"
  },
  {
    title: "Système d'Xp et Amis",
    description: "Système d'xp et fonctionnalités d'amis.",
    status: "planned",
    date: "Q1 2026"
  },
  {
    title: "Paramètre et Traduction en Anglais",
    description: "Ajout de paramètres pour le site et votre compte & Traduction en Anglais",
    status: "planned",
    date: "Q2 2026"
  },
  {
    title: "Collection des sons & Coup de coeurs",
    description: "Collection des sons et possiblité de liké les sons pour les avoir en favoris",
    status: "planned",
    date: "Q2 2026"
  },
  {
    title: "Ajout Endings",
    description: "Support d'autres plateformes en plus d'AniList.",
    status: "planned",
    date: "Q3 2026"
  }
];