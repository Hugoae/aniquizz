import type { LeaderboardEntry, LeaderboardMetric } from '@aniquizz/shared';
import { LEADERBOARD_DEFAULT_PAGE_SIZE } from '@aniquizz/shared';

export const LEADERBOARD_COPY = {
  title: 'Classement global',
  eyebrow: 'Toute la communauté',
  subtitle:
    'Les classements XP, victoires, nombre de parties, Pokédex musical et précision portent sur tous les modes et toutes les parties terminées.',
  back: "Retour à l'accueil",
  loadError: 'Impossible de charger le classement.',
  retry: 'Réessayer',
  emptyTitle: 'Aucun joueur classé pour le moment.',
  emptyHint: 'Terminez une partie pour apparaître ici.',
  rankedCount: 'Classés',
  playCta: 'Jouer',
  you: 'Vous',
  tied: 'Ex-aequo',
  moreTied: (count: number) => `+${count} ex-aequo`,
  loginToCompare: 'Connectez-vous pour voir votre rang.',
  loginToProfile: 'Connectez-vous pour ouvrir un profil.',
  viewProfileOf: (name: string) => `Voir le profil de ${name}`,
  backToBoard: 'Retour au classement',
  outsideTop: `Hors du top ${LEADERBOARD_DEFAULT_PAGE_SIZE}`,
  unranked: "Vous n'êtes pas encore classé sur cet onglet.",
  ineligible: (current: number, required: number) =>
    `Encore ${required - current} manche${required - current > 1 ? 's' : ''} pour entrer en précision (${current}/${required}).`,
  loadingAria: 'Chargement du classement',
  tabsAria: 'Critères de classement',
  level: (level: number) => `Niveau ${level}`,
  metrics: {
    xp: { label: 'XP', hint: 'Niveau et XP totale' },
    victories: { label: 'Victoires', hint: 'Parties gagnées' },
    games: { label: 'Parties', hint: 'Parties terminées' },
    discoveries: { label: 'Pokédex', hint: 'Sons uniques découverts' },
    accuracy: { label: 'Précision', hint: 'Taux de bonnes réponses' },
  } satisfies Record<LeaderboardMetric, { label: string; hint: string }>,
};

export const formatLeaderboardValue = (entry: LeaderboardEntry): string => {
  switch (entry.metric) {
    case 'xp':
      return `${entry.xp.toLocaleString('fr-FR')} XP`;
    case 'victories':
      return `${entry.gamesWon.toLocaleString('fr-FR')}`;
    case 'games':
      return `${entry.gamesPlayed.toLocaleString('fr-FR')}`;
    case 'discoveries':
      return `${entry.discoveries.toLocaleString('fr-FR')}`;
    case 'accuracy':
      return `${entry.accuracy.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
  }
};

export const formatLeaderboardDetail = (entry: LeaderboardEntry): string | null => {
  switch (entry.metric) {
    case 'victories':
      return `${entry.gamesPlayed.toLocaleString('fr-FR')} partie${entry.gamesPlayed > 1 ? 's' : ''} · ${entry.winRate} %`;
    case 'accuracy':
      return `${entry.correctGuesses.toLocaleString('fr-FR')} / ${entry.totalGuesses.toLocaleString('fr-FR')}`;
    default:
      return null;
  }
};

/** Spoken summary so a row is not read as a games ranking when the tab is victories. */
export const formatLeaderboardAnnouncement = (entry: LeaderboardEntry): string => {
  switch (entry.metric) {
    case 'victories': {
      const wins = `${entry.gamesWon.toLocaleString('fr-FR')} victoire${entry.gamesWon > 1 ? 's' : ''}`;
      const detail = formatLeaderboardDetail(entry);
      return detail ? `${wins}, ${detail}` : wins;
    }
    case 'games':
      return `${entry.gamesPlayed.toLocaleString('fr-FR')} partie${entry.gamesPlayed > 1 ? 's' : ''}`;
    case 'discoveries':
      return `${entry.discoveries.toLocaleString('fr-FR')} découverte${entry.discoveries > 1 ? 's' : ''}`;
    default: {
      const detail = formatLeaderboardDetail(entry);
      return detail ? `${formatLeaderboardValue(entry)}, ${detail}` : formatLeaderboardValue(entry);
    }
  }
};
