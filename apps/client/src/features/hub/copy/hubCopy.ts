export function soloRoomName(pseudo: string): string {
  return `Solo de ${pseudo}`;
}

export const HUB_COPY = {
  backHome: "Retour à l'accueil",
  back: 'Retour',
  modeTitleLead: 'Choisissez votre',
  modeTitleAccent: 'mode de jeu',
  modeSubtitle: 'Sélectionnez un mode pour configurer votre partie',
  modes: {
    solo: {
      title: 'Solo',
      description: 'Entraînez-vous seul et améliorez vos scores',
    },
    multiplayer: {
      title: 'Multijoueur',
      description: 'Affrontez vos amis ou des joueurs du monde entier',
    },
    competitive: {
      title: 'Compétitif',
      description: 'Mode classé avec rangs et saisons.',
      badge: 'Bientôt',
    },
  },
  joinTitleLead: 'Rejoindre un',
  joinTitleAccent: 'salon',
  createRoom: 'Créer un salon',
  join: 'Rejoindre',
  codePlaceholder: 'CODE...',
  reset: 'Réinitialiser',
  copied: 'Code copié dans le presse-papier !',
  configSection: 'Configuration',
  passwordDialog: {
    title: 'Salon privé',
    description: 'Entrez le mot de passe du salon',
    label: 'Mot de passe',
    cancel: 'Annuler',
    submit: 'Valider',
  },
  guest: 'Invité',
  player: 'Joueur',
  defaultRoomName: 'Salon de jeu',
  seo: {
    playDescription: 'Configurez votre partie solo ou multijoueur et lancez un blindtest anime.',
  },
  toasts: {
    settingsUpdated: 'Paramètres mis à jour.',
    youAreHost: "Vous êtes l'hôte !",
    missingRoom: 'Impossible de mettre à jour ce salon. Revenez au lobby.',
    genericError: 'Erreur',
    roomClosed: 'Salon fermé.',
    poolNowSufficient:
      "Plus besoin de compléter avec l'aléatoire — le pool AniList est maintenant suffisant.",
  },
  room: {
    full: 'COMPLET',
    inProgress: 'EN COURS',
    join: 'REJOINDRE',
  },
  configTitle: {
    solo: { lead: 'Partie', accent: 'solo' },
    editSolo: { lead: 'Paramètres de la', accent: 'partie' },
    editRoom: { lead: 'Paramètres du', accent: 'salon' },
    create: { lead: 'Créer un', accent: 'salon' },
  },
} as const;

export function multiplayerTeaser(count: number): string {
  return `${count} joueur${count > 1 ? 's' : ''} en multijoueur`;
}
