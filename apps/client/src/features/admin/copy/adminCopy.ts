/** Isolated French copy for the staff admin console (future i18n). */
export const ADMIN_COPY = {
  seoDescription: 'Console interne de modération AniQuizz. Cette page n’est pas indexée.',
  title: 'Administration',
  reservedTitle: 'Accès réservé',
  reservedBody: "Cette page est réservée à l'équipe de modération.",
  claimDev: 'Devenir admin (dev)',
  claimSuccess: 'Vous êtes désormais administrateur.',
  claimFail: "Échec de l'élévation.",
  backHome: "Retour à l'accueil",
  tabs: {
    users: 'Utilisateurs',
    rooms: 'Salons',
    catalogue: 'Catalogue',
    playlists: 'Playlists',
    daily: 'Quiz du jour',
    suggestions: 'Suggestions',
    stats: 'Statistiques',
    audit: 'Journal',
    dev: 'Outils dev',
  },
  presence: {
    online: 'En ligne',
    inGame: 'En partie',
    offline: 'Hors ligne',
  },
  mute: 'Muet',
  muteMenu: 'Réduire au silence',
  liftMute: 'Lever le mute',
  ban: 'Bannir',
  liftBan: 'Lever le ban',
  genericError: 'Une erreur est survenue.',
  loadUsers: 'Chargement des utilisateurs…',
  difficulty: {
    EASY: 'Facile',
    MEDIUM: 'Moyen',
    HARD: 'Difficile',
  },
  downloadStatus: {
    PENDING: 'En attente',
    PROCESSING: 'En cours',
    COMPLETED: 'Terminé',
    ERROR: 'Erreur',
    SKIPPED: 'Ignoré',
  },
  audit: {
    title: 'Journal staff',
    empty: 'Aucune action enregistrée.',
    actor: 'Staff',
    target: 'Cible',
    action: 'Action',
    duration: 'Durée',
    date: 'Date',
    allActions: 'Toutes les actions',
    load: 'Chargement du journal…',
    openUser: 'Voir l’utilisateur',
    actions: {
      MUTE: 'Muet',
      UNMUTE: 'Mute levé',
      BAN: 'Bannissement',
      UNBAN: 'Ban levé',
      ROLE_CHANGE: 'Changement de rôle',
      DISCONNECT: 'Déconnexion',
    },
  },
  repair: {
    title: 'À réparer',
    empty: 'Aucun son en attente de réparation.',
    load: 'Chargement de la file…',
    truncated: 'Liste tronquée — affine les filtres du catalogue si besoin.',
    open: 'Ouvrir dans le catalogue',
    reasons: {
      error: 'Erreur',
      missing_video: 'Vidéo manquante',
      forgotten_lock: 'Lock oublié',
    },
  },
  spectator: {
    title: 'Spectateur',
    open: 'Ouvrir en spectateur',
    waiting: 'En attente de la manche…',
    noClip: 'Aucun extrait pour cette phase.',
    missingUrl: 'URL vidéo indisponible (VITE_R2_PUBLIC_URL manquant).',
    scores: 'Scores',
    closed: 'Salon introuvable (fermé ou terminé).',
    phase: {
      intro: 'Intro',
      ready: 'Prêt',
      guessing: 'Manche',
      reveal: 'Révélation',
    },
  },
} as const;

export const ADMIN_HTTP_ERROR: Record<number, string> = {
  401: 'Session expirée.',
  403: 'Accès refusé.',
  404: 'Ressource introuvable.',
  429: 'Trop de requêtes. Réessayez dans un instant.',
  500: 'Une erreur est survenue.',
  503: 'Service momentanément indisponible.',
};

/** Human-readable sanction length for the staff audit journal. */
export function formatStaffDuration(minutes: number | null): string {
  if (minutes === null) return '—';
  if (minutes >= 52_560_000) return 'Permanent';
  if (minutes % 1440 === 0) return `${minutes / 1440} j`;
  if (minutes % 60 === 0) return `${minutes / 60} h`;
  return `${minutes} min`;
}
