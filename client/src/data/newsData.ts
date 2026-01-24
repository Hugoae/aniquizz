import { Calendar, Sparkles, Bug, Zap, LucideIcon } from 'lucide-react';

// --- TYPES ---
export interface NewsItem {
  id: number;
  title: string;
  description: string;
  content: string;
  date: string;
  type: 'update' | 'feature' | 'fix' | 'event';
}

export interface RoadmapItem {
  title: string;
  description: string;
  status: 'done' | 'in-progress' | 'planned';
  date: string;
}

// --- NEWS (PATCHNOTES) ---
export const allNews: NewsItem[] = [
  {
    id: 1,
    title: 'Patchnote 0.1 - Sortie du jeu',
    description: 'Lancement officiel d\'AniQuizz ! Découvrez les fonctionnalités de la V0.1.',
    content: "Bienvenue sur la version 0.1 d'AniQuizz ! \n\nNous sommes ravis de vous présenter la première version à peu près stable du jeu. \n\nAu programme :\n• Mode Solo : Entraînez-vous sur des playlists (Shonen, Isekai, 90s...).\n• Mode Multijoueur : Créez des salons privés et défiez vos amis en temps réel.\n• Système de jeu : Choix entre QCM ou Typing (réponse clavier) pour plus de challenge.\n\nMerci de votre soutien et amusez-vous bien !",
    date: '2026-01-23T12:00:00Z', 
    type: 'update'
  }
];

// --- ROADMAP ---
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
    status: "in-progress",
    date: "Q1 2026"
  },
  {
    title: "Modes 'Lives' & 'Battle Royale'",
    description: "Nouveaux modes de jeu multijoueur éliminatoires.",
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
    title: "Intégration MyAnimeList",
    description: "Support d'autres plateformes en plus d'AniList.",
    status: "planned",
    date: "Q3 2026"
  }
];

// --- CONFIGURATION VISUELLE ---
export const typeConfig: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  update: { icon: Zap, color: 'text-blue-400 bg-blue-400/20', label: 'Mise à jour' },
  feature: { icon: Sparkles, color: 'text-primary bg-primary/20', label: 'Nouveauté' },
  fix: { icon: Bug, color: 'text-orange-400 bg-orange-400/20', label: 'Correction' },
  event: { icon: Calendar, color: 'text-success bg-success/20', label: 'Événement' }
};