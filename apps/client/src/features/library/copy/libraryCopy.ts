/** French UI copy for the music library (i18n-ready). */

export const LIBRARY_COPY = {
  heroEyebrow: 'Catalogue complet',
  heroTitle: 'Librairie musicale',
  heroSubtitle:
    'Explorez openings, endings et inserts. Écoutez les extraits et retrouvez vos découvertes en partie.',
  searchPlaceholder: 'Rechercher un anime, un titre ou un artiste…',
  filterSectionSearch: 'Recherche',
  filterToggle: 'Filtres',
  filterToggleShow: 'Afficher les filtres',
  filterToggleHide: 'Masquer les filtres',
  filterActiveBadge: 'Filtres actifs',
  filterSectionTypes: 'Type de son',
  filterSectionDifficulty: 'Difficulté',
  filterSectionDiscovered: 'Mes découvertes',
  filterSectionSort: 'Ordre d\'affichage',
  filterSort: 'Tri',
  filterDiscovered: 'Découvertes',
  filterDiscoveredAll: 'Toutes',
  filterDiscoveredHeard: 'Déjà entendu',
  filterDiscoveredUnheard: 'Pas encore entendu',
  filterDiscoveredHeardShort: 'Entendu',
  filterDiscoveredUnheardShort: 'Nouveau',
  filterDiscoveredLoginHint: 'Connectez-vous pour filtrer vos découvertes',
  searchModeHint: 'Résultats par son — pagination sur les extraits correspondants',
  sortFranchise: 'Franchise (A-Z)',
  sortFranchiseDesc: 'Franchise (Z-A)',
  sortPopularity: 'Popularité',
  sortTitle: 'Titre du son',
  typeOp: 'Openings',
  typeEd: 'Endings',
  typeInsert: 'Inserts',
  diffEasy: 'Facile',
  diffMedium: 'Moyen',
  diffHard: 'Difficile',
  discoveredBadge: 'Déjà entendu',
  playPreview: 'Écouter l\'extrait',
  openAnilist: 'Voir sur AniList',
  playCta: 'Lancer une partie',
  playCtaHint: 'Entendez ce son en blindtest depuis le mode Standard.',
  resultsCount: (n: number) =>
    n === 0 ? 'Aucun résultat' : n === 1 ? '1 son trouvé' : `${n.toLocaleString('fr-FR')} sons trouvés`,
  emptyTitle: 'Aucun son ne correspond',
  emptyHint: 'Essayez un autre mot-clé ou élargissez les filtres.',
  loadError: 'Impossible de charger la librairie.',
  videoUnavailable: 'Lecture indisponible (CDN non configuré).',
  statSongs: 'sons jouables',
  statAnimes: 'animes',
  statFranchises: 'franchises',
  franchiseSongs: (songs: number, animes: number) =>
    `${songs.toLocaleString('fr-FR')} son${songs > 1 ? 's' : ''} · ${animes} anime${animes > 1 ? 's' : ''}`,
} as const;

export const LIBRARY_SONG_TYPE_OPTIONS = [
  { value: 'OP', label: LIBRARY_COPY.typeOp },
  { value: 'ED', label: LIBRARY_COPY.typeEd },
  { value: 'INSERT', label: LIBRARY_COPY.typeInsert },
] as const;

export const LIBRARY_SORT_OPTIONS = [
  { value: 'franchise', label: LIBRARY_COPY.sortFranchise },
  { value: 'franchise_desc', label: LIBRARY_COPY.sortFranchiseDesc },
  { value: 'popularity', label: LIBRARY_COPY.sortPopularity },
] as const;
