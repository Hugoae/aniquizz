export const GAME_COPY = {
  missingRoom: {
    title: 'Partie introuvable',
    body: 'Revenez au hub pour rejoindre un salon ou lancer une partie.',
    cta: 'Retour au hub',
  },
  loading: {
    status: 'Chargement de la partie',
    title: 'CHARGEMENT...',
    preparing: 'Préparation de la partie…',
    headphones: 'Préparez vos écouteurs...',
    go: 'GO!',
    cancel: 'Annuler la partie',
    leaveSalon: 'Quitter le salon',
  },
  results: {
    loading: 'Chargement des résultats…',
  },
  leaveMatch: {
    title: 'Quitter le match ?',
    returnLobbyLead: 'Retour au lobby',
    returnLobbyBody: "vous quittez l'écran de jeu mais restez dans le salon.",
    leaveSalonLead: 'Quitter le salon',
    leaveSalonBody: 'vous êtes retiré du salon.',
    cancel: 'Annuler',
    returnCta: 'Retour au lobby',
    leaveCta: 'Quitter le salon',
  },
  leaveSalon: {
    title: 'Quitter le salon ?',
    profile: 'Vous quitterez le salon pour accéder à votre profil.',
    confirmProfile: 'Quitter et voir mon profil',
    confirm: 'Quitter le salon',
    cancel: 'Annuler',
  },
  consequences: {
    solo: 'Le salon sera fermé et la partie annulée.',
    multi: 'La partie continuera pour les autres joueurs.',
  },
  toasts: {
    playlistInfo: 'Info Playlist',
    cancelledHost: "Partie annulée par l'hôte.",
    roomClosed: 'Salon fermé.',
    genericError: 'Erreur',
  },
  config: {
    varied: 'Varié',
    standard: 'Standard',
    me: 'Moi',
  },
  stage: {
    pauseEndOfRound: 'Pause en fin de round',
  },
} as const;

export function playerDisconnectedToast(name: string): string {
  return `${name} s'est déconnecté.`;
}

export function playerLeftMatchToast(name: string): string {
  return `${name} a quitté la partie.`;
}
