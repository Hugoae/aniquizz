export interface RoadmapItem {
  title: string;
  description: string;
  status: 'done' | 'in-progress' | 'planned';
  date: string;
}

// Ordered chronologically: shipped first, then the current focus, then upcoming.
export const roadmapData: RoadmapItem[] = [
  {
    title: "Lancement V0.1",
    description: "Sortie publique de la base du jeu (Solo, Multi standard, Profil).",
    status: "done",
    date: "Q1 2026"
  },
  {
    title: "Intégration AniList & Profil",
    description: "Possibilité de lier son compte AniList pour jouer seulement avec les animés qu'on a vus. Mise en place d'un système de profil avec statistiques.",
    status: "done",
    date: "Q1 2026"
  },
  {
    title: "Système d'XP & Amis",
    description: "Niveaux et expérience, liste d'amis, présence en ligne et invitations en partie.",
    status: "done",
    date: "Q1 2026"
  },
  {
    title: "Refonte visuelle (UI/UX)",
    description: "Nouvelle identité graphique, typographie et interface plus soignée sur tout le site.",
    status: "in-progress",
    date: "Q3 2026"
  },
  {
    title: "Nouveaux modes de jeu",
    description: "Modes multijoueur inédits (dont un mode de rapidité façon AMQ).",
    status: "planned",
    date: "Q4 2026"
  },
  {
    title: "Paramètres & Traduction anglaise",
    description: "Ajout de paramètres pour le site et votre compte, et traduction anglaise.",
    status: "planned",
    date: "Q4 2026"
  },
  {
    title: "Collection de sons & Coups de cœur",
    description: "Collection de sons et possibilité d'aimer les sons pour les ajouter à vos favoris.",
    status: "planned",
    date: "Q1 2027"
  },
  {
    title: "Ajout des Endings",
    description: "Ajout des génériques de fin (Endings) en plus des Openings.",
    status: "planned",
    date: "Q1 2027"
  }
];
