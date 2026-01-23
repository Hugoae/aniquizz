import { Calendar, Sparkles, Bug, Zap, LucideIcon } from 'lucide-react';

export interface NewsItem {
  id: number;
  title: string;
  description: string;
  content: string;
  date: string;
  type: 'update' | 'feature' | 'fix' | 'event';
}

// C'est ici que tu ajoutes tes vraies news !
export const allNews: NewsItem[] = [
  {
    id: 1,
    title: 'Patchnote 0.1 - Sortie du jeu',
    description: 'Lancement officiel d\'AniQuizz ! Découvrez les fonctionnalités de la V0.1.',
    content: "Bienvenue sur la version 0.1 d'AniQuizz ! \n\nNous sommes ravis de vous présenter la première version à peu près stable du jeu. \n\nAu programme :\n• Mode Solo : Entraînez-vous sur des playlists (Shonen, Isekai, 90s...).\n• Mode Multijoueur : Créez des salons privés et défiez vos amis en temps réel.\n• Système de jeu : Choix entre QCM ou Typing (réponse clavier) pour plus de challenge.\n\nMerci de votre soutien et amusez-vous bien !",
    date: new Date().toISOString(), // Met la date d'aujourd'hui automatiquement
    type: 'update'
  }
];

export const typeConfig: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  update: { icon: Zap, color: 'text-blue-400 bg-blue-400/20', label: 'Mise à jour' },
  feature: { icon: Sparkles, color: 'text-primary bg-primary/20', label: 'Nouveauté' },
  fix: { icon: Bug, color: 'text-orange-400 bg-orange-400/20', label: 'Correction' },
  event: { icon: Calendar, color: 'text-success bg-success/20', label: 'Événement' }
};