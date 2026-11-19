import type {
  SuggestionCategory,
  SuggestionCorrectionField,
  SuggestionStatus,
} from '@aniquizz/shared';
import { pick } from '@/lib/i18n/text';

export const SUGGESTION_CATEGORY_LABELS: Record<SuggestionCategory, string> = {
  get IMPROVEMENT() {
    return pick('Amélioration', 'Improvement');
  },
  get SONG_REQUEST() {
    return pick('Son souhaité', 'Song request');
  },
  get CORRECTION() {
    return pick('Correction', 'Correction');
  },
  get OTHER() {
    return pick('Autre', 'Other');
  },
};

export const SUGGESTION_STATUS_LABELS: Record<SuggestionStatus, string> = {
  get OPEN() {
    return pick('En cours', 'Open');
  },
  get PLANNED() {
    return pick('Prévue', 'Planned');
  },
  get DONE() {
    return pick('Réalisée', 'Done');
  },
  get REJECTED() {
    return pick('Refusée', 'Rejected');
  },
};

export const SUGGESTION_CORRECTION_LABELS: Record<SuggestionCorrectionField, string> = {
  get TITLE() {
    return pick('Titre', 'Title');
  },
  get ARTIST() {
    return pick('Artiste', 'Artist');
  },
  get DIFFICULTY() {
    return pick('Difficulté', 'Difficulty');
  },
  get OTHER() {
    return pick('Autre donnée', 'Other data');
  },
};

