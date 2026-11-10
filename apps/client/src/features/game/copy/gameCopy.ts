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
  stageFeedback: {
    correct: 'Trouvé !',
    missed: 'Raté',
    wrong: 'Faux !',
    announce: {
      correct: 'Bonne réponse',
      wrong: 'Mauvaise réponse, moins 3 secondes',
      wrongPlain: 'Mauvaise réponse',
      skip: 'Titre passé, moins 5 secondes',
      skipPlain: 'Titre passé',
      missed: 'Temps du clip écoulé, titre raté',
      bonus: (seconds: number) => `Série réussie, plus ${seconds} secondes`,
    },
  },
  recentTitles: {
    heading: 'Derniers titres',
    empty: 'Les titres joués apparaîtront ici.',
    outcome: {
      found: 'Trouvé',
      missed: 'Raté',
      skipped: 'Passé',
    },
    bonus: (seconds: number) => `+${seconds} s`,
    bonusSpoken: (seconds: number) => `plus ${seconds} secondes`,
  },
  timeAttack: {
    clockAria: (clock: string) => `Temps restant de la partie : ${clock}`,
    found: (n: number) => `${n} trouvé${n === 1 ? '' : 's'}`,
    nextMedal: (needed: number, tier: 'bronze' | 'silver' | 'gold' | 'platinum') =>
      `Encore ${needed} pour ${{ bronze: 'le bronze', silver: "l'argent", gold: "l'or", platinum: 'le platine' }[tier]}`,
    topMedal: 'Médaille maximale',
  },
  soloMedals: {
    rail: 'Médailles de la partie',
    atFound: (target: number, label: string) =>
      target === 1 ? `${label} à 1 titre` : `${label} à ${target} titres`,
    atPoints: (target: number, label: string) =>
      target === 1 ? `${label} à 1 point` : `${label} à ${target} points`,
    earned: (label: string) => `${label} débloquée`,
  },
  race: {
    boardTitle: 'Course',
    boardAria: 'Classement en direct de la course',
    you: 'Toi',
    finished: 'Terminé',
    titles: (n: number) => `${n} titre${n === 1 ? '' : 's'}`,
    seeRanking: (hidden: number) => `+${hidden} autre${hidden > 1 ? 's' : ''} — voir le classement`,
    laneDoneNow: "Tu es pour l'instant",
    laneDoneWaiting: 'En attente des autres joueurs…',
    tieBreak: 'Égalité : moins de titres écoutés. Le même ratio partage la place.',
  },
} as const;

export function playerDisconnectedToast(name: string): string {
  return `${name} s'est déconnecté.`;
}

export function playerLeftMatchToast(name: string): string {
  return `${name} a quitté la partie.`;
}
