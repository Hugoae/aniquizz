/** French UI copy for the profile page (i18n-ready). */

export const PROFILE_COPY = {
  favoriteSongsTitle: 'Titres favoris',
  favoriteSongsEmptyOwn: 'Aucun titre favori pour le moment.',
  favoriteSongsEmptyOwnHint:
    'Likez des sons depuis la librairie ou à la révélation en fin de manche.',
  favoriteSongsEmptyPublic: (username: string) =>
    `${username} n'a pas encore de titres favoris.`,
  favoriteSongsCount: (n: number) =>
    n === 0 ? 'aucun favori' : n === 1 ? '1 favori' : `${n.toLocaleString('fr-FR')} favoris`,
  favoriteSongsShownTotal: (shown: number, total: number) =>
    `${shown.toLocaleString('fr-FR')} affiché${shown > 1 ? 's' : ''} · ${total.toLocaleString('fr-FR')} au total`,
  favoriteSongsViewAll: 'Voir tout',
  favoriteSongsBrowseLibrary: 'Explorer la librairie',
  favoriteSongsLoadError: 'Impossible de charger les titres favoris.',
  favoriteSongsOpenSong: (title: string) => `Voir les détails — ${title}`,
  favoriteSongsCustomize: 'Choisir mes favoris',
  favoriteSongsCuratedBadge: 'Sélection perso',
  customizeTitle: 'Mes 5 favoris du profil',
  customizeHint:
    'Choisissez jusqu\'à 5 titres parmi vos favoris à mettre en avant sur votre profil public.',
  customizeSelected: (n: number, max: number) => `${n}/${max} sélectionnés`,
  customizeSearch: 'Rechercher dans vos favoris…',
  customizeSave: 'Enregistrer',
  customizeReset: 'Tout afficher',
  customizeResetHint: 'Réaffiche vos favoris les plus récents sans sélection personnalisée.',
  customizeSavedToast: 'Favoris du profil mis à jour',
  customizeErrorToast: 'Impossible de mettre à jour vos favoris du profil.',
  customizeEmptyLikes: 'Likez des sons depuis la librairie pour pouvoir les sélectionner ici.',
  customizeMaxReached: (max: number) => `Vous ne pouvez sélectionner que ${max} titres maximum.`,
  customizeOrderTitle: 'Ordre sur le profil',
  customizeOrderHint: 'Utilisez les flèches pour définir l\'ordre d\'affichage (1 = en haut).',
  customizeNoneSelected: 'Aucun titre sélectionné — ajoutez-en depuis la liste ci-dessous.',
  customizeAddTitle: 'Ajouter depuis vos favoris',
  customizeBrowseTotal: (n: number) =>
    n === 1 ? '1 favori' : `${n.toLocaleString('fr-FR')} favoris`,
  customizeBrowseEmpty: 'Aucun favori à ajouter sur cette page.',
  customizePage: (page: number, total: number) => `Page ${page} / ${total}`,
  customizePrevPage: 'Précédent',
  customizeNextPage: 'Suivant',
  favoriteSongsPublicToggle: 'Favoris public',
  favoriteSongsPublicHidden: 'Masqué aux autres joueurs',
  favoriteSongsHiddenBadge: 'Masqué',
} as const;
