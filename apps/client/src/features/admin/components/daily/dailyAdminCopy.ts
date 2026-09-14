export const DAILY_ADMIN_COPY = {
  title: 'Quiz du jour',
  subtitle:
    'Les 14 prochains jours. Aujourd’hui reste modifiable tant que personne n’a joué ; ensuite on ne peut plus que retirer un extrait cassé.',
  refresh: 'Actualiser',
  today: 'Aujourd’hui',
  ready: 'Prêt',
  draft: 'Brouillon',
  cancelled: 'Annulé',
  attemptsNone: 'Aucune tentative',
  attemptsOne: '1 tentative',
  attemptsMany: (count: number) => `${count} tentatives`,
  markReady: 'Marquer comme prêt',
  regenerate: 'Régénérer le jour',
  regenerateConfirm: 'Remplacer les 5 sons de ce jour par une nouvelle pioche ?',
  confirm: 'Confirmer',
  cancel: 'Retour',
  changeSong: 'Changer le son',
  searchPlaceholder: 'Titre, artiste ou anime…',
  searchEmpty: 'Aucun OP/ED jouable pour cette recherche.',
  searchHint: 'Comme dans la bibliothèque.',
  searchCount: (count: number) => `${count} extraits`,
  shuffle: 'Tirer au hasard',
  reshuffleClip: 'Nouveau passage',
  clipStart: 'Départ',
  clipReshuffled: 'Nouveau passage tiré.',
  moveUp: 'Monter',
  moveDown: 'Descendre',
  void: 'Retirer la manche',
  voidTitle: 'Retirer cet extrait ?',
  voidBody:
    'La manche disparaît du quiz. Les scores déjà enregistrés sont recalculés sur les extraits restants. L’XP déjà versé ne change pas.',
  restore: 'Rétablir',
  voided: 'Manche retirée',
  preview: 'Écouter l’extrait',
  stopPreview: 'Arrêter',
  closePreview: 'Fermer l’aperçu',
  loadError: 'Chargement impossible.',
  saved: 'Playlist mise à jour.',
  liveHint: 'Des joueurs ont déjà commencé. Vous pouvez seulement retirer un extrait cassé.',
  qcm: 'Choix',
} as const;

const WARNING_FR: Record<string, string> = {
  round_count: 'Ce défi n’a pas exactement 5 manches.',
  duplicate_franchise: 'Deux manches partagent la même franchise.',
  missing_video: 'Un extrait n’a pas de vidéo.',
  placeholder_choice: 'Un QCM est tombé sur un choix placeholder.',
  recent_song: 'Un son est déjà sorti dans les 60 derniers jours.',
  recent_franchise: 'Une franchise est déjà sortie dans les 14 derniers jours.',
  difficulty_mix: 'Le mix de difficulté n’est pas 2 faciles / 2 moyens / 1 difficile.',
  type_mix: 'Le mix OP/ED ne correspond pas au numéro du jour.',
};

export function dailyAdminWarningLabel(code: string, fallback: string): string {
  return WARNING_FR[code] ?? fallback;
}