export const SUGGESTIONS_COPY = {
  get title() {
    return pick('Avis & bugs', 'Feedback & bugs');
  },
  get subtitle() {
    return pick(
      'Un avis, un bug, un son manquant ou une idée pour AniQuizz.',
      'Feedback, a bug, a missing song, or an idea for AniQuizz.',
    );
  },
  get create() {
    return pick('Proposer une idée', 'Suggest an idea');
  },
  get duplicateHint() {
    return pick(
      'Avant de publier, recherchez quelques mots-clés sur le board pour vérifier que l’idée n’existe pas déjà.',
      'Before you post, search a few keywords on the board to check the idea is not already there.',
    );
  },
  get postingLimit() {
    return pick(
      'Maximum 5 suggestions par période glissante de 24 heures.',
      'At most 5 suggestions per rolling 24 hours.',
    );
  },
  get top() {
    return pick('Les plus soutenues', 'Most supported');
  },
  get recent() {
    return pick('Les plus récentes', 'Most recent');
  },
  get allCategories() {
    return pick('Toutes les catégories', 'All categories');
  },
  get allStatuses() {
    return pick('Tous les statuts', 'All statuses');
  },
  get empty() {
    return pick('Aucune suggestion ici pour le moment.', 'No suggestion here yet.');
  },
  get emptyAction() {
    return pick('Lancez la première idée.', 'Post the first idea.');
  },
  get teamReply() {
    return pick('Réponse de l’équipe', 'Team reply');
  },
  get vote() {
    return pick('Soutenir cette suggestion', 'Support this suggestion');
  },
  get unvote() {
    return pick('Retirer mon soutien', 'Remove my support');
  },
  get loginToVote() {
    return pick('Connectez-vous pour soutenir une idée.', 'Sign in to support an idea.');
  },
  get createSuccess() {
    return pick('Suggestion publiée.', 'Suggestion posted.');
  },
  get voteError() {
    return pick('Impossible de mettre à jour votre vote.', 'Could not update your vote.');
  },
  get loadError() {
    return pick('Impossible de charger les suggestions.', 'Could not load the suggestions.');
  },
  get delete() {
    return pick('Supprimer', 'Delete');
  },
  get deleteSuccess() {
    return pick('Suggestion supprimée.', 'Suggestion deleted.');
  },
  get deleteError() {
    return pick('Suppression impossible.', 'Could not delete it.');
  },
  get deleteConfirm() {
    return pick(
      'Supprimer définitivement cette suggestion ?',
      'Delete this suggestion permanently?',
    );
  },
  get backHome() {
    return pick('Retour à l’accueil', 'Back to home');
  },
  get searchPlaceholder() {
    return pick('Rechercher une idée, un son, un anime…', 'Search an idea, a song, an anime…');
  },
  get searchAria() {
    return pick('Rechercher dans les suggestions', 'Search suggestions');
  },
  get clearSearchAria() {
    return pick('Effacer la recherche', 'Clear the search');
  },
  get filterCategoryAria() {
    return pick('Filtrer par catégorie', 'Filter by category');
  },
  get filterStatusAria() {
    return pick('Filtrer par statut', 'Filter by status');
  },
  get previousPage() {
    return pick('Précédent', 'Previous');
  },
  get nextPage() {
    return pick('Suivant', 'Next');
  },
  get loadingAria() {
    return pick('Chargement', 'Loading');
  },
  get votes() {
    return pick('votes', 'votes');
  },
  get readMore() {
    return pick('Lire la suite', 'Read more');
  },
  get readLess() {
    return pick('Réduire', 'Show less');
  },
  get anonymousAuthor() {
    return pick('Compte supprimé', 'Deleted account');
  },
  pageStatus: (page: number, total: number) =>
    pick(`Page ${page} sur ${total}`, `Page ${page} of ${total}`),
  get createTitle() {
    return pick('Proposer une idée', 'Suggest an idea');
  },
  get createDescription() {
    return pick(
      'Une idée claire et précise a plus de chances d’être soutenue.',
      'A clear, specific idea is more likely to be supported.',
    );
  },
  get categoryLegend() {
    return pick('Catégorie', 'Category');
  },
  get titleLabel() {
    return pick('Titre', 'Title');
  },
  get titlePlaceholder() {
    return pick('Résumez votre idée en une phrase', 'Sum up your idea in one sentence');
  },
  get bodyLabel() {
    return pick('Détails', 'Details');
  },
  get bodyPlaceholder() {
    return pick(
      'Expliquez le problème, votre idée ou le son que vous aimeriez retrouver…',
      'Explain the problem, your idea, or the song you would like to see…',
    );
  },
  get songLabel() {
    return pick('Son concerné', 'Song');
  },
  get changeSong() {
    return pick('Changer', 'Change');
  },
  get songSearchPlaceholder() {
    return pick('Rechercher un titre ou un anime…', 'Search a title or an anime…');
  },
  get songSearchAria() {
    return pick('Rechercher un son du catalogue', 'Search a song in the catalogue');
  },
  get songListAria() {
    return pick('Résultats de recherche de sons', 'Song search results');
  },
  get searching() {
    return pick('Recherche…', 'Searching…');
  },
  noSongs: (query: string) =>
    pick(`Aucun son trouvé pour « ${query} ».`, `No song found for “${query}”.`),
  get loadMoreSongs() {
    return pick('Afficher plus', 'Show more');
  },
  get songSearchError() {
    return pick('Impossible de rechercher le catalogue.', 'Could not search the catalogue.');
  },
  get correctionFieldLabel() {
    return pick('Champ à corriger', 'Field to correct');
  },
  get proposedValueLabel() {
    return pick('Valeur proposée', 'Proposed value');
  },
  get chooseDifficulty() {
    return pick('Choisir une difficulté', 'Choose a difficulty');
  },
  get proposedPlaceholder() {
    return pick('Nouvelle valeur', 'New value');
  },
  get cancel() {
    return pick('Annuler', 'Cancel');
  },
  get publish() {
    return pick('Publier', 'Post');
  },
  get readyToPublish() {
    return pick('Prêt à publier.', 'Ready to post.');
  },
  get createError() {
    return pick('Impossible de publier cette suggestion.', 'Could not post this suggestion.');
  },
  get titleTooShort() {
    return pick(
      'Le titre doit contenir au moins 4 caractères.',
      'The title must be at least 4 characters.',
    );
  },
  get bodyTooShort() {
    return pick(
      'Les détails doivent contenir au moins 10 caractères.',
      'The details must be at least 10 characters.',
    );
  },
  get songRequired() {
    return pick('Sélectionnez le son concerné.', 'Select the song.');
  },
  get proposedRequired() {
    return pick(
      'Choisissez ou saisissez la valeur proposée.',
      'Choose or type the proposed value.',
    );
  },
  adminTitle: 'Suggestions',
  adminSubtitle: 'Triez les retours, publiez une réponse officielle et suivez leur avancement.',
  adminRefresh: 'Actualiser',
  adminStatus: 'Statut',
  adminReplyLabel: 'Réponse de l’équipe',
  adminReplyPlaceholder: 'Réponse publique facultative…',
  adminSave: 'Enregistrer',
  adminDeleteAria: 'Supprimer la suggestion',
  adminEmpty: 'Aucune suggestion pour ces filtres.',
  adminDeleteConfirm: 'Supprimer définitivement cette suggestion et ses votes ?',
  adminUpdateSuccess: 'Suggestion mise à jour.',
  adminUpdateError: 'Mise à jour impossible.',
  adminDeleteSuccess: 'Suggestion supprimée.',
  adminDeleteError: 'Suppression impossible.',
  adminLoadError: 'Chargement des suggestions impossible.',
};
